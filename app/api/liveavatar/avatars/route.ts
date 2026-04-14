import { NextResponse } from "next/server";
import { listLiveAvatars } from "@/lib/liveavatar";

export const dynamic = "force-dynamic";

/**
 * GET /api/liveavatar/avatars
 * Returns the public LiveAvatar catalog. Cached for an hour.
 */
export async function GET() {
  try {
    const avatars = await listLiveAvatars();
    return NextResponse.json(
      { avatars },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("[liveavatar list]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed", avatars: [] },
      { status: 500 }
    );
  }
}
