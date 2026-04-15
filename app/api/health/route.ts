import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { geminiGenerate, geminiEmbed } from "@/lib/gemini";
import { listHeyGenAvatars } from "@/lib/heygen";
import { listLiveAvatars, createLiveAvatarSessionToken } from "@/lib/liveavatar";
import { groqChat } from "@/lib/groq";
import { auraSpeak } from "@/lib/deepgram-tts";
import { classifyIntent } from "@/lib/classify";

export const dynamic = "force-dynamic";

/**
 * Marker bumped every time Phase changes. Makes it trivial to tell
 * from /api/health whether a given Vercel deploy actually contains
 * the latest code. If this doesn't say "phase9" in the response, the
 * deployment is stale.
 */
const PHASE_MARKER = "phase9-latency-optimization";

function prefix(val: string | undefined, n: number) {
  if (!val) return null;
  return `${val.slice(0, n)}... (len=${val.length})`;
}

async function safeCheck<T>(fn: () => Promise<T>): Promise<{ ok: boolean; result?: T; error?: string }> {
  try {
    const result = await fn();
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

/**
 * Diagnostic endpoint — shows env presence + actually pings each
 * upstream service so we can tell whether the keys are valid, not
 * just present.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // --- Supabase anon ping
  let anonCheck: { ok: boolean; error?: string } = { ok: false };
  if (url && anon) {
    try {
      const supabase = createClient(url, anon);
      const { error } = await supabase.auth.getUser();
      anonCheck = error ? { ok: false, error: error.message } : { ok: true };
    } catch (err) {
      anonCheck = { ok: false, error: err instanceof Error ? err.message : "unknown" };
    }
  }

  // --- Supabase service ping
  let serviceCheck: { ok: boolean; error?: string } = { ok: false };
  if (url && service) {
    try {
      const supabase = createClient(url, service, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await supabase.from("accounts").select("id").limit(1);
      serviceCheck = error ? { ok: false, error: error.message } : { ok: true };
    } catch (err) {
      serviceCheck = { ok: false, error: err instanceof Error ? err.message : "unknown" };
    }
  }

  // --- Phase 9 specific: new service pings
  const groqCheck = await safeCheck(async () => {
    const out = await groqChat(
      [
        { role: "system", content: "返答は一言で。" },
        { role: "user", content: "テスト" },
      ],
      { max_tokens: 32 }
    );
    return out.slice(0, 40);
  });

  const deepgramTtsCheck = await safeCheck(async () => {
    const { audio, contentType } = await auraSpeak("テスト", {
      model: process.env.DEEPGRAM_TTS_MODEL || "aura-2-sakura-ja",
    });
    return `bytes=${audio.byteLength}, ct=${contentType}`;
  });

  const classifyTests = [
    { text: "はい", expected: "light" },
    { text: "料金はいくらですか？", expected: "heavy" },
    { text: "ちょっと教えてください", expected: "light" },
    { text: "セキュリティはどうなってますか？", expected: "heavy" },
  ].map((t) => ({
    input: t.text,
    expected: t.expected,
    got: classifyIntent(t.text),
    pass: classifyIntent(t.text) === t.expected,
  }));

  // --- Gemini text generation ping
  const geminiTextCheck = await safeCheck(async () => {
    const res = await geminiGenerate("テスト");
    return res.slice(0, 30);
  });

  // --- Gemini embedding ping
  const geminiEmbedCheck = await safeCheck(async () => {
    const v = await geminiEmbed("テスト");
    return `len=${v.length}`;
  });

  // --- HeyGen avatar list (with LiveAvatar fallback)
  const heyGenListCheck = await safeCheck(async () => {
    const list = await listHeyGenAvatars();
    return `count=${list.length}, first=${list[0]?.avatar_id ?? "none"}`;
  });

  // --- Direct LiveAvatar list
  const liveAvatarListCheck = await safeCheck(async () => {
    const list = await listLiveAvatars();
    return `count=${list.length}, first=${list[0]?.id ?? "none"}`;
  });

  // --- LiveAvatar session token (using first avatar from list)
  const liveAvatarTokenCheck = await safeCheck(async () => {
    const list = await listLiveAvatars();
    if (list.length === 0) throw new Error("no avatars to test with");
    const tok = await createLiveAvatarSessionToken({
      avatar_id: list[0].id,
      voice_id: list[0].default_voice_id ?? undefined,
      language: "ja",
    });
    return `session_id=${tok.session_id.slice(0, 8)}...`;
  });

  return NextResponse.json({
    ok: true,
    phase: PHASE_MARKER,
    ts: new Date().toISOString(),
    env: {
      supabase_url: url ?? null,
      supabase_anon_prefix: prefix(anon, 30),
      supabase_service_prefix: prefix(service, 30),
      gemini_prefix: prefix(process.env.GEMINI_API_KEY, 10),
      heygen_prefix: prefix(process.env.HEYGEN_API_KEY, 10),
      liveavatar_prefix: prefix(process.env.LIVEAVATAR_API_KEY, 10),
      deepgram_prefix: prefix(process.env.DEEPGRAM_API_KEY, 10),
      groq_prefix: prefix(process.env.GROQ_API_KEY, 10),
      deepgram_tts_model: process.env.DEEPGRAM_TTS_MODEL || "aura-2-sakura-ja (default)",
    },
    checks: {
      supabase_anon_auth: anonCheck,
      supabase_service_select: serviceCheck,
      gemini_text: geminiTextCheck,
      gemini_embed: geminiEmbedCheck,
      groq_chat: groqCheck,
      deepgram_tts: deepgramTtsCheck,
      intent_classifier: classifyTests,
      heygen_list: heyGenListCheck,
      liveavatar_list: liveAvatarListCheck,
      liveavatar_token: liveAvatarTokenCheck,
    },
  });
}
