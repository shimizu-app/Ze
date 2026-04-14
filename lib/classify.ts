/**
 * Rule-based intent classifier for the 3-layer LLM router.
 *
 * The whole point is zero latency — we do not call any model to
 * decide which downstream model to use. Instead we look at the
 * surface form of the user's utterance and bucket it:
 *
 * - "script"  → the meeting is in a scripted phase (e.g. opening
 *               pitch, closing). We return the next script line
 *               without calling any LLM. 0ms.
 * - "light"   → short acknowledgements / small-talk / bridging
 *               questions. Routed to Groq llama-3.3-70b for ~50ms.
 * - "heavy"   → substantive product / pricing / feature / security
 *               questions. Routed to Gemini 2.5 Flash with full RAG.
 *
 * When in doubt we return "heavy" — Gemini is the safe default for
 * anything that could affect the sale.
 */

export type Intent = "script" | "light" | "heavy";

const LIGHT_PREFIXES = [
  /^(はい|うん|ええ|そうですね|なるほど|そうなんですね|そうですか)/,
  /^(ちょっと|少し|もう少し|そうだ|たしかに|確かに)/,
  /^(じゃあ|では|それで|ところで|あの|えっと|ええと)/,
];

const LIGHT_SUFFIXES = [
  /ですか[?？]?$/,
  /でしょうか[?？]?$/,
  /ますか[?？]?$/,
  /教えてください$/,
  /聞かせてください$/,
  /いいですか[?？]?$/,
];

const HEAVY_KEYWORDS = [
  // 価格
  "料金", "値段", "価格", "費用", "お値段", "コスト", "月額", "年額", "予算",
  // 機能
  "機能", "できる", "できない", "対応", "仕様", "性能", "スペック",
  // 比較
  "他社", "競合", "比較", "違い", "メリット", "デメリット", "特徴",
  // 契約
  "契約", "導入", "スケジュール", "期間", "開始", "解約", "プラン",
  // セキュリティ
  "セキュリティ", "データ", "保護", "プライバシー", "個人情報", "GDPR",
  // 実績
  "実績", "事例", "導入先", "顧客", "成功例", "ROI", "効果",
  // トライアル
  "トライアル", "体験", "無料", "デモ", "試用", "サンプル",
  // 技術
  "API", "連携", "インテグレーション", "CRM", "Salesforce", "HubSpot",
  // サポート
  "サポート", "問い合わせ", "対応時間", "SLA",
];

const SHORT_THRESHOLD = 15; // chars

export interface ClassifyContext {
  /** True while the conversation is still playing a scripted opening / closing. */
  isInScriptPhase?: boolean;
}

/**
 * Classify a user utterance into an intent bucket. Heavy is the
 * conservative default — if we can't decide, we bounce to Gemini.
 */
export function classifyIntent(text: string, ctx: ClassifyContext = {}): Intent {
  if (ctx.isInScriptPhase) return "script";

  const trimmed = text.trim();
  if (!trimmed) return "light";

  // Obvious heavy hits: any product/pricing keyword in the text.
  const lower = trimmed.toLowerCase();
  if (HEAVY_KEYWORDS.some((kw) => trimmed.includes(kw) || lower.includes(kw.toLowerCase()))) {
    return "heavy";
  }

  // Very short acknowledgements.
  if (trimmed.length <= SHORT_THRESHOLD) {
    if (LIGHT_PREFIXES.some((re) => re.test(trimmed))) return "light";
  }

  // Light small-talk patterns (short + ends with a polite question).
  if (trimmed.length <= 40 && LIGHT_SUFFIXES.some((re) => re.test(trimmed))) {
    // If it's a short polite question but mentions nothing substantive, treat as light.
    if (!HEAVY_KEYWORDS.some((kw) => trimmed.includes(kw))) {
      return "light";
    }
  }

  // Default: treat anything longer or ambiguous as heavy.
  return "heavy";
}
