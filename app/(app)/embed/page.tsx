import { Topbar } from "@/components/layout/Topbar";

export default function EmbedPage() {
  return (
    <>
      <Topbar title="埋め込み・API" code="EMBD" />
      <div className="p-8 max-w-3xl">
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-white/40">
          <div className="text-4xl mb-3">🧩</div>
          <div className="text-lg mb-2">Coming in Phase 3</div>
          <p className="text-sm">
            サイト埋め込み用の embed.js と API トークンの発行機能がここに実装されます
          </p>
        </div>
      </div>
    </>
  );
}
