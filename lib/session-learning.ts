import { groqChat, type GroqMessage } from "@/lib/groq";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Persona / emotion / pain / hot-topic tracker updated turn-by-turn
 * from interim Deepgram transcripts. The heavy Gemini prompt injects
 * the latest snapshot so later turns can reference the persona-
 * specific framing automatically.
 *
 * Each field is capped to 5 entries so we don't balloon the Gemini
 * prompt over time.
 */

export interface SessionLearning {
  persona: string | null; // engineer | executive | staff | unknown
  communication_type: string | null; // logical | emotional
  current_emotion: string | null; // anxious | interested | rushed | neutral
  pain_points: string[];
  hot_topics: string[];
  objections: string[];
  updated_at: string;
}

export const EMPTY_LEARNING: SessionLearning = {
  persona: null,
  communication_type: null,
  current_emotion: null,
  pain_points: [],
  hot_topics: [],
  objections: [],
  updated_at: new Date(0).toISOString(),
};

/**
 * Run a very small Groq classification call on a single interim
 * utterance. Returns a partial delta; we merge that into the
 * running SessionLearning snapshot.
 */
export async function analyzeUtterance(text: string): Promise<Partial<SessionLearning>> {
  if (!text.trim()) return {};

  const messages: GroqMessage[] = [
    {
      role: "system",
      content:
        "あなたは営業の発話から相手のペルソナと状態を一瞬で判定するアナリストです。以下の JSON スキーマのみで返答してください。余計な前置き禁止。",
    },
    {
      role: "user",
      content: `以下の相手の発話から状態を判定し、JSON で返してください。値が判定できなければ null にしてください。

フィールド:
- persona: "engineer" | "executive" | "staff" | null
- communication_type: "logical" | "emotional" | null
- current_emotion: "anxious" | "interested" | "rushed" | "neutral" | null
- pain_point: 具体的なペイン (最大25字) または null
- hot_topic: 強い関心を示したトピック (最大25字) または null
- objection: 出た懸念・反論 (最大25字) または null

相手の発話:
"""${text.slice(0, 400)}"""`,
    },
  ];

  try {
    const raw = await groqChat(messages, {
      temperature: 0.2,
      max_tokens: 200,
      response_format: "json_object",
    });
    const parsed = JSON.parse(raw) as Partial<SessionLearning> & {
      pain_point?: string | null;
      hot_topic?: string | null;
      objection?: string | null;
    };

    const delta: Partial<SessionLearning> = {};
    if (parsed.persona) delta.persona = parsed.persona;
    if (parsed.communication_type) delta.communication_type = parsed.communication_type;
    if (parsed.current_emotion) delta.current_emotion = parsed.current_emotion;
    if (parsed.pain_point) delta.pain_points = [parsed.pain_point];
    if (parsed.hot_topic) delta.hot_topics = [parsed.hot_topic];
    if (parsed.objection) delta.objections = [parsed.objection];
    return delta;
  } catch (err) {
    console.error("[session-learning] analyze failed", err);
    return {};
  }
}

/**
 * Merge a delta into the existing learning snapshot. Deduplicates
 * arrays and keeps only the last 5 entries per list.
 */
export function mergeLearning(
  prev: SessionLearning | null | undefined,
  delta: Partial<SessionLearning>
): SessionLearning {
  const base: SessionLearning = prev
    ? { ...EMPTY_LEARNING, ...prev, updated_at: prev.updated_at ?? new Date(0).toISOString() }
    : { ...EMPTY_LEARNING };

  const next: SessionLearning = {
    ...base,
    persona: delta.persona ?? base.persona,
    communication_type: delta.communication_type ?? base.communication_type,
    current_emotion: delta.current_emotion ?? base.current_emotion,
    pain_points: mergeUnique(base.pain_points, delta.pain_points ?? [], 5),
    hot_topics: mergeUnique(base.hot_topics, delta.hot_topics ?? [], 5),
    objections: mergeUnique(base.objections, delta.objections ?? [], 5),
    updated_at: new Date().toISOString(),
  };
  return next;
}

function mergeUnique(existing: string[], additions: string[], max: number): string[] {
  const seen = new Set(existing);
  const out = [...existing];
  for (const item of additions) {
    if (!item || seen.has(item)) continue;
    out.push(item);
    seen.add(item);
  }
  return out.slice(-max);
}

/**
 * Persist the learning snapshot to the active conversation row for
 * this meeting.
 */
export async function persistLearning(
  meetingId: string,
  learning: SessionLearning
): Promise<void> {
  const supabase = createServiceClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!conversation?.id) return;

  await supabase
    .from("conversations")
    .update({ learning: learning as unknown as Record<string, unknown> })
    .eq("id", conversation.id);
}

/**
 * Load the latest learning snapshot for a meeting (used by /api/rag
 * when building the Gemini prompt).
 */
export async function loadLatestLearning(
  meetingId: string
): Promise<SessionLearning | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("conversations")
    .select("learning")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const learning = (data as { learning?: SessionLearning } | null)?.learning ?? null;
  if (!learning) return null;
  return { ...EMPTY_LEARNING, ...learning };
}
