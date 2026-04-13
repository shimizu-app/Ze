"use client";

import type { Turn } from "./useConversationTurns";

export function ChatHistory({ turns }: { turns: Turn[] }) {
  if (turns.length === 0) {
    return (
      <div className="text-xs text-white/40 text-center py-6">
        まだ会話がありません。マイクに向かって話しかけてください。
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
      {turns.map((t, i) => (
        <div
          key={i}
          className={`rounded-xl px-4 py-2.5 text-sm ${
            t.role === "assistant"
              ? "bg-ac/10 border border-ac/20 text-white/90"
              : "bg-s2 border border-white/10 text-white/80"
          }`}
        >
          <div className="mono text-[9px] text-white/40 mb-1">
            {t.role === "assistant" ? "AVATAR" : "YOU"} ·{" "}
            {new Date(t.ts).toLocaleTimeString("ja-JP")}
          </div>
          {t.text}
        </div>
      ))}
    </div>
  );
}
