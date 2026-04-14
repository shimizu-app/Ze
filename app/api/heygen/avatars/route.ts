import { NextResponse } from "next/server";
import { listHeyGenAvatars } from "@/lib/heygen";

export const dynamic = "force-dynamic";

/**
 * GET /api/heygen/avatars
 * Returns the list of streaming-capable avatars on the configured
 * HeyGen account. Cached for an hour to keep us under HeyGen's rate
 * limits.
 */
export async function GET() {
  try {
    const avatars = await listHeyGenAvatars();
    return NextResponse.json(
      { avatars },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("[heygen avatars]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed", avatars: [] },
      { status: 500 }
    );
  }
}
