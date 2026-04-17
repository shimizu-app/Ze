import { NextResponse } from "next/server";
import {
  generateAvatarResponse,
  generateAvatarResponseStream,
  loadMeetingContext,
  type TurnMessage,
  type RagContext,
} from "@/lib/rag";
import {
  classifyIntent,
  classifyWithPhase,
  detectPhase,
  type ConversationPhase,
} from "@/lib/classify";
import { groqChatStream } from "@/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const roomId = body.room_id as string | undefined;
  const userText = (body.user_text as string | undefined)?.trim();
  const history = (body.history as TurnMessage[] | undefined) ?? [];
  const stream = body.stream !== false; // default: stream
  const prefetchedEmbedding = Array.isArray(body.prefetched_embedding)
    ? (body.prefetched_embedding as number[])
    : undefined;

  // Phase 10 inputs (all optional — defaults reproduce Phase 9 behaviour
  // for callers that haven't migrated yet).
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

  // Phase 10: figure out where in the conversation we are.
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
  const routing = classifyWithPhase(userText, phase);
  const intent = routing.intent;
  const maxTokens = routing.maxTokens;

  // Non-streaming fallback.
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
    const text = await generateAvatarResponse({
      userText,
      history,
      context: loaded.context,
    });
    return NextResponse.json({
      text,
      meeting_id: loaded.meeting.id,
      intent,
      phase,
      max_tokens: maxTokens,
    });
  }

  // Server-Sent Events: one JSON object per line prefixed with "data: ".
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
          // Opening phase — read the next scripted line straight back.
          // Zero LLM cost, zero time-to-first-token.
          const scriptIndex = Math.max(0, scriptLines.length - scriptLinesRemaining);
          const line = scriptLines[scriptIndex];
          if (line && line.trim()) {
            send({ type: "chunk", text: line });
          } else {
            // Script ran out unexpectedly → fall through to a tiny
            // discovery-style heavy reply so the meeting doesn't dead-end.
            for await (const chunk of generateAvatarResponseStream({
              userText,
              history,
              context: loaded.context,
              prefetchedEmbedding,
              maxOutputTokens: 80,
            })) {
              send({ type: "chunk", text: chunk });
            }
          }
        } else if (intent === "light") {
          // Light route → Groq llama-3.3-70b. No RAG retrieval — keep
          // the prompt tiny so the model responds in <100ms.
          for await (const chunk of streamLightResponse({
            userText,
            history,
            context: loaded.context,
            phase,
            maxTokens,
          })) {
            send({ type: "chunk", text: chunk });
          }
        } else {
          // Heavy route → Gemini with full RAG and the per-phase token cap.
          for await (const chunk of generateAvatarResponseStream({
            userText,
            history,
            context: loaded.context,
            prefetchedEmbedding,
            maxOutputTokens: maxTokens,
          })) {
            send({ type: "chunk", text: chunk });
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

/**
 * "Light" branch — short acknowledgement / bridging reply via Groq
 * llama-3.3-70b. Honours the per-phase token cap so discovery
 * acknowledgements stay snappy.
 */
async function* streamLightResponse({
  userText,
  history,
  context,
  phase,
  maxTokens,
}: {
  userText: string;
  history: TurnMessage[];
  context: RagContext;
  phase: ConversationPhase;
  maxTokens: number;
}): AsyncGenerator<string> {
  const avatarName = context.avatar?.name ?? "営業担当";
  const goal = context.avatar?.goal ?? "自然な商談";

  const charCap = Math.max(20, Math.round(maxTokens * 0.7));
  const system = `あなたは${avatarName}というAI営業アバターです。
会話のゴール: ${goal}
現在のフェーズ: ${phase}
返答は1〜2文以内、${charCap}文字以内。自然で親しみやすい日本語。
前置き禁止、絵文字禁止。`;

  const historyLines = history
    .slice(-4)
    .map((t) => `${t.role === "user" ? "相手" : "あなた"}: ${t.text}`)
    .join("\n");

  const userMessage = `# これまでの会話
${historyLines || "(まだありません)"}

# 相手の最新発言
${userText}

短く自然に返答してください。`;

  try {
    for await (const chunk of groqChatStream(
      [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
      { temperature: 0.7, max_tokens: maxTokens }
    )) {
      yield chunk;
    }
  } catch (err) {
    console.error("[rag light] groq stream failed, falling back", err);
    // Fall back to Gemini if Groq fails.
    for await (const chunk of generateAvatarResponseStream({
      userText,
      history,
      context,
      maxOutputTokens: maxTokens,
    })) {
      yield chunk;
    }
  }
}

// classifyIntent stays available via lib/classify.ts for any caller
// that still wants the message-only classification (Next.js 14 route
// files can only export the HTTP handlers + dynamic / runtime, so we
// can't re-export it here even though it's used internally).
void classifyIntent;
