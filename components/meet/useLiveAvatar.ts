"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LiveAvatarSession } from "@heygen/liveavatar-web-sdk";

type Status = "idle" | "connecting" | "ready" | "error" | "ended";

/**
 * React wrapper around @heygen/liveavatar-web-sdk LiveAvatarSession.
 * Drop-in replacement for useHeyGenAvatar. Exposes the same shape:
 *   { videoRef, status, error, speak }
 * so MeetRoom can swap pipelines via a feature flag.
 */
export function useLiveAvatar({
  roomId,
  enabled,
}: {
  roomId: string;
  enabled: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function start() {
      setStatus("connecting");
      setError(null);
      try {
        console.log("[liveavatar] fetching token for room", roomId);
        // Retry up to 3 times — LiveAvatar occasionally returns 503
        // (DNS cache overflow) on the first attempt.
        let tokenJson: Record<string, unknown> | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          const tokenRes = await fetch("/api/liveavatar/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id: roomId }),
          });
          if (tokenRes.ok) {
            tokenJson = await tokenRes.json();
            break;
          }
          const body = await tokenRes.text();
          if (tokenRes.status >= 500 && attempt < 3) {
            console.warn(`[liveavatar] token attempt ${attempt} failed (${tokenRes.status}), retrying...`);
            await new Promise((r) => setTimeout(r, attempt * 1500));
            continue;
          }
          throw new Error(`token fetch ${tokenRes.status}: ${body.slice(0, 300)}`);
        }
        if (!tokenJson) throw new Error("token fetch failed after retries");
        const sessionToken = tokenJson.session_token as string | undefined;
        if (!sessionToken) {
          throw new Error(`token response missing session_token: ${JSON.stringify(tokenJson).slice(0, 200)}`);
        }
        console.log("[liveavatar] token ok, constructing session", {
          session_id: tokenJson.session_id,
        });

        if (cancelled) return;

        // Disable the SDK's built-in VoiceChat so it doesn't grab the
        // microphone — we use Deepgram independently for STT. This also
        // keeps the SDK from failing on machines with no camera, since
        // LiveKit's initial media negotiation is short-circuited.
        const session = new LiveAvatarSession(sessionToken, {
          voiceChat: false,
        });
        sessionRef.current = session;

        console.log("[liveavatar] calling session.start()");
        await session.start();
        console.log("[liveavatar] session.start() resolved");
        if (cancelled) {
          await session.stop().catch(() => {});
          return;
        }

        if (videoRef.current) {
          session.attach(videoRef.current);
          console.log("[liveavatar] attached to video element");
        } else {
          console.warn("[liveavatar] videoRef not mounted yet; will retry on next render");
        }

        setStatus("ready");
      } catch (err) {
        console.error("[liveavatar] start failed", err);
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? `${err.name}: ${err.message}`
              : typeof err === "string"
              ? err
              : JSON.stringify(err);
          setError(msg);
          setStatus("error");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      sessionRef.current?.stop().catch(() => {});
      sessionRef.current = null;
    };
  }, [enabled, roomId]);

  const speak = useCallback(async (text: string) => {
    const session = sessionRef.current;
    if (!session) return;
    try {
      session.repeat(text);
    } catch (err) {
      console.error("[liveavatar] speak failed", err);
    }
  }, []);

  return { videoRef, status, error, speak };
}
