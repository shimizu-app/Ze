import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomRoomId } from "@/lib/utils";

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ meetings: data });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const accountId = user.user_metadata?.account_id as string | undefined;
  if (!accountId) return NextResponse.json({ error: "no account" }, { status: 400 });

  const body = await req.json();
  const roomId = body.room_id ?? randomRoomId();

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      account_id: accountId,
      room_id: roomId,
      company_name: body.company_name,
      contact_name: body.contact_name ?? null,
      avatar_id: body.avatar_id ?? null,
      product_id: body.product_id ?? null,
      scheduled_at: body.scheduled_at ?? null,
      note: body.note ?? null,
      status: "waiting",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ meeting: data });
}
