import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/Topbar";

type Meeting = {
  id: string;
  room_id: string;
  company_name: string;
  status: string | null;
};

export default async function HomePage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  const meetingsRes = await supabase
    .from("meetings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  const productsRes = await supabase.from("products").select("id, name").limit(20);
  const avatarsRes = await supabase.from("avatars").select("id, name").limit(20);

  const meetings = (meetingsRes.data ?? []) as Meeting[];
  const products = (productsRes.data ?? []) as { id: string; name: string }[];
  const avatars = (avatarsRes.data ?? []) as { id: string; name: string }[];

  const activeMeetings = meetings.filter((m) => m.status === "live" || m.status === "waiting");

  return (
    <>
      <Topbar title="ホーム" code="HOME" />
      <div className="p-8 space-y-8 max-w-6xl">
        {/* Hero */}
        <section className="rounded-3xl border border-ac/20 bg-gradient-to-br from-s1 to-s2 p-10 glow-ac">
          <div className="mono text-[10px] text-ac/70 mb-2">HERO // WELCOME</div>
          <h2 className="text-3xl font-bold mb-3">
            会議リンクを送るだけで、<span className="text-ac">AIアバター</span>が商談する
          </h2>
          <p className="text-white/60 mb-6 max-w-2xl">
            商材とアバターを登録して、相手に会議リンクを共有するだけ。
            最初のヒアリング、商材説明、反論対応までAIが自動で進めます。
          </p>
          <div className="flex gap-3">
            <Link
              href="/meetings"
              className="px-5 py-2.5 bg-ac hover:bg-neon text-black font-semibold rounded-lg transition"
            >
              新しい会議を作る
            </Link>
            <Link
              href="/assets"
              className="px-5 py-2.5 border border-white/20 hover:border-ac text-white/90 rounded-lg transition"
            >
              商材・アバター管理
            </Link>
          </div>
        </section>

        {/* Quick stats */}
        <section className="grid grid-cols-3 gap-4">
          <StatCard label="登録商材" value={products.length} code="PROD" />
          <StatCard label="アバター" value={avatars.length} code="AVTR" />
          <StatCard label="アクティブ会議" value={activeMeetings.length} code="LIVE" />
        </section>

        {/* Recent meetings */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-lg font-semibold">最近の会議</h3>
            <Link href="/meetings" className="text-xs text-ac hover:text-neon mono">
              ALL →
            </Link>
          </div>
          {meetings.length > 0 ? (
            <div className="space-y-2">
              {meetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/meet/${m.room_id}`}
                  className="block rounded-xl border border-white/5 bg-s1 hover:border-ac/40 transition p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{m.company_name}</div>
                      <div className="mono text-[10px] text-white/40 mt-1">{m.room_id}</div>
                    </div>
                    <div
                      className={`mono text-[10px] px-2 py-1 rounded ${
                        m.status === "live"
                          ? "bg-green/15 text-green"
                          : m.status === "ended"
                          ? "bg-white/5 text-white/40"
                          : "bg-amber/15 text-amber"
                      }`}
                    >
                      {m.status?.toUpperCase()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
              まだ会議がありません
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function StatCard({ label, value, code }: { label: string; value: number; code: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-s1 p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-white/50">{label}</span>
        <span className="mono text-[9px] text-white/30">{code}</span>
      </div>
      <div className="mt-2 text-3xl font-bold mono">{value}</div>
    </div>
  );
}
