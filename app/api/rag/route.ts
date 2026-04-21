import { NextResponse } from "next/server";
import {
  loadMeetingContext,
  retrieveDocs,
  type TurnMessage,
} from "@/lib/rag";
import { classifyWithPhase, detectPhase } from "@/lib/classify";
import { buildSystemPrompt, buildUserMessage } from "@/lib/prompts";
import { callLLM } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_UTTERANCE = "申し訳ありません、もう一度お願いできますか？";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const roomId = body.room_id as string | undefined;
  const userText = (body.user_text as string | undefined)?.trim();
  const history = (body.history as TurnMessage[] | undefined) ?? [];
  const stream = body.stream !== false; // default: stream
  const prefetchedEmbedding = Array.isArray(body.prefetched_embedding)
    ? (body.prefetched_embedding as number[])
    : undefined;

  // Phase 10 inputs (all optional).
  const turnCount =
    typeof body.turn_count === "number" && Number.isFinite(body.turn_count)
      ? body.turn_count
      : history.length;
  const scriptLines = Array.isArray(body.script_lines)
    ? (body.script_lines as string[])
    : [];
  const scriptLinesRemaining =
    typeof body.script_lines_remaining === "number" && body.script_lines_remaining >= 0
      ? body.script_lines_remaining
      : scriptLines.length;

  if (!roomId || !userText) {
    return NextResponse.json({ error: "room_id and user_text required" }, { status: 400 });
  }

  const loaded = await loadMeetingContext(roomId);
  if (!loaded) return NextResponse.json({ error: "meeting not found" }, { status: 404 });

  // Phase 10+: phase detection drives everything downstream.
  const recentUserText = history
    .filter((t) => t.role === "user")
    .slice(-3)
    .map((t) => t.text)
    .concat(userText)
    .join(" ");
  const phase = detectPhase({
    turnCount,
    scriptLinesRemaining,
    recentUserText,
  });
  const { intent, maxTokens } = classifyWithPhase(userText, phase);

  // Non-streaming fallback — kept for callers that still hit POST with
  // stream:false (internal tools, health checks).
  if (!stream) {
    if (intent === "script") {
      const scriptIndex = Math.max(0, scriptLines.length - scriptLinesRemaining);
      const text = scriptLines[scriptIndex] ?? "";
      return NextResponse.json({
        text,
        meeting_id: loaded.meeting.id,
        intent,
        phase,
        max_tokens: maxTokens,
      });
    }

    const { docs } = await retrieveDocs(userText, loaded.context.accountId);
    const system = buildSystemPrompt({ context: loaded.context, phase, retrieved: docs });
    const user = buildUserMessage({ userText, history });
    let out = "";
    try {
      for await (const chunk of callLLM(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        { maxTokens }
      )) {
        out += chunk;
      }
    } catch (err) {
      console.error("[rag] non-stream both providers failed", err);
      out = FALLBACK_UTTERANCE;
    }
    return NextResponse.json({
      text: out.trim() || FALLBACK_UTTERANCE,
      meeting_id: loaded.meeting.id,
      intent,
      phase,
      max_tokens: maxTokens,
    });
  }

  // Server-Sent Events: one JSON object per frame, blank-line terminated.
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      function send(obj: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      }

      try {
        send({
          type: "meta",
          meeting_id: loaded.meeting.id,
          intent,
          phase,
          max_tokens: maxTokens,
        });

        if (intent === "script") {
          // Opening phase — play the next scripted line. Zero LLM.
          const scriptIndex = Math.max(0, scriptLines.length - scriptLinesRemaining);
          const line = scriptLines[scriptIndex];
          if (line && line.trim()) {
            send({ type: "chunk", text: line });
            send({ type: "done" });
            return;
          }
          // Script ran out unexpectedly → fall through to unified.
        }

        // Unified path: RAG retrieval → system+user messages → callLLM.
        const { docs } = await retrieveDocs(
          userText,
          loaded.context.accountId,
          3,
          prefetchedEmbedding
        );
        const systemPrompt = buildSystemPrompt({
          context: loaded.context,
          phase,
          retrieved: docs,
        });
        const userPrompt = buildUserMessage({ userText, history });

        let emitted = 0;
        try {
          for await (const chunk of callLLM(
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            { maxTokens }
          )) {
            if (chunk) {
              send({ type: "chunk", text: chunk });
              emitted += chunk.length;
            }
          }
        } catch (err) {
          console.error("[rag sse] both providers failed", err);
          // Only emit the fallback utterance if we haven't already sent
          // any real chunks — otherwise we'd append gibberish after a
          // partial response.
          if (emitted === 0) {
            send({ type: "chunk", text: FALLBACK_UTTERANCE });
          }
        }

        send({ type: "done" });
      } catch (err) {
        console.error("[rag sse] failed", err);
        send({
          type: "error",
          message: err instanceof Error ? err.message : "unknown",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
