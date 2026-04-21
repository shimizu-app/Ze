import { geminiEmbed } from "@/lib/gemini";
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
 * the docs plus the embedding actually used (fresh or prefetched) so
 * callers can log / reuse it.
 *
 * Phase 9A: the client-side interim handler can fire the embedding
 * request while the user is still speaking, then hand the result to
 * /api/rag. When `prefetchedEmbedding` is supplied we skip geminiEmbed.
 *
 * `matchCount` defaults to 3 (Phase 9C: 5 → 3 shaves tokens and helps
 * Gemini first-token latency).
 */
export async function retrieveDocs(
  userText: string,
  accountId: string,
  matchCount = 3,
  prefetchedEmbedding?: number[]
): Promise<{ docs: string[]; embedding: number[] | null }> {
  const supabase = createServiceClient();
  try {
    const embedding = prefetchedEmbedding ?? (await geminiEmbed(userText));
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
