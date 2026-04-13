"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["基本情報", "強み", "解決するペイン", "自由記述", "確認"] as const;

interface FormState {
  name: string;
  category: string;
  price: string;
  strengths: string;
  pains: string[];
  free_text: string;
  ng_words: string;
}

export function ProductIntakeWizard({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    name: "",
    category: "",
    price: "",
    strengths: "",
    pains: [""],
    free_text: "",
    ng_words: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pains: form.pains.filter((p) => p.trim() !== ""),
        }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || "登録に失敗しました");
      }
      onDone?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラー");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full mono text-[11px] flex items-center justify-center ${
                i === step
                  ? "bg-ac text-black"
                  : i < step
                  ? "bg-ac/30 text-ac"
                  : "bg-s2 text-white/40"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-xs ${i === step ? "text-white" : "text-white/40"}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Step body */}
      <div className="rounded-2xl border border-white/10 bg-s1 p-6 space-y-4 min-h-[280px]">
        {step === 0 && (
          <>
            <Field label="商材名 *">
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="カテゴリ">
              <input
                type="text"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                placeholder="例: SaaS / 業務システム"
                className="input"
              />
            </Field>
            <Field label="価格">
              <input
                type="text"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="例: 月額5万円〜"
                className="input"
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <Field label="強み・差別化ポイント">
            <textarea
              rows={8}
              value={form.strengths}
              onChange={(e) => update("strengths", e.target.value)}
              placeholder="競合と比較した差別化要素、優位性を記述..."
              className="input"
            />
          </Field>
        )}

        {step === 2 && (
          <Field label="解決するペイン（複数可）">
            <div className="space-y-2">
              {form.pains.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => {
                      const next = [...form.pains];
                      next[i] = e.target.value;
                      update("pains", next);
                    }}
                    placeholder={`ペイン ${i + 1}`}
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => update("pains", form.pains.filter((_, j) => j !== i))}
                    className="px-3 text-white/50 hover:text-red"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => update("pains", [...form.pains, ""])}
                className="text-xs text-ac hover:text-neon"
              >
                + 追加
              </button>
            </div>
          </Field>
        )}

        {step === 3 && (
          <>
            <Field label="自由記述（営業トーク・反論対応など）">
              <textarea
                rows={6}
                value={form.free_text}
                onChange={(e) => update("free_text", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="NGワード">
              <input
                type="text"
                value={form.ng_words}
                onChange={(e) => update("ng_words", e.target.value)}
                placeholder="カンマ区切り"
                className="input"
              />
            </Field>
          </>
        )}

        {step === 4 && (
          <div className="space-y-3 text-sm">
            <Summary label="商材名" value={form.name} />
            <Summary label="カテゴリ" value={form.category} />
            <Summary label="価格" value={form.price} />
            <Summary label="強み" value={form.strengths.slice(0, 100)} />
            <Summary label="ペイン" value={form.pains.filter(Boolean).join(" / ")} />
          </div>
        )}
      </div>

      {error && <div className="text-xs text-red">{error}</div>}

      <div className="flex justify-between">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="px-4 py-2 text-sm text-white/60 hover:text-white disabled:opacity-30"
        >
          ← 戻る
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 0 && !form.name}
            className="px-5 py-2 bg-ac hover:bg-neon text-black text-sm font-semibold rounded-lg disabled:opacity-30"
          >
            次へ →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-ac hover:bg-neon text-black text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {submitting ? "登録中..." : "登録する"}
          </button>
        )}
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

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/5 pb-2">
      <span className="text-white/50 text-xs">{label}</span>
      <span className="text-white/90 text-right max-w-[60%] truncate">{value || "—"}</span>
    </div>
  );
}
