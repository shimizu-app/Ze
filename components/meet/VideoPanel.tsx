"use client";

import { forwardRef } from "react";

interface Props {
  status: "idle" | "connecting" | "ready" | "error" | "ended";
  avatarName: string;
  error?: string | null;
  /** When true, we render a static placeholder avatar instead of expecting a video stream. */
  voiceOnly?: boolean;
  /** Pulses the placeholder border when the TTS engine is mid-utterance. */
  speaking?: boolean;
  /** Avatar preview image from HeyGen catalog. Replaces the 🎭 placeholder. */
  avatarImageUrl?: string | null;
}

export const VideoPanel = forwardRef<HTMLVideoElement, Props>(function VideoPanel(
  { status, avatarName, error, voiceOnly, speaking, avatarImageUrl },
  ref
) {
  // Voice-only mode renders a big glowing avatar placeholder.
  if (voiceOnly) {
    return (
      <div
        className={`relative w-full aspect-video rounded-3xl overflow-hidden border glow-ac transition-all ${
          speaking
            ? "border-ac bg-gradient-to-br from-ac/20 via-s2 to-s1 shadow-[0_0_60px_rgba(192,96,255,0.45)]"
            : "border-ac/20 bg-gradient-to-br from-s2 to-s1"
        }`}
      >
        {avatarImageUrl && (
          <img
            src={avatarImageUrl}
            alt={avatarName}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
              speaking ? "opacity-100" : "opacity-80"
            }`}
          />
        )}
        <div className={`absolute inset-0 flex items-center justify-center ${avatarImageUrl ? "bg-black/30" : ""}`}>
          <div className="text-center">
            {!avatarImageUrl && (
              <div
                className={`text-8xl mb-4 ${speaking ? "animate-pulse" : ""}`}
                aria-hidden
              >
                🎭
              </div>
            )}
            <div className="text-2xl font-bold mb-1 drop-shadow-lg">{avatarName}</div>
            <div className="mono text-[10px] text-ac/70 drop-shadow">
              VOICE-ONLY TRIAL
              {speaking && <span className="ml-2 text-ac">● SPEAKING</span>}
              {status === "error" && <span className="ml-2 text-red">● ERROR</span>}
            </div>
          </div>
        </div>
        {status === "error" && error && (
          <div className="absolute bottom-4 left-4 right-4 mono text-[10px] text-red break-all max-h-20 overflow-y-auto text-left bg-s2/90 p-2 rounded border border-red/30">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-s2 border border-ac/20 glow-ac">
      <video
        ref={ref}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      {status !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-s1/80 backdrop-blur px-6">
          <div className="text-center max-w-xl">
            <div className="text-5xl mb-3">🎭</div>
            <div className="text-xl font-semibold mb-1">{avatarName}</div>
            <div className="mono text-[11px] text-white/50 mb-2">
              {status === "connecting" && "アバター接続中..."}
              {status === "idle" && "準備中..."}
              {status === "error" && "接続エラー"}
              {status === "ended" && "セッション終了"}
            </div>
            {status === "error" && error && (
              <div className="mt-3 mono text-[10px] text-red break-all max-h-32 overflow-y-auto text-left bg-s2/80 p-2 rounded border border-red/30">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
