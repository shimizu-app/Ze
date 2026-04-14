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
        const tokenRes = await fetch("/api/liveavatar/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_id: roomId }),
        });
        if (!tokenRes.ok) throw new Error("failed to fetch LiveAvatar token");
        const { session_token } = (await tokenRes.json()) as { session_token: string };

        if (cancelled) return;

        const session = new LiveAvatarSession(session_token);
        sessionRef.current = session;

        await session.start();
        if (cancelled) {
          await session.stop().catch(() => {});
          return;
        }

        if (videoRef.current) {
          session.attach(videoRef.current);
        }

        setStatus("ready");
      } catch (err) {
        console.error("[liveavatar] start failed", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "unknown");
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
