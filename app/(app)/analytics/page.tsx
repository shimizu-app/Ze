import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";

type Conversation = {
  id: string;
  outcome: string | null;
  turns: number | null;
  tags: string[] | null;
  created_at: string | null;
};

type Meeting = {
  id: string;
  status: string | null;
  mode: string | null;
  created_at: string | null;
};

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = createClient();

  const [convRes, meetRes] = await Promise.all([
    supabase.from("conversations").select("id, outcome, turns, tags, created_at"),
    supabase.from("meetings").select("id, status, mode, created_at"),
  ]);

  const conversations = ((convRes.data ?? []) as Conversation[]) || [];
  const meetings = ((meetRes.data ?? []) as Meeting[]) || [];

  const total = conversations.length;
  const won = conversations.filter((c) => c.outcome === "won").length;
  const lost = conversations.filter((c) => c.outcome === "lost").length;
  const escalated = conversations.filter((c) => c.outcome === "escalated").length;
  const pending = conversations.filter((c) => c.outcome === "pending" || !c.outcome).length;

  const avgTurns =
    total > 0
      ? Math.round(
          conversations.reduce((acc, c) => acc + (c.turns ?? 0), 0) / total
        )
      : 0;

  const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

  // Tag frequency
  const tagCount = new Map<string, number>();
  conversations.forEach((c) => {
    (c.tags ?? []).forEach((t) => tagCount.set(t, (tagCount.get(t) ?? 0) + 1));
  });
  const topTags = Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const liveMeetings = meetings.filter((m) => m.status === "live").length;
  const endedMeetings = meetings.filter((m) => m.status === "ended").length;

  return (
    <>
      <Topbar title="アナリティクス" code="ANLX" />
      <div className="p-8 max-w-6xl space-y-8">
        {/* KPI row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="全商談" value={total} code="TOTAL" />
          <Kpi label="成約率" value={`${winRate}%`} code="WIN%" accent />
          <Kpi label="平均ターン" value={avgTurns} code="AVG" />
          <Kpi label="ライブ中" value={liveMeetings} code="LIVE" />
        </section>

        {/* Outcome breakdown */}
        <section>
          <h3 className="text-sm text-white/60 mb-3 mono">OUTCOME BREAKDOWN</h3>
          <div className="rounded-2xl border border-white/10 bg-s1 p-6">
            {total === 0 ? (
              <div className="text-center text-white/40 text-sm py-6">
                まだデータがありません
              </div>
            ) : (
              <div className="space-y-3">
                <Bar label="成約" count={won} total={total} color="bg-green" />
                <Bar label="失注" count={lost} total={total} color="bg-red" />
                <Bar label="引取り" count={escalated} total={total} color="bg-amber" />
                <Bar label="進行中" count={pending} total={total} color="bg-white/20" />
              </div>
            )}
          </div>
        </section>

        {/* Top tags */}
        <section>
          <h3 className="text-sm text-white/60 mb-3 mono">FREQUENT TAGS</h3>
          <div className="rounded-2xl border border-white/10 bg-s1 p-6">
            {topTags.length === 0 ? (
              <div className="text-center text-white/40 text-sm py-6">
                まだタグがありません
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topTags.map(([tag, count]) => (
                  <div
                    key={tag}
                    className="flex items-center gap-2 rounded-lg bg-ac/10 border border-ac/30 px-3 py-1.5"
                  >
                    <span className="text-xs text-white/80">#{tag}</span>
                    <span className="mono text-[10px] text-ac">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Mode distribution */}
        <section>
          <h3 className="text-sm text-white/60 mb-3 mono">MEETING MODE</h3>
          <div className="rounded-2xl border border-white/10 bg-s1 p-6">
            <div className="flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold mono text-ac">
                  {meetings.filter((m) => m.mode === "ai_only").length}
                </div>
                <div className="text-xs text-white/50 mt-1">AI ノンブロッキング</div>
              </div>
              <div>
                <div className="text-2xl font-bold mono text-amber">
                  {meetings.filter((m) => m.mode === "ai_escalation").length}
                </div>
                <div className="text-xs text-white/50 mt-1">AI + エスカレーション</div>
              </div>
              <div>
                <div className="text-2xl font-bold mono text-white/60">
                  {meetings.filter((m) => m.mode === "ai_human").length}
                </div>
                <div className="text-xs text-white/50 mt-1">AI + ホスト同時</div>
              </div>
              <div>
                <div className="text-2xl font-bold mono">{endedMeetings}</div>
                <div className="text-xs text-white/50 mt-1">終了済み合計</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  code,
  accent,
}: {
  label: string;
  value: number | string;
  code: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent ? "border-ac/30 bg-ac/5" : "border-white/5 bg-s1"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-white/50">{label}</span>
        <span className="mono text-[9px] text-white/30">{code}</span>
      </div>
      <div className={`mt-2 text-3xl font-bold mono ${accent ? "text-ac" : ""}`}>{value}</div>
    </div>
  );
}

function Bar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/70">{label}</span>
        <span className="mono text-white/50">
          {count} / {total} ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-s2 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
