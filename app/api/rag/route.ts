import { NextResponse } from "next/server";
import {
  generateAvatarResponse,
  generateAvatarResponseStream,
  loadMeetingContext,
  type TurnMessage,
  type RagContext,
} from "@/lib/rag";
import { classifyIntent } from "@/lib/classify";
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

  if (!roomId || !userText) {
    return NextResponse.json({ error: "room_id and user_text required" }, { status: 400 });
  }

  const loaded = await loadMeetingContext(roomId);
  if (!loaded) return NextResponse.json({ error: "meeting not found" }, { status: 404 });

  const intent = classifyIntent(userText);

  // Non-streaming fallback (kept for compatibility).
  if (!stream) {
    const text = await generateAvatarResponse({
      userText,
      history,
      context: loaded.context,
    });
    return NextResponse.json({ text, meeting_id: loaded.meeting.id, intent });
  }

  // Server-Sent Events: one JSON object per line prefixed with "data: ".
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      function send(obj: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      }

      try {
        send({ type: "meta", meeting_id: loaded.meeting.id, intent });

        if (intent === "light") {
          // Light route → Groq llama-3.3-70b. No RAG retrieval — keep
          // the prompt tiny so the model responds in <100ms.
          for await (const chunk of streamLightResponse({
            userText,
            history,
            context: loaded.context,
          })) {
            send({ type: "chunk", text: chunk });
          }
        } else {
          // Heavy route → Gemini with full RAG.
          for await (const chunk of generateAvatarResponseStream({
            userText,
            history,
            context: loaded.context,
            prefetchedEmbedding,
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
 * llama-3.3-70b. We still include the avatar's name and goal so the
 * reply stays on-brand, but skip RAG retrieval and skip the learning
 * block to keep latency well under 100ms.
 */
async function* streamLightResponse({
  userText,
  history,
  context,
}: {
  userText: string;
  history: TurnMessage[];
  context: RagContext;
}): AsyncGenerator<string> {
  const avatarName = context.avatar?.name ?? "営業担当";
  const goal = context.avatar?.goal ?? "自然な商談";

  const system = `あなたは${avatarName}というAI営業アバターです。
会話のゴール: ${goal}
返答は2文以内、60文字以内。自然で親しみやすい日本語。前置き禁止、絵文字禁止。`;

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
      { temperature: 0.7, max_tokens: 128 }
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
    })) {
      yield chunk;
    }
  }
}
