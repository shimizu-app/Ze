/**
 * Server-side helper that requests an audio blob from Deepgram's
 * speak.rest endpoint. Called from /api/deepgram-tts which in turn
 * is called from the meet room when the avatar_pipeline is set to
 * deepgram_tts.
 *
 * Aura 2 has a very short time-to-first-audio (~50ms) and uses a
 * conversational voice set. As of late 2025 Aura 2 supports
 * Japanese voices (e.g. aura-2-japanese-*). We pass the model name
 * through from the caller and fall back to aura-2-asteria-en if the
 * Japanese model isn't available on the account.
 */

const API_BASE = "https://api.deepgram.com/v1/speak";

function apiKey() {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY is not set");
  return key;
}

export interface AuraOptions {
  /** Deepgram Aura voice model id, e.g. "aura-2-sakura-ja" or "aura-asteria-en". */
  model?: string;
  /** Output encoding — mp3 is the simplest for the browser to play back. */
  encoding?: "mp3" | "linear16" | "opus";
  sample_rate?: number;
}

/**
 * POST text to Deepgram and return the raw audio bytes. Caller is
 * responsible for setting the right Content-Type header on the
 * outer HTTP response.
 */
export async function auraSpeak(
  text: string,
  opts: AuraOptions = {}
): Promise<{ audio: ArrayBuffer; contentType: string }> {
  const model = opts.model || process.env.DEEPGRAM_TTS_MODEL || "aura-2-sakura-ja";
  const encoding = opts.encoding || "mp3";

  const url = new URL(API_BASE);
  url.searchParams.set("model", model);
  if (encoding === "mp3") {
    url.searchParams.set("encoding", "mp3");
  } else {
    url.searchParams.set("encoding", encoding);
    if (opts.sample_rate) url.searchParams.set("sample_rate", String(opts.sample_rate));
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Deepgram TTS ${res.status}: ${msg.slice(0, 200)}`);
  }

  const audio = await res.arrayBuffer();
  const contentType =
    res.headers.get("Content-Type") || (encoding === "mp3" ? "audio/mpeg" : "audio/wav");
  return { audio, contentType };
}
