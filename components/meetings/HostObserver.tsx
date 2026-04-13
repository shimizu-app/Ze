"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Turn = { role: "user" | "assistant"; text: string; ts?: string };

interface Meeting {
  id: string;
  room_id: string;
  company_name: string;
  contact_name: string | null;
  status: string | null;
  host_paused: boolean | null;
  mode: string | null;
}

export function HostObserver({
  meeting,
  initialConversationId,
  initialTurns,
}: {
  meeting: Meeting;
  initialConversationId: string | null;
  initialTurns: Turn[];
}) {
  const supabase = createClient();
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [paused, setPaused] = useState<boolean>(meeting.host_paused ?? false);
  const [status, setStatus] = useState<string | null>(meeting.status);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);

  useEffect(() => {
    // Subscribe to conversations insert/update for this meeting.
    const channel = supabase
      .channel(`host-meeting-${meeting.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `meeting_id=eq.${meeting.id}`,
        },
        (payload) => {
          const row = payload.new as { id: string; transcript: Turn[] | null };
          if (row?.id) setConversationId(row.id);
          if (Array.isArray(row?.transcript)) setTurns(row.transcript);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "meetings",
          filter: `id=eq.${meeting.id}`,
        },
        (payload) => {
          const row = payload.new as { host_paused: boolean | null; status: string | null };
          setPaused(Boolean(row.host_paused));
          setStatus(row.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id]);

  async function togglePause() {
    const next = !paused;
    setPaused(next);
    try {
      await fetch(`/api/meetings/${meeting.id}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: next }),
      });
    } catch (err) {
      console.error("[host] toggle pause failed", err);
      setPaused(!next);
    }
  }

  const meetUrl =
    typeof window !== "undefined" ? `${window.location.origin}/meet/${meeting.room_id}` : "";

  return (
    <div className="p-8 max-w-5xl">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="md:col-span-2 space-y-4">
          {/* Status header */}
          <div className="rounded-2xl border border-white/10 bg-s1 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="mono text-[10px] text-white/50 mb-1">ROOM // {meeting.room_id}</div>
                <div className="text-xl font-semibold">{meeting.company_name}</div>
                {meeting.contact_name && (
                  <div className="text-xs text-white/60 mt-1">{meeting.contact_name} 様</div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`mono text-[10px] px-2 py-1 rounded ${
                    status === "live"
                      ? "bg-green/15 text-green"
                      : status === "ended"
                      ? "bg-white/10 text-white/50"
                      : "bg-amber/15 text-amber"
                  }`}
                >
                  {status?.toUpperCase() ?? "WAITING"}
                </span>
                {paused && (
                  <span className="mono text-[10px] px-2 py-1 rounded bg-amber/15 text-amber animate-pulse">
                    AI PAUSED
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={togglePause}
                disabled={status === "ended"}
                className={`px-5 py-2 text-sm font-semibold rounded-lg transition disabled:opacity-40 ${
                  paused
                    ? "bg-green hover:bg-green/80 text-black"
                    : "bg-amber hover:bg-amber/80 text-black"
                }`}
              >
                {paused ? "▶ AI を再開" : "⏸ AI を一時停止 (ホスト引取り)"}
              </button>
              <a
                href={meetUrl}
                target="_blank"
                rel="noopener"
                className="px-5 py-2 text-sm border border-white/20 hover:border-ac/50 rounded-lg"
              >
                ゲスト画面を開く →
              </a>
            </div>
          </div>

          {/* Live transcript */}
          <div className="rounded-2xl border border-white/10 bg-s1 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="mono text-[10px] text-white/50">LIVE TRANSCRIPT</div>
              <div className="mono text-[10px] text-white/40">{turns.length} ターン</div>
            </div>
            {turns.length === 0 ? (
              <div className="text-xs text-white/40 text-center py-8">
                まだ会話がありません
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {turns.map((t, i) => (
                  <div
                    key={i}
                    className={`rounded-xl px-4 py-3 text-sm ${
                      t.role === "assistant"
                        ? "bg-ac/10 border border-ac/20"
                        : "bg-s2 border border-white/10"
                    }`}
                  >
                    <div className="mono text-[9px] text-white/40 mb-1">
                      {t.role === "assistant" ? "AVATAR" : "GUEST"}
                      {t.ts && ` · ${new Date(t.ts).toLocaleTimeString("ja-JP")}`}
                    </div>
                    {t.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-ac/20 bg-s1 p-5">
            <div className="mono text-[10px] text-ac/70 mb-2">HOST CONTROLS</div>
            <p className="text-xs text-white/60 mb-3">
              AI を一時停止すると、ゲスト側の会議室に「ホストに取次中...」と表示され、
              AI は新しい発話に応答しなくなります。
            </p>
            <p className="text-xs text-white/50">
              Phase 2.1 lite:<br />
              フル WebRTC の音声/映像引き取りは将来実装予定です。現状は AI 停止 + ログ観察のみ。
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-s1 p-5">
            <div className="mono text-[10px] text-white/50 mb-2">MODE</div>
            <div className="text-sm">{meeting.mode ?? "ai_only"}</div>
          </div>
          {conversationId && (
            <a
              href={`/logs/${conversationId}`}
              className="block rounded-2xl border border-white/10 bg-s1 p-5 hover:border-ac/40 transition"
            >
              <div className="mono text-[10px] text-white/50 mb-2">FULL LOG</div>
              <div className="text-sm text-ac">ログ詳細を開く →</div>
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
