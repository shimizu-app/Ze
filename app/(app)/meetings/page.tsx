"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";

type Meeting = {
  id: string;
  room_id: string;
  company_name: string;
  contact_name: string | null;
  status: string | null;
  created_at: string | null;
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const { meetings = [] } = await fetch("/api/meetings").then((r) => r.json());
    setMeetings(meetings);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Topbar title="会議管理" code="MEET" />
      <div className="p-8 max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">会議一覧 ({meetings.length})</h2>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 bg-ac hover:bg-neon text-black text-sm font-semibold rounded-lg"
          >
            + 新規会議
          </button>
        </div>

        {meetings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-white/40">
            まだ会議がありません
          </div>
        ) : (
          <div className="space-y-2">
            {meetings.map((m) => {
              const link =
                typeof window !== "undefined"
                  ? `${window.location.origin}/meet/${m.room_id}`
                  : `/meet/${m.room_id}`;
              return (
                <div key={m.id} className="rounded-xl border border-white/5 bg-s1 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold">{m.company_name}</div>
                      {m.contact_name && (
                        <div className="text-xs text-white/50 mt-0.5">{m.contact_name} 様</div>
                      )}
                      <div className="mono text-[11px] text-ac mt-2">{link}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`mono text-[10px] px-2 py-1 rounded ${
                          m.status === "live"
                            ? "bg-green/15 text-green"
                            : m.status === "ended"
                            ? "bg-white/5 text-white/40"
                            : "bg-amber/15 text-amber"
                        }`}
                      >
                        {m.status?.toUpperCase()}
                      </span>
                      <Link
                        href={`/meet/${m.room_id}`}
                        className="px-3 py-1.5 text-xs bg-s2 hover:bg-ac/20 rounded border border-white/10 hover:border-ac/40 transition"
                      >
                        開く →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateMeetingModal open={open} onClose={() => setOpen(false)} onCreated={load} />
    </>
  );
}
