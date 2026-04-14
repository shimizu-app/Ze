import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/auth/demo
 *
 * Provisions a throwaway demo user + account in one round trip so the
 * landing page can drop visitors straight into the app without an
 * email verification dance. Uses service_role to bypass RLS and the
 * "confirm email" setting.
 *
 * Returns { email, password } which the client then feeds into
 * signInWithPassword to establish a browser session.
 */
export async function POST() {
  const supabase = createServiceClient();

  // Unique-ish identifier (timestamp + random hex chunk).
  const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const email = `demo-${token}@salesailab.local`;
  const password = `Demo!${token}${Math.random().toString(36).slice(2, 8)}`;

  // Create user with email already confirmed so signInWithPassword works.
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

  // Create the paired account row.
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

  // Stamp user_metadata.account_id so RLS helpers pick it up.
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { account_id: account.id, demo: true },
  });

  return NextResponse.json({ email, password });
}
