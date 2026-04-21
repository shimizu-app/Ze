import type { ConversationPhase } from "@/lib/classify";
import type { RagContext, TurnMessage } from "@/lib/rag";

/**
 * Phase 11: centralised prompt templates.
 *
 * The earlier route had two parallel prompt builders — `buildRagPrompt`
 * for the heavy (Gemini) branch and an inline one inside
 * `streamLightResponse` for the light (Groq) branch. They drifted:
 * the light prompt didn't know about `learning`, the heavy prompt
 * didn't vary by phase. This module gives us one system prompt
 * (phase-aware, fully populated) and one user message (history +
 * latest utterance) that both providers share via lib/llm.ts.
 *
 * File-based templating (`/prompts/*.md`) was considered and skipped
 * for Phase 11 — the added indirection wasn't worth it given how
 * rarely these strings need to change. Keep them here and iterate.
 */

const PHASE_INSTRUCTIONS: Record<ConversationPhase, string> = {
  opening: `【現在のフェーズ: オープニング】
- 挨拶と自己紹介を済ませた直後です。
- 相手を受け入れる一文 + 今日の商談の目的を端的に伝えてください。`,

  discovery: `【現在のフェーズ: ヒアリング】
- 相手の課題や状況を掘り下げる段階です。
- 短い相槌 (はい / なるほど) + 具体的な質問を1つ返してください。
- まだ商品説明に飛び込まず、相手の言葉を引き出すことを優先。`,

  pitch: `【現在のフェーズ: 商品説明】
- 相手のヒアリングが済み、具体的な価値提示をすべき段階です。
- 数字・事例・具体ユースケースで答える。抽象語 (「最適化」「効率化」) の連打は禁止。
- 「ご案内します」「お伝えします」だけの空文を返さない。必ず中身を含める。`,

  objection: `【現在のフェーズ: 反論対応】
- 相手が価格・導入難易度・不安を口にした直後です。
- まず共感の一文から入る (「そこは気になりますよね」等)。
- その上で具体的な代替案 (トライアル / 段階導入 / 成功事例) を1つ提示。
- 反論を押し返すのではなく、並走する姿勢で返す。`,

  closing: `【現在のフェーズ: クロージング】
- 次アクション (トライアル開始 / デモ予約 / 資料送付) を具体的に提案してください。
- 相手が動きやすい小さな一歩を1つだけ提示する。複数並べない。`,
};

/**
 * Build the system message that defines the avatar's role, the
 * product context, session learning, RAG documents, and the
 * phase-specific behaviour.
 *
 * Block order is intentional: stable blocks first (persona, product)
 * so Gemini's implicit prompt cache can reuse the prefix across turns.
 */
export function buildSystemPrompt(args: {
  context: RagContext;
  phase: ConversationPhase;
  retrieved: string[];
}): string {
  const { context, phase, retrieved } = args;

  const persona =
    context.avatar?.system_prompt?.trim() ||
    `あなたは${context.avatar?.name ?? "営業担当"}というAI営業アバターです。
プロフェッショナルだが親しみやすいトーンで、落ち着いた日本語で会話してください。`;

  const goal = context.avatar?.goal
    ? `\n\n# 商談ゴール\n${context.avatar.goal}`
    : "";

  const productBlock = context.product
    ? `\n\n# 担当商材
- 名前: ${context.product.name}
- 強み: ${context.product.strengths ?? "未設定"}
- ターゲットペイン: ${(context.product.pains ?? []).join(", ") || "未設定"}`
    : "";

  // Session learning — populated asynchronously by /api/learning.
  const l = context.learning;
  const learningLines: string[] = [];
  if (l?.persona) learningLines.push(`- ペルソナ: ${l.persona}`);
  if (l?.communication_type) learningLines.push(`- コミュニケーション型: ${l.communication_type}`);
  if (l?.current_emotion) learningLines.push(`- 現在の感情: ${l.current_emotion}`);
  if (l?.hot_topics && l.hot_topics.length > 0)
    learningLines.push(`- 気になっていること: ${l.hot_topics.join("、")}`);
  if (l?.pain_points && l.pain_points.length > 0)
    learningLines.push(`- ペイン: ${l.pain_points.join("、")}`);
  if (l?.objections && l.objections.length > 0)
    learningLines.push(`- 懸念事項: ${l.objections.join("、")}`);
  const learningBlock =
    learningLines.length > 0
      ? `\n\n# 現在の相手の状態\n${learningLines.join("\n")}\n\n# 返答方針\n- engineer なら技術的に、executive なら数字と ROI で話す\n- anxious なら共感から、rushed なら短く返す`
      : "";

  const ragBlock =
    retrieved.length > 0
      ? `\n\n# 参考ドキュメント\n${retrieved.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")}`
      : "";

  const phaseBlock = `\n\n${PHASE_INSTRUCTIONS[phase]}`;

  const commonRules = `\n\n# 共通ルール
- 返答は2文以内、60〜120字を目安に。長くしすぎない。
- 「了解しました」「承知しました」等の前置きは省略し、本題から入る。
- 事実として知らないことは「詳細は担当から改めてご連絡します」と素直に返す。
- 絵文字禁止。敬語は自然な範囲で。`;

  return [persona, goal, productBlock, learningBlock, ragBlock, phaseBlock, commonRules]
    .filter((s) => s && s.trim())
    .join("");
}

/**
 * Build the user-turn message: the last 8 turns of history plus the
 * latest utterance. History is capped at 8 turns because Phase 9C
 * showed 5 was too short (context loss) and 10 was too long
 * (first-token latency creep).
 */
export function buildUserMessage(args: {
  userText: string;
  history: TurnMessage[];
}): string {
  const historyLines = args.history
    .slice(-8)
    .map((t) => `${t.role === "user" ? "相手" : "あなた"}: ${t.text}`)
    .join("\n");

  return `# これまでの会話
${historyLines || "(まだありません)"}

# 相手の最新発言
${args.userText}

上記を踏まえ、自然な日本語で返答してください。`;
}
