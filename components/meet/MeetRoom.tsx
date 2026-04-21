"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeyGenAvatar } from "./useHeyGenAvatar";
import { useLiveAvatar } from "./useLiveAvatar";
import { useBrowserTTS } from "./useBrowserTTS";
import { useDeepgramTTS } from "./useDeepgramTTS";
import { useDeepgramSTT } from "./useDeepgramSTT";
import { useConversationTurns } from "./useConversationTurns";
import { VideoPanel } from "./VideoPanel";
import { SubtitleOverlay } from "./SubtitleOverlay";
import { ControlBar } from "./ControlBar";
import { ChatHistory } from "./ChatHistory";
import { pickFiller, pickFillerBucket } from "./fillers";
import { useSimli } from "./useSimli";
import { detectPhase } from "@/lib/classify";

interface LobbyAvatar {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface LobbyVoice {
  id: string;
  name: string;
  quality: number;
}

const AVATAR_AVOID = /santa|xmas|christmas|halloween|pumpkin|witch|zombie|dragon|monster|alien|costume|mascot|cartoon|anime|portrait/i;
const AVATAR_PREFER = /suit|business|professional|office|corporate|formal|executive|sales|manager|presenter|host|hr|lawyer|doctor|therapist|expert/i;

// Feature flag: when not overridden, drive the meet room with the
// @heygen/liveavatar-web-sdk pipeline. Set NEXT_PUBLIC_USE_LIVEAVATAR
// =false on Vercel to fall back to the old streaming SDK for testing.
const USE_LIVEAVATAR = process.env.NEXT_PUBLIC_USE_LIVEAVATAR !== "false";

interface Props {
  meetingId: string;
  roomId: string;
  companyName: string;
  contactName: string | null;
  avatarName: string;
  heygenAvatarId: string;
  voiceId?: string;
  greeting: string;
  initialHostPaused: boolean;
  avatarPipeline?: "liveavatar" | "browser_tts" | "deepgram_tts" | "simli";
  /**
   * Phase 10: scripted opening lines. While there are still lines
   * unspoken, /api/rag returns the next one without calling any LLM
   * (intent === "script", 0ms latency).
   */
  scriptLines?: string[];
}

export function MeetRoom({
  meetingId,
  roomId,
  companyName,
  contactName,
  avatarName,
  heygenAvatarId,
  voiceId,
  greeting,
  initialHostPaused,
  avatarPipeline = "liveavatar",
  scriptLines = [],
}: Props) {
  const pipeline = avatarPipeline;

  // Phase 10: track how many opening script lines remain. Each "script"
  // intent response consumes one line. When 0, the router naturally
  // transitions to discovery / pitch / objection / closing phases.
  const [scriptLinesRemaining, setScriptLinesRemaining] = useState<number>(scriptLines.length);
  const [started, setStarted] = useState(false);

  // Lobby: avatar + voice selection before meeting starts.
  const [lobbyAvatars, setLobbyAvatars] = useState<LobbyAvatar[]>([]);
  const [lobbyLoading, setLobbyLoading] = useState(true);
  const [lobbyVoices, setLobbyVoices] = useState<LobbyVoice[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedAvatarImage, setSelectedAvatarImage] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);

