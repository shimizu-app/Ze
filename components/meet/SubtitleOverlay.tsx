"use client";

interface Props {
  userInterim: string;
  aiLatest: string;
}

export function SubtitleOverlay({ userInterim, aiLatest }: Props) {
  return (
    <div className="space-y-2">
      {aiLatest && (
        <div className="rounded-xl bg-ac/10 border border-ac/30 px-4 py-3">
          <div className="mono text-[10px] text-ac/80 mb-1">AVATAR</div>
          <div className="text-sm text-white/95">{aiLatest}</div>
        </div>
      )}
      {userInterim && (
        <div className="rounded-xl bg-s2 border border-white/10 px-4 py-3">
          <div className="mono text-[10px] text-white/50 mb-1">YOU (LIVE)</div>
          <div className="text-sm text-white/80 italic">{userInterim}</div>
        </div>
      )}
    </div>
  );
}
