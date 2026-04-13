import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createHeyGenSessionToken } from "@/lib/heygen";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const roomId = body.room_id as string | undefined;
  if (!roomId) return NextResponse.json({ error: "room_id required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: meeting, error } = await supabase
    .from("meetings")
    .select("id")
    .eq("room_id", roomId)
    .maybeSingle();

  if (error || !meeting) {
    return NextResponse.json({ error: "meeting not found" }, { status: 404 });
  }

  try {
    const token = await createHeyGenSessionToken();
    return NextResponse.json({ token });
  } catch (err) {
    console.error("[heygen token]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
