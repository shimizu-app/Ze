"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["基本", "キャラ", "商材紐付け", "ゴール", "確認"] as const;

interface Product {
  id: string;
  name: string;
}

interface FormState {
  name: string;
  heygen_avatar_id: string;
  role: "explain" | "sales" | "support";
  voice_tone: string;
  language: string;
  character_notes: string;
  product_ids: string[];
  pain_focus: string[];
  strength_order: string[];
  goal: string;
}

export function AvatarPersonaWizard({
  products,
  onDone,
}: {
  products: Product[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    name: "",
    heygen_avatar_id: "",
    role: "sales",
    voice_tone: "",
    language: "ja",
    character_notes: "",
    product_ids: [],
    pain_focus: [""],
    strength_order: [""],
    goal: "",
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
      const res = await fetch("/api/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pain_focus: form.pain_focus.filter((p) => p.trim() !== ""),
          strength_order: form.strength_order.filter((p) => p.trim() !== ""),
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
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full mono text-[11px] flex items-center justify-center ${
                i === step ? "bg-ac text-black" : i < step ? "bg-ac/30 text-ac" : "bg-s2 text-white/40"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-xs ${i === step ? "text-white" : "text-white/40"}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-s1 p-6 space-y-4 min-h-[280px]">
        {step === 0 && (
          <>
            <Field label="アバター名 *">
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="HeyGen Avatar ID *">
              <input
                value={form.heygen_avatar_id}
                onChange={(e) => update("heygen_avatar_id", e.target.value)}
                placeholder="HeyGen の Streaming Avatar ID"
                className="input mono"
              />
            </Field>
            <Field label="役割">
              <div className="flex gap-2">
                {(["explain", "sales", "support"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => update("role", r)}
                    className={`px-4 py-2 rounded-lg text-xs mono ${
                      form.role === r ? "bg-ac text-black" : "bg-s2 text-white/60"
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="声のトーン">
              <input
                value={form.voice_tone}
                onChange={(e) => update("voice_tone", e.target.value)}
                placeholder="例: 落ち着いた / 明るい / プロフェッショナル"
                className="input"
              />
            </Field>
            <Field label="キャラクター自由記述">
              <textarea
                rows={6}
                value={form.character_notes}
                onChange={(e) => update("character_notes", e.target.value)}
                placeholder="性格・口調・話し方・好きなフレーズなど"
                className="input"
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <Field label="紐づく商材（複数選択可）">
            <div className="space-y-2">
              {products.length === 0 && (
                <div className="text-xs text-white/40">先に商材を登録してください</div>
              )}
              {products.map((p) => {
                const checked = form.product_ids.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      checked ? "border-ac bg-ac/10" : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        update(
                          "product_ids",
                          checked
                            ? form.product_ids.filter((id) => id !== p.id)
                            : [...form.product_ids, p.id]
                        );
                      }}
                      className="accent-ac"
                    />
                    <span className="text-sm">{p.name}</span>
                  </label>
                );
              })}
            </div>
          </Field>
        )}

        {step === 3 && (
          <>
            <Field label="担当するペイン">
              <ArrayInput
                values={form.pain_focus}
                onChange={(v) => update("pain_focus", v)}
                placeholder="例: 人手不足"
              />
            </Field>
            <Field label="強みの優先順位">
              <ArrayInput
                values={form.strength_order}
                onChange={(v) => update("strength_order", v)}
                placeholder="例: スピード → 価格 → 品質"
              />
            </Field>
            <Field label="会話のゴール">
              <input
                value={form.goal}
                onChange={(e) => update("goal", e.target.value)}
                placeholder="例: デモ予約を取る"
                className="input"
              />
            </Field>
          </>
        )}

        {step === 4 && (
          <div className="space-y-3 text-sm">
            <Summary label="名前" value={form.name} />
            <Summary label="HeyGen ID" value={form.heygen_avatar_id} />
            <Summary label="役割" value={form.role} />
            <Summary label="トーン" value={form.voice_tone} />
            <Summary label="商材" value={`${form.product_ids.length}件`} />
            <Summary label="ゴール" value={form.goal} />
            <div className="mt-4 p-3 rounded-lg bg-ac/5 border border-ac/20 text-xs text-white/70">
              💡 登録時に Gemini がシステムプロンプトを自動生成します
            </div>
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
            disabled={step === 0 && (!form.name || !form.heygen_avatar_id)}
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
            {submitting ? "プロンプト生成中..." : "登録する"}
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

function ArrayInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={v}
            onChange={(e) => {
              const next = [...values];
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
            className="flex-1 bg-s2 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-ac"
          />
          <button
            type="button"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="px-3 text-white/50 hover:text-red"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="text-xs text-ac hover:text-neon"
      >
        + 追加
      </button>
    </div>
  );
}
