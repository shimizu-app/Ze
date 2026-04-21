/**
 * Phase 11 conversation-phase router.
 *
 * Previous phases tried to pick a provider (Groq vs Gemini) from a
 * keyword-matched intent at classify time. That fought the phase
 * logic: an objection-phase "ちょっと高い" would get SHORT-classified
 * as light and routed to Groq, but objection work needs the richer
 * Gemini prompt. We've collapsed intent to two values and let the
 * phase alone decide the token budget. The provider choice is now
 * handled by lib/llm.ts (Groq primary, Gemini fallback).
 *
 * - "script"  → /api/rag plays the next avatars.script_lines entry
 *               straight back. Zero LLM, ~0ms.
 * - "unified" → /api/rag calls callLLM() with the phase-specific
 *               token cap and the shared prompts from lib/prompts.ts.
 */

export type Intent = "script" | "unified";

export type ConversationPhase =
  | "opening"   // avatars.script_lines を順に発話 (LLM コール 0)
  | "discovery" // ヒアリング。短めの相槌 + 質問返し
  | "pitch"     // 商品説明。数字・事例で具体的に
  | "objection" // 反論対応。共感 → 代替案
  | "closing";  // クロージング。次アクション提示

const OBJECTION_KEYWORDS = /(高い|難しい|不安|困る|ちょっと|検討|別の|考え|やめて|まだ|無理|厳しい|心配|疑問)/;
const CLOSING_KEYWORDS = /(トライアル|試し|次|申込|契約|デモ|登録|始め|取り組み|前向き|やってみ|お願い|決め)/;

/**
 * Phase-specific output token budgets. Tuned to target:
 *   opening   ≈ 60字   (script lines are pre-authored, just a cap)
 *   discovery ≈ 80〜120字 (short acknowledgement + one question)
 *   pitch     ≈ 140〜180字 (concrete answer with a number or example)
 *   objection ≈ 180〜220字 (empathy + alternative)
 *   closing   ≈ 120〜160字 (single next-step proposal)
 *
 * Japanese averages roughly 1.8 tokens per character on Gemini/Groq
 * tokenisers, so the char budget ≈ tokens / 1.8.
 */
const TOKEN_LIMITS: Record<ConversationPhase, number> = {
  opening: 80,
  discovery: 180,
  pitch: 250,
  objection: 300,
  closing: 200,
};

export interface DetectPhaseArgs {
  /** Total user-side turn count so far (0 indexed = brand new meeting). */
  turnCount: number;
  /** How many script_lines remain unspoken. While >0 we stay in opening. */
  scriptLinesRemaining: number;
  /** Concatenated text of the most recent few user utterances. */
  recentUserText: string;
}

/**
 * Decide which conversation phase the meeting is currently in.
 *
 *   1. script_lines remaining  → opening
 *   2. objection keywords      → objection (overrides turn-count)
 *   3. closing keywords        → closing
 *   4. early turns (<4)        → discovery
 *   5. mid turns (4-11)        → pitch
 *   6. long meeting (12+)      → closing (winding down)
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
  /** Hard cap on LLM output tokens for this phase. */
  maxTokens: number;
}

/**
 * Map the current phase to (intent, maxTokens). Opening is the only
 * phase that bypasses the LLM entirely; everything else goes through
 * callLLM() with the per-phase budget.
 */
export function classifyWithPhase(
  _text: string,
  phase: ConversationPhase
): PhaseRouting {
  if (phase === "opening") {
    return { intent: "script", maxTokens: TOKEN_LIMITS.opening };
  }
  return { intent: "unified", maxTokens: TOKEN_LIMITS[phase] };
}
