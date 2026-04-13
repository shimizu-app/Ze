"use client";

import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateMeetingModal({ open, onClose, onCreated }: Props) {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [avatarId, setAvatarId] = useState("");
  const [productId, setProductId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatars, setAvatars] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/avatars").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]).then(([a, p]) => {
      setAvatars(a.avatars ?? []);
      setProducts(p.products ?? []);
    });
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          contact_name: contactName || null,
          avatar_id: avatarId || null,
          product_id: productId || null,
        }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || "作成に失敗しました");
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラー");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-ac/30 bg-s1 p-6 glow-ac space-y-4"
      >
        <h2 className="text-xl font-semibold">新規会議を作成</h2>

        <Field label="会社名 *">
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="担当者名">
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="使うアバター">
          <select
            value={avatarId}
            onChange={(e) => setAvatarId(e.target.value)}
            className="input"
          >
            <option value="">-- 未選択 --</option>
            {avatars.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="商材">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="input"
          >
            <option value="">-- 未選択 --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        {error && <div className="text-xs text-red">{error}</div>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/60 hover:text-white"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-ac hover:bg-neon text-black text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {submitting ? "作成中..." : "作成"}
          </button>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            background: #0f0420;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.5rem;
            padding: 0.625rem 1rem;
            font-size: 0.875rem;
            color: white;
            outline: none;
          }
          .input:focus {
            border-color: #c060ff;
          }
        `}</style>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-white/60 mb-1.5 mono">{label}</label>
      {children}
    </div>
  );
}
