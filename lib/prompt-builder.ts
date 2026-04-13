import type { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Avatar = Database["public"]["Tables"]["avatars"]["Row"];

/**
 * Converts a product record into a natural-language document for embedding.
 */
export function buildProductText(p: Product | Database["public"]["Tables"]["products"]["Insert"]): string {
  const parts: string[] = [];
  parts.push(`商材名: ${p.name}`);
  if (p.category) parts.push(`カテゴリ: ${p.category}`);
  if (p.price) parts.push(`価格: ${p.price}`);
  if (p.strengths) parts.push(`強み・差別化ポイント:\n${p.strengths}`);
  if (p.pains && p.pains.length) parts.push(`解決するペイン:\n- ${p.pains.join("\n- ")}`);
  if (p.free_text) parts.push(`補足情報:\n${p.free_text}`);
  if (p.ng_words) parts.push(`NGワード: ${p.ng_words}`);
  return parts.join("\n\n");
}

/**
 * Builds a Gemini prompt that generates a system prompt for an avatar
 * based on its intake data and linked products.
 */
export function buildAvatarPromptRequest(avatar: {
  name: string;
  role: string;
  voice_tone?: string | null;
  character_notes?: string | null;
  goal?: string | null;
  pain_focus?: string[] | null;
  strength_order?: string[] | null;
}, products: Pick<Product, "name">[]): string {
  return `以下のアバター設定から、日本語で話すAI営業アバターの「システムプロンプト」を生成してください。
出力はそのままLLMに渡せる形（前置きや説明は不要）でお願いします。

# アバター設定
- 名前: ${avatar.name}
- 役割: ${avatar.role}
- 声のトーン: ${avatar.voice_tone ?? "未指定"}
- キャラクター: ${avatar.character_notes ?? "未指定"}
- 会話のゴール: ${avatar.goal ?? "未指定"}
- ターゲットペイン: ${(avatar.pain_focus ?? []).join(", ") || "未指定"}
- 強みの優先順: ${(avatar.strength_order ?? []).join(" → ") || "未指定"}
- 担当商材: ${products.map((p) => p.name).join(", ") || "未指定"}

# 出力フォーマット
あなたは{名前}という{役割}です。
（以下、トーン・ゴール・会話時の注意点・NG事項などを自然な文章で記述）
`;
}
