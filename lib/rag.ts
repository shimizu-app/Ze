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

interface RagContext {
  accountId: string;
  avatar: AvatarLite | null;
  product: ProductLite | null;
}

/**
 * Load the meeting and its linked avatar/product using the service-role
 * client so that anonymous guests can still access the relevant data
 * through a server-side indirection.
 */
export async function loadMeetingContext(roomId: string): Promise<
  | { meeting: { id: string; account_id: string; mode: string; status: string | null }; context: RagContext }
  | null
> {
  const supabase = createServiceClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, account_id, mode, status, avatar_id, product_id")
    .eq("room_id", roomId)
    .maybeSingle();
  if (!meeting) return null;

  const [{ data: avatar }, { data: product }] = await Promise.all([
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
    },
  };
}

/**
 * Generate a response from Gemini using RAG-retrieved documents plus
 * the avatar's system prompt and the running conversation history.
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
  const supabase = createServiceClient();

  // 1. Retrieve relevant documents for the user's latest utterance.
  let retrieved: string[] = [];
  try {
    const embedding = await geminiEmbed(userText);
    const { data: matches } = await supabase.rpc("match_documents", {
      query_embedding: `[${embedding.join(",")}]` as unknown as string,
      match_threshold: 0.6,
      match_count: 5,
      filter_account_id: context.accountId,
    });
    if (Array.isArray(matches)) {
      retrieved = matches
        .map((m: { content?: string }) => m.content)
        .filter((c): c is string => Boolean(c));
    }
  } catch (err) {
    console.error("[rag] retrieval failed", err);
  }

  // 2. Build the final prompt.
  const systemPrompt =
    context.avatar?.system_prompt?.trim() ||
    `あなたは${context.avatar?.name ?? "営業担当"}というAI営業アバターです。丁寧で自然な日本語で会話してください。`;

  const productBlock = context.product
    ? `# 担当商材\n- 名前: ${context.product.name}\n- 強み: ${context.product.strengths ?? "不明"}\n- ターゲットペイン: ${(context.product.pains ?? []).join(", ") || "不明"}`
    : "";

  const contextBlock =
    retrieved.length > 0
      ? `# 参考ドキュメント\n${retrieved.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")}`
      : "";

  const historyBlock = history
    .slice(-10)
    .map((t) => `${t.role === "user" ? "相手" : "あなた"}: ${t.text}`)
    .join("\n");

  const prompt = `${systemPrompt}

${productBlock}

${contextBlock}

# これまでの会話
${historyBlock || "(まだありません)"}

# 相手の最新発言
${userText}

# 指示
上記を踏まえ、営業アバターとして自然な一言で返答してください。
長すぎず、相手が返しやすい返事にしてください。前置きや「了解しました」などは不要です。`;

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
 * Performs the same RAG retrieval + prompt build, but yields Gemini's
 * output as partial text chunks so the client can start speaking the
 * first sentence as soon as it's available.
 */
export async function* generateAvatarResponseStream({
  userText,
  history,
  context,
}: {
  userText: string;
  history: TurnMessage[];
  context: RagContext;
}): AsyncGenerator<string> {
  const supabase = createServiceClient();

  // 1. Retrieve relevant documents for the user's latest utterance.
  let retrieved: string[] = [];
  try {
    const embedding = await geminiEmbed(userText);
    const { data: matches } = await supabase.rpc("match_documents", {
      query_embedding: `[${embedding.join(",")}]` as unknown as string,
      match_threshold: 0.6,
      match_count: 5,
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

  const systemPrompt =
    context.avatar?.system_prompt?.trim() ||
    `あなたは${context.avatar?.name ?? "営業担当"}というAI営業アバターです。丁寧で自然な日本語で会話してください。`;

  const productBlock = context.product
    ? `# 担当商材\n- 名前: ${context.product.name}\n- 強み: ${context.product.strengths ?? "不明"}\n- ターゲットペイン: ${(context.product.pains ?? []).join(", ") || "不明"}`
    : "";

  const contextBlock =
    retrieved.length > 0
      ? `# 参考ドキュメント\n${retrieved.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")}`
      : "";

  const historyBlock = history
    .slice(-10)
    .map((t) => `${t.role === "user" ? "相手" : "あなた"}: ${t.text}`)
    .join("\n");

  const prompt = `${systemPrompt}

${productBlock}

${contextBlock}

# これまでの会話
${historyBlock || "(まだありません)"}

# 相手の最新発言
${userText}

# 指示
上記を踏まえ、営業アバターとして自然な一言で返答してください。
長すぎず、相手が返しやすい返事にしてください。前置きや「了解しました」などは不要です。`;

  try {
    for await (const chunk of geminiGenerateStream(prompt)) {
      yield chunk;
    }
  } catch (err) {
    console.error("[rag-stream] generation failed", err);
    yield "申し訳ありません、ただいま回線が不安定です。もう一度お願いできますか？";
  }
}
