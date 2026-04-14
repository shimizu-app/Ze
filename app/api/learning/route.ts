import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  analyzeUtterance,
  mergeLearning,
  persistLearning,
  type SessionLearning,
} from "@/lib/session-learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/learning
 * Body: { room_id, text }
 *
 * Called from the meet room during interim transcription. Runs a
 * small Groq classification call on the text, merges the result into
 * the latest conversation's learning snapshot, and persists it. The
 * caller fires-and-forgets — errors are logged but returned 200 so a
 * flaky analysis never interrupts the live conversation.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const roomId = body.room_id as string | undefined;
  const text = (body.text as string | undefined)?.trim();

  if (!roomId || !text) {
    return NextResponse.json({ ok: false, error: "room_id and text required" }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const { data: meeting } = await supabase
      .from("meetings")
      .select("id")
      .eq("room_id", roomId)
      .maybeSingle();
    if (!meeting?.id) {
      return NextResponse.json({ ok: false, error: "meeting not found" }, { status: 404 });
    }

    // Pull the current snapshot (so merges are additive).
    const { data: conversation } = await supabase
      .from("conversations")
      .select("learning")
      .eq("meeting_id", meeting.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const prev = (conversation as { learning?: SessionLearning } | null)?.learning ?? null;

    const delta = await analyzeUtterance(text);
    if (Object.keys(delta).length === 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const merged = mergeLearning(prev, delta);
    await persistLearning(meeting.id, merged);

    return NextResponse.json({ ok: true, learning: merged });
  } catch (err) {
    console.error("[learning]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 200 }
    );
  }
}
