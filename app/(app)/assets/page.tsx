"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { ProductIntakeWizard } from "@/components/assets/ProductIntakeWizard";
import { AvatarPersonaWizard } from "@/components/assets/AvatarPersonaWizard";

type Product = { id: string; name: string; category: string | null; created_at: string | null };
type Avatar = { id: string; name: string; role: string; created_at: string | null };

export default function AssetsPage() {
  const [tab, setTab] = useState<"products" | "avatars">("products");
  const [showWizard, setShowWizard] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [avatars, setAvatars] = useState<Avatar[]>([]);

  async function load() {
    const [p, a] = await Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/avatars").then((r) => r.json()),
    ]);
    setProducts(p.products ?? []);
    setAvatars(a.avatars ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Topbar title="商材 & アバター" code="ASET" />
      <div className="p-8 max-w-5xl">
        {!showWizard && (
          <>
            <div className="flex gap-2 mb-6 border-b border-white/10">
              <TabButton active={tab === "products"} onClick={() => setTab("products")}>
                商材 ({products.length})
              </TabButton>
              <TabButton active={tab === "avatars"} onClick={() => setTab("avatars")}>
                アバター ({avatars.length})
              </TabButton>
            </div>

            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowWizard(true)}
                className="px-4 py-2 bg-ac hover:bg-neon text-black text-sm font-semibold rounded-lg"
              >
                + {tab === "products" ? "商材登録" : "アバター登録"}
              </button>
            </div>

            {tab === "products" ? (
              <ItemList items={products.map((p) => ({ id: p.id, title: p.name, sub: p.category ?? "" }))} />
            ) : (
              <ItemList items={avatars.map((a) => ({ id: a.id, title: a.name, sub: a.role.toUpperCase() }))} />
            )}
          </>
        )}

        {showWizard && (
          <div>
            <button
              onClick={() => setShowWizard(false)}
              className="text-xs text-white/60 hover:text-white mb-4"
            >
              ← 一覧に戻る
            </button>
            {tab === "products" ? (
              <ProductIntakeWizard
                onDone={() => {
                  setShowWizard(false);
                  load();
                }}
              />
            ) : (
              <AvatarPersonaWizard
                products={products.map((p) => ({ id: p.id, name: p.name }))}
                onDone={() => {
                  setShowWizard(false);
                  load();
                }}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
        active ? "text-ac border-ac" : "text-white/50 border-transparent hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function ItemList({ items }: { items: { id: string; title: string; sub: string }[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-white/40">
        まだ登録されていません
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((i) => (
        <div key={i.id} className="rounded-xl border border-white/5 bg-s1 p-4 hover:border-ac/30 transition">
          <div className="font-medium">{i.title}</div>
          <div className="mono text-[10px] text-white/40 mt-1">{i.sub}</div>
        </div>
      ))}
    </div>
  );
}
