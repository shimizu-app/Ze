"use client";

interface Props {
  muted: boolean;
  onToggleMute: () => void;
  onEnd: () => void;
  thinking: boolean;
}

export function ControlBar({ muted, onToggleMute, onEnd, thinking }: Props) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={onToggleMute}
        className={`px-5 py-3 rounded-full text-sm font-medium transition border ${
          muted
            ? "bg-red/20 border-red/40 text-red"
            : "bg-s2 border-white/20 text-white hover:border-ac/50"
        }`}
      >
        {muted ? "🔇 ミュート中" : "🎤 マイクON"}
      </button>
      {thinking && (
        <div className="mono text-[11px] text-ac/70 animate-pulse">AI 思考中...</div>
      )}
      <button
        onClick={onEnd}
        className="px-5 py-3 rounded-full bg-red hover:bg-red/80 text-white text-sm font-medium transition"
      >
        会議を終了
      </button>
    </div>
  );
}