  const fetchAvatars = useCallback(async () => {
    setLobbyLoading(true);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await fetch("/api/heygen/avatars");
        const data = await r.json();
        const raw = (data.avatars ?? [])
          .filter((a: { preview_image_url?: string; avatar_name?: string }) =>
            a.preview_image_url && !AVATAR_AVOID.test(a.avatar_name ?? "")
          )
          .map((a: { avatar_id: string; avatar_name: string; preview_image_url: string }) => ({
            id: a.avatar_id,
            name: a.avatar_name,
            imageUrl: a.preview_image_url,
          }));
        raw.sort((a: LobbyAvatar, b: LobbyAvatar) => {
          const aP = AVATAR_PREFER.test(a.name) ? 0 : 1;
          const bP = AVATAR_PREFER.test(b.name) ? 0 : 1;
          return aP - bP;
        });
        const list = raw.slice(0, 12);
        if (list.length > 0) {
          setLobbyAvatars(list);
          setSelectedAvatarId((prev) => prev ?? list[0].id);
          setSelectedAvatarImage((prev) => prev ?? list[0].imageUrl);
          setLobbyLoading(false);
          return;
        }
      } catch { /* retry */ }
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2000));
    }
    setLobbyLoading(false);
  }, []);

  useEffect(() => {
    if (started || lobbyAvatars.length > 0) return;
    fetchAvatars();
  }, [started, lobbyAvatars.length, fetchAvatars]);

  useEffect(() => {
    if (started) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    function loadVoices() {
      const all = window.speechSynthesis.getVoices();
      const ja = all
        .filter((v) => v.lang.toLowerCase().startsWith("ja"))
        .map((v) => {
          let q = 0;
          const n = v.name.toLowerCase();
          if (/premium|enhanced|neural|siri|natural|wavenet/.test(n)) q += 100;
          if (/kyoko|otoya|ayumi|haruka|nanami|keita/.test(n)) q += 50;
          if (!v.localService) q += 10;
          return { id: v.voiceURI, name: v.name, quality: q };
        })
        .sort((a, b) => b.quality - a.quality);
      if (ja.length > 0) {
        setLobbyVoices(ja);
        setSelectedVoiceId((prev) => prev ?? ja[0].id);
      }
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [started]);
  const [userInterim, setUserInterim] = useState("");
  const [aiLatest, setAiLatest] = useState("");
  const [thinking, setThinking] = useState(false);
  const [hostPaused, setHostPaused] = useState<boolean>(initialHostPaused);
  const hostPausedRef = useRef<boolean>(initialHostPaused);

  useEffect(() => {
    hostPausedRef.current = hostPaused;
  }, [hostPaused]);

  // Realtime subscription: react to host_paused changes from the observer page.
  useEffect(() => {
    if (!started) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`guest-meeting-${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "meetings",
          filter: `id=eq.${meetingId}`,
        },
        (payload) => {
          const row = payload.new as { host_paused: boolean | null };
          setHostPaused(Boolean(row.host_paused));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [started, meetingId]);

  const { turns, append, endMeeting } = useConversationTurns({ roomId, enabled: started });

  // Dispatch on the meeting's avatar pipeline. All four hooks share
  // the same { videoRef, status, error, speak } shape so we can pick
  // one transparently. Only one hook is actually enabled at a time —
  // the others sit idle.
  //
  // Runtime fallback: if the meeting asked for deepgram_tts but the
  // client hook reports an error (Deepgram INSUFFICIENT_PERMISSIONS
  // for aura-2-sakura-ja, network outage, etc.), we quietly switch
  // to browser_tts so the visitor still hears audio instead of a
  // dead page. Tracked via deepgramFailed state.
  const [deepgramFailed, setDeepgramFailed] = useState(false);
  const [liveAvatarFailed, setLiveAvatarFailed] = useState(false);
  const [simliFailed, setSimliFailed] = useState(false);
  const effectivePipeline =
    pipeline === "simli" && simliFailed
      ? "browser_tts"
      : pipeline === "liveavatar" && liveAvatarFailed
      ? "browser_tts"
      : pipeline === "deepgram_tts" && deepgramFailed
      ? "browser_tts"
      : pipeline;

  const usingSimli = effectivePipeline === "simli";
  const usingLiveAvatar = effectivePipeline === "liveavatar" && USE_LIVEAVATAR;
  const usingHeyGenStreaming = effectivePipeline === "liveavatar" && !USE_LIVEAVATAR;
  const usingBrowserTTS = effectivePipeline === "browser_tts";
  const usingDeepgramTTS = effectivePipeline === "deepgram_tts";

  const heyGen = useHeyGenAvatar({
    roomId,
    avatarName: heygenAvatarId,
    voiceId,
    enabled: started && usingHeyGenStreaming,
  });
  const simli = useSimli({
    roomId,
    enabled: started && usingSimli,
  });
  const liveAvatar = useLiveAvatar({
    roomId,
    enabled: started && usingLiveAvatar,
  });
  const browserTTS = useBrowserTTS({
    enabled: started && usingBrowserTTS,
    initialVoiceId: selectedVoiceId,
  });
  const deepgramTTS = useDeepgramTTS({
    enabled: started && usingDeepgramTTS,
  });

  // If Simli, LiveAvatar, or Deepgram TTS reports an error, fall back
  // to browser_tts so the visitor still hears audio.
  useEffect(() => {
    if (pipeline === "simli" && simli.error && !simliFailed) {
      console.warn("[meet] simli unavailable, falling back to browser_tts", simli.error);
      setSimliFailed(true);
    }
  }, [pipeline, simli.error, simliFailed]);
  useEffect(() => {
    if (pipeline === "liveavatar" && liveAvatar.error && !liveAvatarFailed) {
      console.warn("[meet] liveavatar unavailable, falling back to browser_tts", liveAvatar.error);
      setLiveAvatarFailed(true);
    }
  }, [pipeline, liveAvatar.error, liveAvatarFailed]);
  useEffect(() => {
    if (pipeline === "deepgram_tts" && deepgramTTS.error && !deepgramFailed) {
      console.warn("[meet] deepgram_tts unavailable, falling back to browser_tts", deepgramTTS.error);
      setDeepgramFailed(true);
    }
  }, [pipeline, deepgramTTS.error, deepgramFailed]);

  const videoRef = usingSimli
    ? simli.videoRef
    : usingBrowserTTS
    ? browserTTS.videoRef
    : usingDeepgramTTS
    ? deepgramTTS.videoRef
    : usingLiveAvatar
    ? liveAvatar.videoRef
    : heyGen.videoRef;
  const avatarStatus = usingSimli
    ? simli.status
    : usingBrowserTTS
    ? browserTTS.status
    : usingDeepgramTTS
    ? deepgramTTS.status
    : usingLiveAvatar
    ? liveAvatar.status
    : heyGen.status;
  const avatarError = usingSimli
    ? simli.error
    : usingBrowserTTS
    ? browserTTS.error
    : usingDeepgramTTS
    ? deepgramTTS.error
    : usingLiveAvatar
    ? liveAvatar.error
    : heyGen.error;
  const speak = usingSimli
    ? simli.speak
    : usingBrowserTTS
    ? browserTTS.speak
    : usingDeepgramTTS
    ? deepgramTTS.speak
    : usingLiveAvatar
    ? liveAvatar.speak
    : heyGen.speak;

  // After the avatar connects, greet the guest once. The greeting
  // text is typically identical to (or a superset of) scriptLines[0],
  // so we consume the first script line here to avoid replaying the
  // same content when the user's first message comes in.
  const [greeted, setGreeted] = useState(false);
  useEffect(() => {
    if (avatarStatus === "ready" && !greeted && started) {
      setGreeted(true);
      speak(greeting);
      setAiLatest(greeting);
      append("assistant", greeting);
      if (scriptLinesRemaining > 0) {
        setScriptLinesRemaining((prev) => Math.max(0, prev - 1));
      }
    }
  }, [avatarStatus, greeted, started, greeting, speak, append, scriptLinesRemaining]);

  const onFinalTranscript = useCallback(
    async (text: string) => {
      setUserInterim("");
      if (!text.trim()) return;
      append("user", text);

      // Host has paused AI — record the turn but don't generate a reply.
      if (hostPausedRef.current) {
        setAiLatest("（ホストに取次中です。しばらくお待ちください...）");
        return;
      }

      setThinking(true);
      const requestStart = performance.now();
      let firstChunkAt: number | null = null;
      let firstSpeakAt: number | null = null;

      // Phase 11: compute the local phase using the same logic as
      // /api/rag so we can gate the filler. Filler only fires in the
      // discovery phase — in opening it risks echo-looping right
      // after the scripted greeting, in pitch/objection/closing it
      // makes the avatar sound dismissive ("なるほど" then a dense
      // technical answer feels robotic).
      const userTurnCount = turns.filter((t) => t.role === "user").length;
      const recentUserText = turns
        .filter((t) => t.role === "user")
        .slice(-3)
        .map((t) => t.text)
        .concat(text)
        .join(" ");
      const localPhase = detectPhase({
        turnCount: userTurnCount,
        scriptLinesRemaining,
        recentUserText,
      });
      if (localPhase === "discovery") {
        const fillerBucket = pickFillerBucket(text);
        const filler = pickFiller(fillerBucket);
        setAiLatest(filler);
        speak(filler);
      }

      try {
        const res = await fetch("/api/rag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: roomId,
            user_text: text,
            history: turns.map((t) => ({ role: t.role, text: t.text })),
            stream: true,
            // Phase 10 fields
            turn_count: userTurnCount,
            script_lines: scriptLines,
            script_lines_remaining: scriptLinesRemaining,
          }),
        });
        if (!res.ok || !res.body) throw new Error("rag failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let fullText = "";
        let pendingSentenceBuffer = "";
        // Regex that captures a complete sentence ending with Japanese/latin punctuation.
        const sentenceRe = /[^。！？!?\n]*[。！？!?\n]/;

        async function flushSentences(done = false) {
          while (true) {
            const match = pendingSentenceBuffer.match(sentenceRe);
            if (!match) break;
            const sentence = match[0].trim();
            pendingSentenceBuffer = pendingSentenceBuffer.slice(match[0].length);
            if (sentence) {
              if (firstSpeakAt === null) {
                firstSpeakAt = performance.now();
                console.log(
                  `[meet] time-to-first-speak: ${Math.round(
                    firstSpeakAt - requestStart
                  )}ms (first chunk at ${
                    firstChunkAt ? Math.round(firstChunkAt - requestStart) + "ms" : "?"
                  })`
                );
              }
              // Fire-and-forget: HeyGen queues speak() calls internally.
              speak(sentence);
            }
          }
          if (done && pendingSentenceBuffer.trim()) {
            // Speak any trailing fragment without terminal punctuation.
            speak(pendingSentenceBuffer.trim());
            pendingSentenceBuffer = "";
          }
        }

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });

          // Parse SSE frames (blank-line delimited).
          let idx;
          while ((idx = sseBuffer.indexOf("\n\n")) !== -1) {
            const frame = sseBuffer.slice(0, idx);
            sseBuffer = sseBuffer.slice(idx + 2);
            if (!frame.startsWith("data:")) continue;
            try {
              const payload = JSON.parse(frame.replace(/^data:\s*/, ""));
              if (payload.type === "meta") {
                console.log("[meet] phase=", payload.phase, "intent=", payload.intent, "max_tokens=", payload.max_tokens);
                // Phase 10: when /api/rag is going to play a script line,
                // burn one off our remaining counter so the next turn
                // moves on to the next line (or transitions phase).
                if (payload.intent === "script") {
                  setScriptLinesRemaining((prev) => Math.max(0, prev - 1));
                }
              } else if (payload.type === "chunk" && typeof payload.text === "string") {
                if (firstChunkAt === null) firstChunkAt = performance.now();
                fullText += payload.text;
                pendingSentenceBuffer += payload.text;
                setAiLatest(fullText);
                await flushSentences(false);
              } else if (payload.type === "done") {
                await flushSentences(true);
              } else if (payload.type === "error") {
                console.error("[meet] rag stream error", payload.message);
              }
            } catch (err) {
              console.error("[meet] sse parse failed", err);
            }
          }
        }

        // Final flush (in case the stream ended mid-frame).
        await flushSentences(true);

        if (fullText.trim()) {
          append("assistant", fullText.trim());
        }

        console.log(
          `[meet] total rag time: ${Math.round(performance.now() - requestStart)}ms`
        );
      } catch (err) {
        console.error("[meet] rag failed", err);
      } finally {
        setThinking(false);
      }
    },
    [append, roomId, speak, turns, scriptLines, scriptLinesRemaining]
  );

  // While the AI is speaking, mute the mic so its own voice doesn't
  // echo back through Deepgram and trigger an infinite おうむ返し loop.
  // browser_tts exposes a reliable `speaking` flag via SpeechSynthesis
  // onstart/onend events; LiveAvatar / HeyGen speak() kicks off a
  // streamed audio track that we don't have an explicit talking
  // signal for yet, so default to false and rely on echo cancellation.
  const aiSpeaking = usingSimli
    ? simli.speaking
    : usingBrowserTTS
    ? browserTTS.speaking
    : usingDeepgramTTS
    ? deepgramTTS.speaking
    : false;

  // Phase 10.3: post-speech echo buffer. After the avatar finishes
  // speaking, keep the mic muted for 1.5 seconds so residual echo
  // from the speakers doesn't get picked up by Deepgram and trigger
  // a feedback loop (the greeting echo was the #1 reported issue).
  const [postSpeechBuffer, setPostSpeechBuffer] = useState(false);
  useEffect(() => {
    if (aiSpeaking || thinking) {
      setPostSpeechBuffer(true);
    } else if (postSpeechBuffer) {
      const timer = setTimeout(() => setPostSpeechBuffer(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [aiSpeaking, thinking, postSpeechBuffer]);

  // Phase 9B.7: fire /api/learning on interim so Groq can update the
  // persona / emotion / hot-topics snapshot while the user is still
  // talking. Debounced to once every 1.2s per unique prefix so we
  // don't hammer Groq on rapid interim updates.
  const lastLearningAtRef = useRef<number>(0);
  const lastLearningTextRef = useRef<string>("");
  const handleInterim = useCallback(
    (text: string) => {
      setUserInterim(text);
      if (!text || text.length < 8) return;
      const now = performance.now();
      if (now - lastLearningAtRef.current < 1200) return;
      if (text === lastLearningTextRef.current) return;
      lastLearningAtRef.current = now;
      lastLearningTextRef.current = text;
      fetch("/api/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId, text }),
        keepalive: true,
      }).catch((err) => console.warn("[meet] learning fire failed", err));
    },
    [roomId]
  );

  const { status: sttStatus, muted, toggleMute, error: sttError } = useDeepgramSTT({
    roomId,
    enabled: started,
    externalMute: aiSpeaking || thinking || postSpeechBuffer,
    onInterim: handleInterim,
    onFinal: onFinalTranscript,
  });

  async function handleEnd() {
    await endMeeting();
    setStarted(false);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-2xl w-full rounded-3xl border border-ac/30 bg-s1 p-10 glow-ac">
          <div className="text-center mb-8">
            <div className="mono text-[10px] text-ac/70 mb-3">MEETING ROOM // {roomId}</div>
            <h1 className="text-3xl font-bold mb-2">
              <span className="text-ac">{companyName}</span> との商談
            </h1>
            {contactName && <div className="text-white/60">{contactName} 様</div>}
          </div>

          <div className="mb-6">
            <div className="mono text-[10px] text-white/50 mb-3">AVATAR</div>
            {lobbyLoading && lobbyAvatars.length === 0 && (
              <div className="text-center py-8 text-white/40 text-sm">
                <div className="animate-spin inline-block w-5 h-5 border-2 border-white/20 border-t-ac rounded-full mb-2" />
                <div>アバター読み込み中...</div>
              </div>
            )}
            {!lobbyLoading && lobbyAvatars.length === 0 && (
              <div className="text-center py-6">
                <div className="text-sm text-white/40 mb-3">アバターの取得に失敗しました</div>
                <button
                  onClick={fetchAvatars}
                  className="px-4 py-2 text-xs border border-ac/40 rounded-lg hover:bg-ac/10 transition"
                >
                  再読み込み
                </button>
              </div>
            )}
            {lobbyAvatars.length > 0 && (
              <>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {lobbyAvatars.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSelectedAvatarId(a.id);
                        setSelectedAvatarImage(a.imageUrl);
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                        selectedAvatarId === a.id
                          ? "border-ac shadow-[0_0_20px_rgba(192,96,255,0.4)]"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      {a.imageUrl ? (
                        <img src={a.imageUrl} alt={a.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-s2 flex items-center justify-center text-2xl">🎭</div>
                      )}
                      {selectedAvatarId === a.id && (
                        <div className="absolute inset-0 bg-ac/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-ac flex items-center justify-center text-black text-xs font-bold">
                            ✓
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {selectedAvatarId && lobbyAvatars.find((a) => a.id === selectedAvatarId) && (
                  <div className="mt-2 text-xs text-white/50">
                    {lobbyAvatars.find((a) => a.id === selectedAvatarId)?.name}
                  </div>
                )}
              </>
            )}
          </div>

          {lobbyVoices.length > 0 && (
            <div className="mb-8">
              <div className="mono text-[10px] text-white/50 mb-3">VOICE</div>
              <select
                value={selectedVoiceId ?? ""}
                onChange={(e) => setSelectedVoiceId(e.target.value)}
                className="w-full bg-s2 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ac"
              >
                {lobbyVoices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}{v.quality >= 100 ? " ★" : v.quality >= 50 ? " ☆" : ""}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-[10px] text-white/40">★ = Premium / Neural voice</div>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-white/70 mb-6">
              「会議を開始」を押すとマイク許可を求められます。
            </p>
            <button
              onClick={() => setStarted(true)}
              className="px-8 py-3 bg-ac hover:bg-neon text-black font-semibold rounded-full transition"
            >
              会議を開始する
            </button>
            <div className="mt-6 text-xs text-white/40">
              ※音声は録音・保存され、商材説明の改善に使われます
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="mono text-[10px] text-ac/70">MEETING // {roomId}</div>
            <h1 className="text-xl font-semibold">{companyName} との商談</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/50">
            {hostPaused && (
              <span className="mono text-[10px] px-2 py-1 rounded bg-amber/15 text-amber animate-pulse">
                ホスト取次中
              </span>
            )}
            <span
              className={`w-2 h-2 rounded-full ${
                avatarStatus === "ready" ? "bg-green animate-pulse" : "bg-amber"
              }`}
            />
            {avatarStatus === "ready" ? "LIVE" : avatarStatus.toUpperCase()}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <VideoPanel
              ref={videoRef}
              status={avatarStatus}
              avatarName={avatarName}
              error={avatarError}
              voiceOnly={usingBrowserTTS}
              speaking={usingBrowserTTS ? browserTTS.speaking : false}
              avatarImageUrl={selectedAvatarImage}
            />
            {simliFailed && pipeline === "simli" && (
              <div className="rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
                <strong>スタンダード → 音声モードに切替</strong>
                <span className="text-white/60 ml-2">
                  Simli アバターの接続に失敗しました。SIMLI_API_KEY を確認してください。
                </span>
              </div>
            )}
            {liveAvatarFailed && pipeline === "liveavatar" && (
              <div className="rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
                <strong>プレミアム → 音声モードに切替</strong>
                <span className="text-white/60 ml-2">
                  LiveAvatar のクレジットが不足しています。HeyGen ダッシュボードでクレジットを追加してください。
                </span>
              </div>
            )}
            <SubtitleOverlay userInterim={userInterim} aiLatest={aiLatest} />
            <ControlBar
              muted={muted}
              onToggleMute={toggleMute}
              onEnd={handleEnd}
              thinking={thinking}
            />
            {sttError && (
              <div className="text-xs text-red text-center">音声認識エラー: {sttError}</div>
            )}
            {sttStatus === "requesting-mic" && (
              <div className="text-xs text-white/50 text-center">マイク許可を待っています...</div>
            )}
          </div>
          <aside className="space-y-4">
            {usingBrowserTTS && browserTTS.voices.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-s1 p-4">
                <div className="mono text-[10px] text-white/50 mb-2">VOICE</div>
                <select
                  value={browserTTS.selectedVoiceId ?? ""}
                  onChange={(e) => browserTTS.setSelectedVoiceId(e.target.value)}
                  className="w-full bg-s2 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ac"
                >
                  {browserTTS.voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                      {v.quality >= 100 ? " ★" : v.quality >= 50 ? " ☆" : ""}
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-[10px] text-white/40">
                  ★ = Premium/Enhanced voice (高品質)
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-white/10 bg-s1 p-4">
              <div className="mono text-[10px] text-white/50 mb-3">CONVERSATION LOG</div>
              <ChatHistory turns={turns} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
