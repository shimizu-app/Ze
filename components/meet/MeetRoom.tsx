"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeyGenAvatar } from "./useHeyGenAvatar";
import { useLiveAvatar } from "./useLiveAvatar";
import { useDeepgramSTT } from "./useDeepgramSTT";
import { useConversationTurns } from "./useConversationTurns";
import { VideoPanel } from "./VideoPanel";
import { SubtitleOverlay } from "./SubtitleOverlay";
import { ControlBar } from "./ControlBar";

// Feature flag: drives the meet room with the @heygen/liveavatar-web-sdk
// pipeline. Defaults to ON because the legacy HeyGen Streaming Avatar
// API is sunset and returning 401 on this account. Set
// NEXT_PUBLIC_USE_LIVEAVATAR=false on Vercel only if you need to fall
// back to the old streaming SDK for testing.
const USE_LIVEAVATAR = process.env.NEXT_PUBLIC_USE_LIVEAVATAR !== "false";
import { ChatHistory } from "./ChatHistory";

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
}: Props) {
  const [started, setStarted] = useState(false);
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

  // Pick the avatar pipeline based on the build-time feature flag.
  // We instantiate both hooks but only enable one at a time so the
  // unused pipeline never connects.
  const heyGen = useHeyGenAvatar({
    roomId,
    avatarName: heygenAvatarId,
    voiceId,
    enabled: started && !USE_LIVEAVATAR,
  });
  const liveAvatar = useLiveAvatar({
    roomId,
    enabled: started && USE_LIVEAVATAR,
  });
  const videoRef = USE_LIVEAVATAR ? liveAvatar.videoRef : heyGen.videoRef;
  const avatarStatus = USE_LIVEAVATAR ? liveAvatar.status : heyGen.status;
  const speak = USE_LIVEAVATAR ? liveAvatar.speak : heyGen.speak;

  // After the avatar connects, greet the guest once.
  const [greeted, setGreeted] = useState(false);
  useEffect(() => {
    if (avatarStatus === "ready" && !greeted && started) {
      setGreeted(true);
      speak(greeting);
      setAiLatest(greeting);
      append("assistant", greeting);
    }
  }, [avatarStatus, greeted, started, greeting, speak, append]);

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

      try {
        const res = await fetch("/api/rag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: roomId,
            user_text: text,
            history: turns.map((t) => ({ role: t.role, text: t.text })),
            stream: true,
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
              if (payload.type === "chunk" && typeof payload.text === "string") {
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
    [append, roomId, speak, turns]
  );

  const { status: sttStatus, muted, toggleMute, error: sttError } = useDeepgramSTT({
    roomId,
    enabled: started,
    onInterim: setUserInterim,
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
        <div className="max-w-lg w-full rounded-3xl border border-ac/30 bg-s1 p-10 glow-ac text-center">
          <div className="mono text-[10px] text-ac/70 mb-3">MEETING ROOM // {roomId}</div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-ac">{companyName}</span> との商談
          </h1>
          {contactName && <div className="text-white/60 mb-4">{contactName} 様</div>}
          <p className="text-sm text-white/70 mt-6 mb-8">
            「会議を開始」を押すとマイク・カメラ許可を求められます。
            許可すると AI アバター <strong className="text-ac">{avatarName}</strong> との商談が始まります。
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
            <VideoPanel ref={videoRef} status={avatarStatus} avatarName={avatarName} />
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
          <aside className="rounded-2xl border border-white/10 bg-s1 p-4">
            <div className="mono text-[10px] text-white/50 mb-3">CONVERSATION LOG</div>
            <ChatHistory turns={turns} />
          </aside>
        </div>
      </div>
    </div>
  );
}
