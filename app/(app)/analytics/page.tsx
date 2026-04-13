import { Topbar } from "@/components/layout/Topbar";

export default function AnalyticsPage() {
  return (
    <>
      <Topbar title="アナリティクス" code="ANLX" />
      <div className="p-8 max-w-3xl">
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-white/40">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-lg mb-2">Coming in Phase 3</div>
          <p className="text-sm">
            商談の成約率・平均会話ターン数・原因分析などのダッシュボードがここに実装されます
          </p>
        </div>
      </div>
    </>
  );
}
