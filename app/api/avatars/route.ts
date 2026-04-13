import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiGenerate } from "@/lib/gemini";
import { buildAvatarPromptRequest } from "@/lib/prompt-builder";

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("avatars")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ avatars: data });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const accountId = user.user_metadata?.account_id as string | undefined;
  if (!accountId) return NextResponse.json({ error: "no account" }, { status: 400 });

  const body = await req.json();
  const productIds: string[] = body.product_ids ?? [];

  // Fetch linked products (for prompt generation)
  let products: { name: string }[] = [];
  if (productIds.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("name")
      .in("id", productIds);
    products = data ?? [];
  }

  // Generate system prompt with Gemini
  let systemPrompt = "";
  try {
    const promptRequest = buildAvatarPromptRequest(
      {
        name: body.name,
        role: body.role,
        voice_tone: body.voice_tone,
        character_notes: body.character_notes,
        goal: body.goal,
        pain_focus: body.pain_focus,
        strength_order: body.strength_order,
      },
      products
    );
    systemPrompt = await geminiGenerate(promptRequest);
  } catch (err) {
    console.error("[avatars] prompt generation failed", err);
    systemPrompt = `あなたは${body.name}という${body.role}です。`;
  }

  const { data: avatar, error } = await supabase
    .from("avatars")
    .insert({
      account_id: accountId,
      name: body.name,
      heygen_avatar_id: body.heygen_avatar_id,
      role: body.role,
      voice_tone: body.voice_tone ?? null,
      language: body.language ?? "ja",
      trigger_condition: body.trigger_condition ?? null,
      character_notes: body.character_notes ?? null,
      product_ids: productIds.length > 0 ? productIds : null,
      pain_focus: body.pain_focus ?? null,
      strength_order: body.strength_order ?? null,
      goal: body.goal ?? null,
      system_prompt: systemPrompt,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ avatar });
}
