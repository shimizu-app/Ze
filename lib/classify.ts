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

const SHORT_THRESHOLD = 8; // Phase 10.2: tighten so only truly trivial acks go to Groq

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

// =============================================================================
// Phase 10: conversation-phase aware routing
// =============================================================================

export type ConversationPhase =
  | "opening"   // 台本フェーズ。avatars.script_lines を順に発話 (LLM コール 0)
  | "discovery" // ヒアリング。intent に応じて Groq / Gemini を分ける
  | "pitch"     // 商品説明。常に Gemini で短めに
  | "objection" // 反論対応。常に Gemini で長めに、共感ベース
  | "closing";  // クロージング。常に Gemini で次アクション提示

const OBJECTION_KEYWORDS = /(高い|難しい|不安|困る|ちょっと|検討|別の|考え|やめて|まだ|無理|厳しい|心配|疑問)/;
const CLOSING_KEYWORDS = /(トライアル|試し|次|申込|契約|デモ|登録|始め|取り組み|前向き|やってみ|お願い|決め)/;

export interface DetectPhaseArgs {
  /** Total user-side turn count so far (0 indexed = brand new meeting). */
  turnCount: number;
  /** How many script_lines remain unspoken. While >0 we stay in opening. */
  scriptLinesRemaining: number;
  /** Concatenated text of the most recent few user utterances. */
  recentUserText: string;
}

/**
 * Decide which conversation phase the meeting is currently in. The
 * router is rule-based on purpose so it adds 0ms latency:
 *
 *   1. script_lines remaining  → opening
 *   2. objection keywords      → objection (overrides everything below)
 *   3. closing keywords        → closing
 *   4. early turns (<4)        → discovery
 *   5. mid turns (4-11)        → pitch
 *   6. long meeting (12+)      → closing (assume the visitor is winding down)
 */
export function detectPhase(args: DetectPhaseArgs): ConversationPhase {
  if (args.scriptLinesRemaining > 0) return "opening";

  const t = args.recentUserText ?? "";
  if (OBJECTION_KEYWORDS.test(t)) return "objection";
  if (CLOSING_KEYWORDS.test(t)) return "closing";

  if (args.turnCount < 4) return "discovery";
  if (args.turnCount < 12) return "pitch";
  return "closing";
}

export interface PhaseRouting {
  intent: Intent;
  /** Hard cap on Gemini / Groq output tokens. Keeps replies snappy. */
  maxTokens: number;
}

/**
 * Combine intent classification with the conversation phase to pick
 * which LLM bucket to use AND how long the response is allowed to be.
 *
 * - opening   → script (台本固定, 0 LLM)
 * - discovery → light/heavy as classified, short cap (40 / 100 tokens)
 * - pitch     → forced heavy, medium cap (120 tokens)
 * - objection → forced heavy, long cap (200 tokens) — empathy + push-back
 * - closing   → forced heavy, medium cap (120 tokens)
 *
 * Defaulting heavy in the substantive phases means we never accidentally
 * route a "may I ask about pricing?" through Groq just because it's
 * short — the phase wins.
 */
export function classifyWithPhase(
  text: string,
  phase: ConversationPhase
): PhaseRouting {
  const baseIntent = classifyIntent(text);

  switch (phase) {
    case "opening":
      return { intent: "script", maxTokens: 60 };
    case "discovery":
      return {
        intent: baseIntent,
        maxTokens: baseIntent === "light" ? 80 : 100, // Phase 10.2: 40→80 so Groq can finish sentences
      };
    case "pitch":
      return { intent: "heavy", maxTokens: 120 };
    case "objection":
      return { intent: "heavy", maxTokens: 200 };
    case "closing":
      return { intent: "heavy", maxTokens: 120 };
  }
}
