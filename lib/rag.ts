import { geminiEmbed, geminiGenerate, geminiGenerateStream } from "@/lib/gemini";
import { createServiceClient } from "@/lib/supabase/service";

export interface TurnMessage {
  role: "user" | "assistant";
  text: string;
}

interface AvatarLite {
  name: string;
  role: string;
  system_prompt: string | null;
  goal: string | null;
  character_notes: string | null;
}

interface ProductLite {
  name: string;
  strengths: string | null;
  pains: string[] | null;
}

export interface SessionLearning {
  persona?: string | null;
  communication_type?: string | null;
  current_emotion?: string | null;
  pain_points?: string[] | null;
  hot_topics?: string[] | null;
  objections?: string[] | null;
}

export interface RagContext {
  accountId: string;
  avatar: AvatarLite | null;
  product: ProductLite | null;
  /** Latest session-level learning derived from Groq interim analysis. */
  learning?: SessionLearning | null;
}

/**
 * Load the meeting and its linked avatar/product using the service-role
 * client so that anonymous guests can still access the relevant data
 * through a server-side indirection.
 */
export async function loadMeetingContext(roomId: string): Promise<
  | {
      meeting: { id: string; account_id: string; mode: string; status: string | null };
      context: RagContext;
    }
  | null
> {
  const supabase = createServiceClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, account_id, mode, status, avatar_id, product_id")
    .eq("room_id", roomId)
    .maybeSingle();
  if (!meeting) return null;

  // Fetch avatar, product, AND the latest conversation learning in parallel.
  const [{ data: avatar }, { data: product }, { data: conversation }] = await Promise.all([
    meeting.avatar_id
      ? supabase
          .from("avatars")
          .select("name, role, system_prompt, goal, character_notes")
          .eq("id", meeting.avatar_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    meeting.product_id
      ? supabase
          .from("products")
          .select("name, strengths, pains")
          .eq("id", meeting.product_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("conversations")
      .select("learning")
      .eq("meeting_id", meeting.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    meeting: {
      id: meeting.id,
      account_id: meeting.account_id,
      mode: meeting.mode,
      status: meeting.status,
    },
    context: {
      accountId: meeting.account_id,
      avatar: avatar as AvatarLite | null,
      product: product as ProductLite | null,
      learning: (conversation as { learning?: SessionLearning } | null)?.learning ?? null,
    },
  };
}

/**
 * Retrieve top-K RAG documents for the given user utterance. Returns
 * a list of plain strings plus the raw embedding so the caller can
 * reuse it (e.g. for debugging / logging).
 *
 * `match_count` defaults to 3 (Phase 9C prompt shortening — cutting
 * from 5 to 3 shaves tokens and helps Gemini first-token latency).
 */
export async function retrieveDocs(
  userText: string,
  accountId: string,
  matchCount = 3
): Promise<{ docs: string[]; embedding: number[] | null }> {
  const supabase = createServiceClient();
  try {
    const embedding = await geminiEmbed(userText);
    const { data: matches } = await supabase.rpc("match_documents", {
      query_embedding: `[${embedding.join(",")}]` as unknown as string,
      match_threshold: 0.6,
      match_count: matchCount,
      filter_account_id: accountId,
    });
    const docs = Array.isArray(matches)
      ? matches
          .map((m: { content?: string }) => m.content)
          .filter((c): c is string => Boolean(c))
      : [];
    return { docs, embedding };
  } catch (err) {
    console.error("[rag] retrieval failed", err);
    return { docs: [], embedding: null };
  }
}

/**
 * Build the Gemini prompt. The block order is intentional:
 *
 *   1. systemPrompt           ← stable per session → implicit cache target
 *   2. productBlock           ← stable per session → implicit cache target
 *   3. learningBlock          ← changes slowly over the session
 *   4. ragBlock (top-3)       ← changes every turn
 *   5. historyBlock (last 5)  ← changes every turn
 *   6. userText               ← the new question
 *
 * Putting the long, stable chunks first maximises Gemini's implicit
 * prompt cache hit rate on the free tier (Google automatically caches
 * shared prefixes). Once we upgrade to paid we can switch to explicit
 * caches.create and feed stages 1+2 via cachedContent — the rest of
 * the prompt is already structured to drop in without reshuffling.
 */
export function buildRagPrompt({
  userText,
  history,
  context,
  retrieved,
}: {
  userText: string;
  history: TurnMessage[];
  context: RagContext;
  retrieved: string[];
}): string {
  const systemPrompt =
    context.avatar?.system_prompt?.trim() ||
    `あなたは${context.avatar?.name ?? "営業担当"}というAI営業アバターです。丁寧で自然な日本語で会話してください。`;

  const productBlock = context.product
    ? `# 担当商材
- 名前: ${context.product.name}
- 強み: ${context.product.strengths ?? "不明"}
- ターゲットペイン: ${(context.product.pains ?? []).join(", ") || "不明"}`
    : "";

  // Learning block — injected when Groq interim analysis has produced anything useful.
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
      ? `# 現在の相手の状態\n${learningLines.join("\n")}\n
# 返答方針
- ペルソナが engineer なら技術的に、executive なら数字と ROI で話す
- 感情が anxious なら共感から入る、rushed なら短く返す`
      : "";

  const contextBlock =
    retrieved.length > 0
      ? `# 参考ドキュメント\n${retrieved.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")}`
      : "";

  // Phase 9C: history 10 → 5 turns
  const historyBlock = history
    .slice(-5)
    .map((t) => `${t.role === "user" ? "相手" : "あなた"}: ${t.text}`)
    .join("\n");

  return [
    systemPrompt,
    productBlock,
    learningBlock,
    contextBlock,
    `# これまでの会話\n${historyBlock || "(まだありません)"}`,
    `# 相手の最新発言\n${userText}`,
    `# 指示
上記を踏まえ、営業アバターとして自然な一言で返答してください。
長すぎず、相手が返しやすい返事にしてください。前置きや「了解しました」などは不要です。`,
  ]
    .filter((block) => block.trim())
    .join("\n\n");
}

/**
 * Non-streaming response generator. Kept for internal callers that
 * still want a single Promise.
 */
export async function generateAvatarResponse({
  userText,
  history,
  context,
}: {
  userText: string;
  history: TurnMessage[];
  context: RagContext;
}): Promise<string> {
  const { docs } = await retrieveDocs(userText, context.accountId);
  const prompt = buildRagPrompt({ userText, history, context, retrieved: docs });
  try {
    const response = await geminiGenerate(prompt);
    return response.trim() || "申し訳ありません、もう一度お願いできますか？";
  } catch (err) {
    console.error("[rag] generation failed", err);
    return "申し訳ありません、ただいま回線が不安定です。もう一度お願いできますか？";
  }
}

/**
 * Streaming version of generateAvatarResponse.
 *
 * Phase 9A parallelisation: the caller is expected to have already
 * loaded the meeting context in parallel with the embedding retrieval.
 * If a prefetched embedding is supplied we skip the geminiEmbed() call
 * entirely — the interim-handler on the client will have fired the
 * embedding request while the user was still speaking.
 *
 * Phase 10: maxOutputTokens lets the caller clamp Gemini's reply to
 * the per-phase budget (40 / 100 / 120 / 200 etc.). cachedContent
 * forwards the paid-tier CachedContent name when available.
 */
export async function* generateAvatarResponseStream({
  userText,
  history,
  context,
  prefetchedEmbedding,
  maxOutputTokens,
  cachedContent,
}: {
  userText: string;
  history: TurnMessage[];
  context: RagContext;
  prefetchedEmbedding?: number[];
  maxOutputTokens?: number;
  cachedContent?: string;
}): AsyncGenerator<string> {
  const supabase = createServiceClient();

  // 1. Retrieve relevant documents for the user's latest utterance.
  let retrieved: string[] = [];
  try {
    const embedding = prefetchedEmbedding ?? (await geminiEmbed(userText));
    const { data: matches } = await supabase.rpc("match_documents", {
      query_embedding: `[${embedding.join(",")}]` as unknown as string,
      match_threshold: 0.6,
      match_count: 3,
      filter_account_id: context.accountId,
    });
    if (Array.isArray(matches)) {
      retrieved = matches
        .map((m: { content?: string }) => m.content)
        .filter((c): c is string => Boolean(c));
    }
  } catch (err) {
    console.error("[rag-stream] retrieval failed", err);
  }

  const prompt = buildRagPrompt({ userText, history, context, retrieved });

  try {
    for await (const chunk of geminiGenerateStream(prompt, { maxOutputTokens, cachedContent })) {
      yield chunk;
    }
  } catch (err) {
    console.error("[rag-stream] generation failed", err);
    yield "申し訳ありません、ただいま回線が不安定です。もう一度お願いできますか？";
  }
}
