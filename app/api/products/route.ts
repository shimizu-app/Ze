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

  return NextResponse.json({ product });
}
