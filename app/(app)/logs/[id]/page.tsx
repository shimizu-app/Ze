import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";

type Turn = { role: "user" | "assistant"; text: string; ts?: string };

export const dynamic = "force-dynamic";

export default async function LogDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) notFound();
  const conversation = data as {
    id: string;
    company_name: string | null;
    outcome: string | null;
    turns: number | null;
    summary: string | null;
    cause_analysis: string | null;
    tags: string[] | null;
    created_at: string | null;
    transcript: Turn[] | null;
  };

  const turns = Array.isArray(conversation.transcript) ? conversation.transcript : [];

  return (
    <>
      <Topbar title={`商談ログ: ${conversation.company_name ?? "—"}`} code="LOGS" />
      <div className="p-8 max-w-4xl">
        <Link href="/logs" className="text-xs text-white/60 hover:text-white">
          ← 一覧に戻る
        </Link>

        <div className="grid md:grid-cols-2 gap-4 my-6">
          <div className="rounded-2xl border border-white/10 bg-s1 p-5">
            <div className="mono text-[10px] text-white/50 mb-2">SUMMARY</div>
            <p className="text-sm text-white/90">{conversation.summary ?? "未分析"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-s1 p-5">
            <div className="mono text-[10px] text-white/50 mb-2">CAUSE ANALYSIS</div>
            <p className="text-sm text-white/90">{conversation.cause_analysis ?? "未分析"}</p>
          </div>
        </div>

        {conversation.tags && conversation.tags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {conversation.tags.map((t, i) => (
              <span
                key={i}
                className="mono text-[10px] px-2 py-1 rounded bg-ac/10 text-ac border border-ac/30"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-s1 p-5">
          <div className="mono text-[10px] text-white/50 mb-4">TRANSCRIPT ({turns.length} ターン)</div>
          {turns.length === 0 ? (
            <div className="text-xs text-white/40 text-center py-6">会話がありません</div>
          ) : (
            <div className="space-y-3">
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
    </>
  );
}
