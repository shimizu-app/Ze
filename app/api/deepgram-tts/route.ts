import { auraSpeak } from "@/lib/deepgram-tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/deepgram-tts
 * Body: { text, model? }
 * Returns raw audio bytes (mp3 by default) that the client can
 * decode via Web Audio and play back. Short texts only — the
 * pipeline calls this once per sentence.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = (body.text as string | undefined)?.trim();
  const model = (body.model as string | undefined) || undefined;

  if (!text) {
    return new Response(JSON.stringify({ error: "text required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { audio, contentType } = await auraSpeak(text, { model });
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[deepgram-tts]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
