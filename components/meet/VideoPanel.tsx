"use client";

import { forwardRef } from "react";

interface Props {
  status: "idle" | "connecting" | "ready" | "error" | "ended";
  avatarName: string;
  error?: string | null;
}

export const VideoPanel = forwardRef<HTMLVideoElement, Props>(function VideoPanel(
  { status, avatarName, error },
  ref
) {
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
