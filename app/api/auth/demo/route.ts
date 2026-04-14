import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { geminiEmbed } from "@/lib/gemini";
import { listHeyGenAvatars, type HeyGenAvatar } from "@/lib/heygen";
import { randomRoomId } from "@/lib/utils";
import {
  SALES_AI_LAB_KNOWLEDGE,
  SELF_DEMO_AVATAR_SYSTEM_PROMPT,
} from "@/lib/seed/sales-ai-lab-knowledge";

/**
 * Prefer a professional-looking human avatar for the self-demo so
 * visitors see a business persona ("ソラ") instead of whatever happens
 * to sit at index 0 of the catalog (which has been landing on Santa
 * and other holiday / cartoon characters).
 */
function pickBusinessAvatar(list: HeyGenAvatar[]): HeyGenAvatar | null {
  const PROFESSIONAL_HINTS = [
    "business",
    "professional",
    "suit",
    "office",
    "corporate",
    "formal",
    "executive",
    "consultant",
    "sales",
    "manager",
    "banker",
    "lawyer",
    "hr",
    "receptionist",
    "anchor",
    "presenter",
    "ceo",
    "host",
    "spokesperson",
  ];
  const AVOID_HINTS = [
    "santa",
    "xmas",
    "christmas",
    "halloween",
    "pumpkin",
    "witch",
    "zombie",
    "vampire",
    "dragon",
    "monster",
    "alien",
    "rabbit",
    "bunny",
    "cat",
    "dog",
    "bear",
    "panda",
    "fox",
    "cartoon",
    "anime",
    "chibi",
    "costume",
    "mascot",
    "robot",
    "kid",
    "child",
    "baby",
  ];

  const withPreview = list.filter((a) => a.preview_image_url);
  const safe = withPreview.filter(
    (a) => !AVOID_HINTS.some((h) => a.avatar_name.toLowerCase().includes(h))
  );

  // First preference: safe + professional name hint
  const professional = safe.find((a) =>
    PROFESSIONAL_HINTS.some((h) => a.avatar_name.toLowerCase().includes(h))
  );
  if (professional) return professional;

  // Second preference: any safe avatar with a preview image
  if (safe.length > 0) return safe[0];

  // Third: any avatar with a preview
  if (withPreview.length > 0) return withPreview[0];

  return null;
}

