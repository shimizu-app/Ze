"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["基本", "キャラ", "商材紐付け", "ゴール", "確認"] as const;

interface Product {
  id: string;
  name: string;
}

interface FormState {
  name: string;
  heygen_avatar_id: string;
  voice_id: string;
  role: "explain" | "sales" | "support";
  voice_tone: string;
  language: string;
  character_notes: string;
  product_ids: string[];
  pain_focus: string[];
  strength_order: string[];
  goal: string;
}

interface HeyGenAvatarOption {
  avatar_id: string;
  avatar_name: string;
  gender: string | null;
  preview_image_url: string | null;
}

interface HeyGenVoiceOption {
  voice_id: string;
  name: string;
  gender: string | null;
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
    voice_id: "",
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

  // HeyGen catalog state
  const [hgAvatars, setHgAvatars] = useState<HeyGenAvatarOption[]>([]);
  const [hgVoices, setHgVoices] = useState<HeyGenVoiceOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [showManualId, setShowManualId] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const [avatarsRes, voicesRes] = await Promise.all([
          fetch("/api/heygen/avatars").then((r) => r.json()),
          fetch("/api/heygen/voices?lang=ja").then((r) => r.json()),
        ]);
        if (cancelled) return;
        if (avatarsRes.error) {
          setCatalogError(avatarsRes.error);
          setShowManualId(true);
        } else {
          setHgAvatars(avatarsRes.avatars ?? []);
        }
        if (!voicesRes.error) {
          setHgVoices(voicesRes.voices ?? []);
        }
      } catch (err) {
        if (cancelled) return;
        setCatalogError(err instanceof Error ? err.message : "load failed");
        setShowManualId(true);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

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
                placeholder="例: ハルカ"
                className="input"
              />
            </Field>

            <Field label="HeyGen アバター *">
              {catalogLoading && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[3/4] rounded-lg bg-s2 border border-white/5 animate-pulse"
                    />
                  ))}
                </div>
              )}

              {!catalogLoading && !showManualId && hgAvatars.length > 0 && (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[320px] overflow-y-auto pr-1">
                    {hgAvatars.map((a) => {
                      const selected = form.heygen_avatar_id === a.avatar_id;
                      return (
                        <button
                          key={a.avatar_id}
                          type="button"
                          onClick={() => update("heygen_avatar_id", a.avatar_id)}
                          className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition ${
                            selected
                              ? "border-ac glow-ac"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          {a.preview_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={a.preview_image_url}
                              alt={a.avatar_name}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-s2 text-3xl">
                              🎭
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 py-1.5">
                            <div className="text-[10px] text-white truncate">{a.avatar_name}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualId(true)}
                    className="text-xs text-white/40 hover:text-white/60 mt-2 mono"
                  >
                    または ID を手動入力 →
                  </button>
                </>
              )}

              {!catalogLoading && !showManualId && hgAvatars.length === 0 && !catalogError && (
                <div className="rounded-lg border border-dashed border-white/15 p-6 text-center text-xs text-white/50">
                  HeyGen アカウントに使用可能なアバターがありません。
                  HeyGen ダッシュボードでアバターを作成してから戻ってきてください。
                </div>
              )}

              {showManualId && (
                <>
                  {catalogError && (
                    <div className="text-[11px] text-amber mb-2">
                      HeyGen 取得失敗: {catalogError}
                    </div>
                  )}
                  <input
                    value={form.heygen_avatar_id}
                    onChange={(e) => update("heygen_avatar_id", e.target.value)}
                    placeholder="HeyGen Avatar ID を直接入力"
                    className="input mono"
                  />
                  {!catalogError && hgAvatars.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowManualId(false)}
                      className="text-xs text-white/40 hover:text-white/60 mt-2 mono"
                    >
                      ← ピッカーに戻る
                    </button>
                  )}
                </>
              )}
            </Field>

            <Field label="ボイス">
              {hgVoices.length > 0 ? (
                <select
                  value={form.voice_id}
                  onChange={(e) => update("voice_id", e.target.value)}
                  className="input"
                >
                  <option value="">-- デフォルト --</option>
                  {hgVoices.map((v) => (
                    <option key={v.voice_id} value={v.voice_id}>
                      {v.name}
                      {v.gender ? ` (${v.gender})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.voice_id}
                  onChange={(e) => update("voice_id", e.target.value)}
                  placeholder="HeyGen voice ID（任意）"
                  className="input mono"
                />
              )}
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
