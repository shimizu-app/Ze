import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiEmbed } from "@/lib/gemini";
import { buildProductText } from "@/lib/prompt-builder";

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ products: data });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const accountId = user.user_metadata?.account_id as string | undefined;
  if (!accountId) return NextResponse.json({ error: "no account" }, { status: 400 });

  const body = await req.json();
  const insert = {
    account_id: accountId,
    name: body.name as string,
    category: body.category ?? null,
    price: body.price ?? null,
    strengths: body.strengths ?? null,
    pains: (body.pains ?? null) as string[] | null,
    free_text: body.free_text ?? null,
    ng_words: body.ng_words ?? null,
  };

  // 1. Insert product
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert(insert)
    .select()
    .single();
  if (productError) return NextResponse.json({ error: productError.message }, { status: 400 });

  // 2. Build doc text + embed + insert into documents
  try {
    const text = buildProductText(product);
    const embedding = await geminiEmbed(text);
    const { error: docError } = await supabase.from("documents").insert({
      account_id: accountId,
      product_id: product.id,
      content: text,
      embedding: `[${embedding.join(",")}]`,
      metadata: { product_name: product.name },
    });
    if (docError) {
      console.error("[products] document insert failed", docError);
    }
    // Also store embedding on the product row
    await supabase
      .from("products")
      .update({ embedding: `[${embedding.join(",")}]` })
      .eq("id", product.id);
  } catch (err) {
    console.error("[products] embedding generation failed", err);
    // Non-fatal - product is still created
  }

  // 3. Phase 9D: precompute embeddings for common FAQ patterns so
  //    the meet room can short-circuit RAG lookups on the most
  //    frequent questions. Fire-and-forget — failures are logged
  //    but don't block product creation.
  void precomputeFaqCache(product.id, accountId, product.name, supabase).catch((err) => {
    console.error("[products] faq precompute failed", err);
  });

  return NextResponse.json({ product });
}

const COMMON_FAQ_TEMPLATES = [
  "料金はいくらですか？",
  "他社と比べてどうですか？",
  "導入期間はどのくらいですか？",
  "セキュリティは大丈夫ですか？",
  "無料トライアルはありますか？",
  "どんな業界で使えますか？",
  "サポート体制はどうなっていますか？",
  "解約はいつでもできますか？",
];

async function precomputeFaqCache(
  productId: string,
  accountId: string,
  productName: string,
  supabase: ReturnType<typeof createClient>
) {
  // Embed each FAQ question in parallel and upsert into question_cache.
  const rows = await Promise.all(
    COMMON_FAQ_TEMPLATES.map(async (question) => {
      try {
        const embedding = await geminiEmbed(question);
        return {
          account_id: accountId,
          product_id: productId,
          question,
          answer_hint: `${productName} について: ${question}`,
          embedding: `[${embedding.join(",")}]`,
        };
      } catch (err) {
        console.error("[faq precompute] embed failed", err);
        return null;
      }
    })
  );
  const valid = rows.filter((r): r is NonNullable<typeof r> => r !== null);
  if (valid.length === 0) return;
  await supabase.from("question_cache").insert(valid);
}
