"use client";

import { useCallback, useEffect, useState } from "react";
import { useHeyGenAvatar } from "./useHeyGenAvatar";
import { useDeepgramSTT } from "./useDeepgramSTT";
import { useConversationTurns } from "./useConversationTurns";
import { VideoPanel } from "./VideoPanel";
import { SubtitleOverlay } from "./SubtitleOverlay";
import { ControlBar } from "./ControlBar";
import { ChatHistory } from "./ChatHistory";

interface Props {
  roomId: string;
  companyName: string;
  contactName: string | null;
  avatarName: string;
  heygenAvatarId: string;
  voiceId?: string;
  greeting: string;
}

export function MeetRoom({
  roomId,
  companyName,
  contactName,
  avatarName,
  heygenAvatarId,
  voiceId,
  greeting,
}: Props) {
  const [started, setStarted] = useState(false);
  const [userInterim, setUserInterim] = useState("");
  const [aiLatest, setAiLatest] = useState("");
  const [thinking, setThinking] = useState(false);

  const { turns, append, endMeeting } = useConversationTurns({ roomId, enabled: started });
  const { videoRef, status: avatarStatus, speak } = useHeyGenAvatar({
    roomId,
    avatarName: heygenAvatarId,
    voiceId,
    enabled: started,
  });

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

      setThinking(true);
      try {
        const res = await fetch("/api/rag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: roomId,
            user_text: text,
            history: turns.map((t) => ({ role: t.role, text: t.text })),
          }),
        });
        if (!res.ok) throw new Error("rag failed");
        const { text: reply } = (await res.json()) as { text: string };
        setAiLatest(reply);
        append("assistant", reply);
        await speak(reply);
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
          <div className="flex items-center gap-2 text-xs text-white/50">
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
