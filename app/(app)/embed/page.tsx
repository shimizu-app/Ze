import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";

type Meeting = { id: string; room_id: string; company_name: string };

export const dynamic = "force-dynamic";

export default async function EmbedPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("meetings")
    .select("id, room_id, company_name")
    .order("created_at", { ascending: false })
    .limit(5);

  const meetings = ((data ?? []) as Meeting[]) || [];
  const latest = meetings[0];

  return (
    <>
      <Topbar title="埋め込み・API" code="EMBD" />
      <div className="p-8 max-w-3xl space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">サイト埋め込み用スニペット</h3>
          <p className="text-sm text-white/60 mb-4">
            以下のスクリプトタグを自社サイトに貼ると、右下にフローティングボタンが出て、
            クリックすると会議リンクが新しいタブで開きます。
          </p>

          <div className="rounded-2xl border border-white/10 bg-s1 p-5">
            <div className="mono text-[10px] text-white/50 mb-2">HTML SNIPPET</div>
            <pre className="mono text-xs text-ac whitespace-pre-wrap break-all bg-s2 p-3 rounded-lg overflow-x-auto">
{`<script src="/embed.js" data-room="${latest?.room_id ?? "SAL-XXXXXX"}" async></script>`}
            </pre>
            <div className="mt-3 text-xs text-white/50">
              <code className="mono text-white/70">data-room</code> 属性に会議の room_id を指定します。
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">最新の会議リンク</h3>
          {meetings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-white/40 text-sm">
              会議を作成すると、ここに埋め込み用の room_id が表示されます
            </div>
          ) : (
            <div className="space-y-2">
              {meetings.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-white/5 bg-s1 p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium">{m.company_name}</div>
                    <div className="mono text-[10px] text-ac">{m.room_id}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">REST API</h3>
          <div className="rounded-2xl border border-white/10 bg-s1 p-5 space-y-2 text-xs">
            <EndpointRow method="POST" path="/api/meetings" desc="会議を作成" />
            <EndpointRow method="GET" path="/api/meetings" desc="会議一覧取得" />
            <EndpointRow method="POST" path="/api/rag" desc="RAG 検索＋Gemini 応答" />
            <EndpointRow method="POST" path="/api/analysis" desc="会話の原因分析" />
          </div>
        </div>
      </div>
    </>
  );
}

function EndpointRow({
  method,
  path,
  desc,
}: {
  method: string;
  path: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="mono text-[10px] px-2 py-0.5 rounded bg-ac/15 text-ac">{method}</span>
      <code className="mono text-white/90">{path}</code>
      <span className="text-white/50 ml-auto">{desc}</span>
    </div>
  );
}