/**
 * POST /api/auth/demo
 *
 * Provisions a throwaway demo workspace AND seeds it with everything
 * the visitor needs to land directly in a live conversation with a
 * Sales AI Lab guide avatar:
 *
 * 1. demo user (email_confirm: true so login works without email)
 * 2. accounts row "Demo Company"
 * 3. "Sales AI Lab" product seeded with the platform's own knowledge
 *    base, embedded into the documents table for RAG
 * 4. "ソラ" guide avatar using the first available HeyGen avatar id
 * 5. "Self Demo" meeting that points at that avatar
 *
 * Returns { email, password, room_id }. The /login page calls this,
 * signs in, then redirects straight to /meet/[room_id].
 *
 * Failures past the user creation are non-fatal — we still hand back
 * email/password so the user lands on /home as a safety net.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const requestedPipeline =
    body.pipeline === "browser_tts" ? "browser_tts" : "liveavatar";

  const supabase = createServiceClient();

  const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const email = `demo-${token}@salesailab.local`;
  const password = `Demo!${token}${Math.random().toString(36).slice(2, 8)}`;

  // 1. Create user with email already confirmed.
  const { data: createRes, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !createRes?.user) {
    return NextResponse.json(
      { error: createError?.message ?? "failed to create demo user" },
      { status: 500 }
    );
  }
  const userId = createRes.user.id;

  // 2. Create paired account.
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .insert({ name: "Demo Company", owner_user_id: userId })
    .select("id")
    .single();

  if (accountError || !account) {
    return NextResponse.json(
      { error: accountError?.message ?? "failed to create demo account" },
      { status: 500 }
    );
  }
  const accountId = account.id as string;

  // 3. Stamp user_metadata.account_id.
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { account_id: accountId, demo: true },
  });

  // From here on, errors are logged but don't block the demo from
  // returning credentials — the user can still poke around /home.
  let roomId: string | null = null;
  try {
    // 4. Seed the Sales AI Lab product + RAG document.
    const { data: product } = await supabase
      .from("products")
      .insert({
        account_id: accountId,
        name: "Sales AI Lab",
        category: "SaaS",
        price: "月額5万円〜",
        strengths: "AI アバターによる無人商談、RAG ベースの商材説明、リアルタイム原因分析",
        pains: ["営業人員不足", "リード対応の遅延", "商談品質のばらつき", "夜間休日のリード取りこぼし"],
        free_text: "ボタン1つで会議リンクを発行し、AI アバターが商談する SaaS",
      })
      .select("id")
      .single();

    if (product?.id) {
      try {
        const embedding = await geminiEmbed(SALES_AI_LAB_KNOWLEDGE);
        await supabase.from("documents").insert({
          account_id: accountId,
          product_id: product.id,
          content: SALES_AI_LAB_KNOWLEDGE,
          embedding: `[${embedding.join(",")}]`,
          metadata: { product_name: "Sales AI Lab", source: "self-demo-seed" },
        });
      } catch (err) {
        console.error("[demo] embedding seed failed", err);
      }
    }

    // 5. Pick a HeyGen avatar from the catalog, preferring professional
    //    human-looking ones (business, office, suit...) and filtering
    //    out holiday/cartoon characters (santa, pumpkin, dragon...).
    let heygenAvatarId = process.env.NEXT_PUBLIC_HEYGEN_DEFAULT_AVATAR ?? "";
    try {
      const avatars = await listHeyGenAvatars();
      const first = pickBusinessAvatar(avatars) ?? avatars.find((a) => a.preview_image_url) ?? avatars[0];
      if (first) heygenAvatarId = first.avatar_id;
    } catch (err) {
      console.error("[demo] heygen list failed", err);
    }

    // 6. Create the guide avatar (only if we have a HeyGen avatar id).
    let avatarRowId: string | null = null;
    if (heygenAvatarId) {
      const { data: avatarRow } = await supabase
        .from("avatars")
        .insert({
          account_id: accountId,
          name: "ソラ",
          heygen_avatar_id: heygenAvatarId,
          voice_id: process.env.NEXT_PUBLIC_HEYGEN_DEFAULT_VOICE || null,
          role: "explain",
          voice_tone: "明るく落ち着いた、案内人のような口調",
          language: "ja",
          character_notes: "Sales AI Lab のプロダクトガイド。プロフェッショナルだが親しみやすい",
          product_ids: product?.id ? [product.id] : null,
          pain_focus: ["営業人員不足", "リード取りこぼし"],
          strength_order: ["即時応答", "RAG精度", "原因分析"],
          goal: "無料トライアル登録または個別商談予約",
          system_prompt: SELF_DEMO_AVATAR_SYSTEM_PROMPT,
        })
        .select("id")
        .single();
      avatarRowId = avatarRow?.id ?? null;
    }

    // 7. Create the demo meeting.
    roomId = randomRoomId();
    await supabase.from("meetings").insert({
      account_id: accountId,
      room_id: roomId,
      company_name: "Sales AI Lab Self-Demo",
      contact_name: "見学中のあなた",
      avatar_id: avatarRowId,
      product_id: product?.id ?? null,
      status: "waiting",
      mode: "ai_only",
      avatar_pipeline: requestedPipeline,
      note: `Self-demo seeded by /api/auth/demo (pipeline=${requestedPipeline})`,
    });
  } catch (err) {
    console.error("[demo] seed pipeline failed", err);
  }

  return NextResponse.json({ email, password, room_id: roomId });
}
