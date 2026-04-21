import { NextResponse } from "next/server";
import { createSimliSessionToken, DEFAULT_FACE_ID } from "@/lib/simli";

export const dynamic = "force-dynamic";

/**
 * POST /api/simli/token
 * Body: { face_id? }
 *
 * Creates a Simli session token for the client-side SimliClient.
 * Similar to /api/liveavatar/token but for the Standard tier.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const faceId = (body.face_id as string | undefined) ?? DEFAULT_FACE_ID;

  try {
    const token = await createSimliSessionToken({ faceId });
    return NextResponse.json(token);
  } catch (err) {
    console.error("[simli token]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
