import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";

type Conversation = {
  id: string;
  company_name: string | null;
  outcome: string | null;
  turns: number | null;
  summary: string | null;
  cause_analysis: string | null;
  tags: string[] | null;
  created_at: string | null;
};

const OUTCOME_STYLE: Record<string, { label: string; cls: string }> = {
  won: { label: "成約", cls: "bg-green/15 text-green" },
  lost: { label: "失注", cls: "bg-red/15 text-red" },
  escalated: { label: "引取り", cls: "bg-amber/15 text-amber" },
  pending: { label: "進行中", cls: "bg-white/5 text-white/50" },
};

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .order("created_at", { ascending: false });

  const conversations = ((data ?? []) as Conversation[]) || [];

  return (
    <>
      <Topbar title="商談ログ" code="LOGS" />
      <div className="p-8 max-w-5xl">
        <div className="mb-6 text-sm text-white/60">
          過去の商談ログ一覧。AIが終了時に自動で要約・原因分析・アウトカム判定を行います。
        </div>

        {conversations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-white/40">
            まだ商談ログがありません
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((c) => {
              const style = OUTCOME_STYLE[c.outcome ?? "pending"] ?? OUTCOME_STYLE.pending;
              return (
                <Link
                  key={c.id}
                  href={`/logs/${c.id}`}
                  className="block rounded-2xl border border-white/5 bg-s1 hover:border-ac/40 transition p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="font-semibold text-base">{c.company_name ?? "—"}</div>
                        <span className={`mono text-[10px] px-2 py-0.5 rounded ${style.cls}`}>
                          {style.label}
                        </span>
                      </div>
                      {c.summary && (
                        <p className="text-xs text-white/60 mb-2 line-clamp-2">{c.summary}</p>
                      )}
                      {c.tags && c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {c.tags.map((t, i) => (
                            <span
                              key={i}
                              className="mono text-[9px] px-2 py-0.5 rounded bg-s2 text-white/60"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="mono text-[10px] text-white/40">
                        {c.created_at ? new Date(c.created_at).toLocaleString("ja-JP") : ""}
                      </div>
                      <div className="text-xs text-white/50 mt-1">{c.turns ?? 0} ターン</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
