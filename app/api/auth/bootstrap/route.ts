import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/auth/bootstrap
 * Body: { user_id, company_name }
 *
 * Called by the signup page immediately after supabase.auth.signUp().
 * Uses the service_role key to create the corresponding accounts row
 * and stamp the user's metadata with account_id — both of which would
 * otherwise be blocked by RLS (or fail outright when email
 * confirmation is on and signUp returns no session).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userId = body.user_id as string | undefined;
  const companyName = (body.company_name as string | undefined)?.trim();

  if (!userId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify the user exists.
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  // Skip if account already exists (idempotent).
  const existingMeta = (userData.user.user_metadata ?? {}) as { account_id?: string };
  if (existingMeta.account_id) {
    return NextResponse.json({ ok: true, account_id: existingMeta.account_id, existed: true });
  }

  // Create the account row.
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .insert({
      name: companyName || userData.user.email?.split("@")[0] || "New Account",
      owner_user_id: userId,
    })
    .select("id")
    .single();

  if (accountError || !account) {
    return NextResponse.json(
      { error: accountError?.message ?? "failed to create account" },
      { status: 500 }
    );
  }

  // Stamp user_metadata.account_id so the RLS helpers pick it up.
  const { error: metaError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { account_id: account.id },
  });
  if (metaError) {
    console.error("[auth bootstrap] updateUser metadata failed", metaError);
  }

  return NextResponse.json({ ok: true, account_id: account.id });
}
