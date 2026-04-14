/**
 * Short conversational fillers the avatar can emit *before* the
 * downstream LLM has finished generating its reply. Shaves ~500ms
 * of perceived silence off every heavy turn because the user hears
 * a response start immediately.
 */

export type FillerBucket = "neutral" | "empathy" | "confirm" | "thinking";

const FILLERS: Record<FillerBucket, string[]> = {
  neutral: [
    "そうですね、",
    "なるほど、",
    "ええと、",
    "はい、",
  ],
  empathy: [
    "それは大切なポイントですね、",
    "おっしゃる通りで、",
    "よくわかります、",
  ],
  confirm: [
    "ちょっと確認させてください、",
    "念のため整理しますと、",
    "今おっしゃったのは、",
  ],
  thinking: [
    "少しお待ちください、",
    "考えてみますね、",
  ],
};

/**
 * Pick one filler for the given bucket. Uses a simple rotating index
 * per-bucket so we don't emit the exact same filler twice in a row.
 */
const lastIndex: Record<FillerBucket, number> = {
  neutral: -1,
  empathy: -1,
  confirm: -1,
  thinking: -1,
};

export function pickFiller(bucket: FillerBucket = "neutral"): string {
  const list = FILLERS[bucket];
  const next = (lastIndex[bucket] + 1) % list.length;
  lastIndex[bucket] = next;
  return list[next];
}

/**
 * Heuristic to pick a filler bucket based on the user's latest
 * utterance. Very cheap — purely string matching.
 */
export function pickFillerBucket(userText: string): FillerBucket {
  const t = userText.trim();
  if (!t) return "neutral";
  if (/[困大変苦厳]/.test(t) || /(忙しい|時間がない|難しい)/.test(t)) return "empathy";
  if (/[?？]$/.test(t) && t.length > 20) return "confirm";
  if (/(考え|思い|検討|比較)/.test(t)) return "thinking";
  return "neutral";
}
