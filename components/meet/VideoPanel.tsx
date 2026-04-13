"use client";

import { forwardRef } from "react";

interface Props {
  status: "idle" | "connecting" | "ready" | "error" | "ended";
  avatarName: string;
}

export const VideoPanel = forwardRef<HTMLVideoElement, Props>(function VideoPanel(
  { status, avatarName },
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
        <div className="absolute inset-0 flex items-center justify-center bg-s1/80 backdrop-blur">
          <div className="text-center">
            <div className="text-5xl mb-3">🎭</div>
            <div className="text-xl font-semibold mb-1">{avatarName}</div>
            <div className="mono text-[11px] text-white/50">
              {status === "connecting" && "アバター接続中..."}
              {status === "idle" && "準備中..."}
              {status === "error" && "接続エラー"}
              {status === "ended" && "セッション終了"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
