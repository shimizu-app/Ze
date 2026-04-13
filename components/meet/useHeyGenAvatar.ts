"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from "@heygen/streaming-avatar";

type Status = "idle" | "connecting" | "ready" | "error" | "ended";

export function useHeyGenAvatar({
  roomId,
  avatarName,
  voiceId,
  enabled,
}: {
  roomId: string;
  avatarName: string;
  voiceId?: string;
  enabled: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function start() {
      setStatus("connecting");
      setError(null);
      try {
        const tokenRes = await fetch("/api/heygen/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_id: roomId }),
        });
        if (!tokenRes.ok) throw new Error("failed to fetch HeyGen token");
        const { token } = await tokenRes.json();

        if (cancelled) return;

        const avatar = new StreamingAvatar({ token });
        avatarRef.current = avatar;

        avatar.on(StreamingEvents.STREAM_READY, (event) => {
          const stream = (event as unknown as { detail: MediaStream }).detail;
          if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setStatus("ready");
        });

        avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
          setStatus("ended");
        });

        await avatar.createStartAvatar({
          quality: AvatarQuality.Low,
          avatarName,
          voice: voiceId ? { voiceId } : undefined,
          language: "ja",
        });
      } catch (err) {
        console.error("[heygen] start failed", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "unknown");
          setStatus("error");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      avatarRef.current?.stopAvatar().catch(() => {});
      avatarRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, roomId, avatarName, voiceId]);

  const speak = useCallback(async (text: string) => {
    const avatar = avatarRef.current;
    if (!avatar) return;
    try {
      await avatar.speak({ text, taskType: TaskType.REPEAT });
    } catch (err) {
      console.error("[heygen] speak failed", err);
    }
  }, []);

  return { videoRef, status, error, speak };
}
