import { Topbar } from "@/components/layout/Topbar";

export default function LogsPage() {
  return (
    <>
      <Topbar title="商談ログ" code="LOGS" />
      <div className="p-8 max-w-3xl">
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-white/40">
          <div className="text-4xl mb-3">📝</div>
          <div className="text-lg mb-2">Coming in Phase 3</div>
          <p className="text-sm">
            会話全文・原因分析・タグ付けなどの商談ログビューがここに実装されます
          </p>
        </div>
      </div>
    </>
  );
}
