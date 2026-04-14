import { NextResponse } from "next/server";
import { listHeyGenVoices } from "@/lib/heygen";

export const dynamic = "force-dynamic";

/**
 * GET /api/heygen/voices?lang=ja
 * Returns voices filtered to the requested language (default ja).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") || "ja";

  try {
    const voices = await listHeyGenVoices(lang);
    return NextResponse.json(
      { voices },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("[heygen voices]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed", voices: [] },
      { status: 500 }
    );
  }
}
