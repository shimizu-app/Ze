"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "connecting" | "ready" | "error" | "ended";

/**
 * Deepgram Aura TTS pipeline. Fetches synthesized audio from the
 * /api/deepgram-tts endpoint as mp3 bytes, decodes via Web Audio,
 * and plays the buffer through the default output device. Queued
 * playback keeps utterances serialised so sentence fragments from
 * the Gemini stream don't overlap.
 *
 * Shape-compatible with useLiveAvatar / useBrowserTTS so MeetRoom
 * can swap it in via the avatar_pipeline column.
 */
export function useDeepgramTTS({
  enabled,
  model,
}: {
  enabled: boolean;
  /** Optional Aura voice model override, e.g. "aura-2-sakura-ja". */
  model?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null); // parity with other hooks
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    setStatus("connecting");
    try {
      // Lazy-init AudioContext so the browser doesn't complain about
      // autoplay restrictions until the user interacts with the page.
      audioCtxRef.current = null;
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown");
      setStatus("error");
    }
    return () => {
      cancelledRef.current = true;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, [enabled]);

  const ensureContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioCtxRef.current = new Ctor();
    }
    return audioCtxRef.current;
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!enabled) return;
      const clean = text.trim();
      if (!clean) return;

      // Chain onto the existing queue so utterances play back in the
      // order speak() was called, not the order Deepgram responded.
      queueRef.current = queueRef.current.then(async () => {
        if (cancelledRef.current) return;
        try {
          setSpeaking(true);
          const res = await fetch("/api/deepgram-tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: clean, model }),
          });
          if (!res.ok) {
            const body = await res.text();
            throw new Error(`tts ${res.status}: ${body.slice(0, 200)}`);
          }
          const buf = await res.arrayBuffer();
          const ctx = ensureContext();
          if (!ctx) throw new Error("AudioContext unavailable");
          if (ctx.state === "suspended") {
            await ctx.resume().catch(() => {});
          }
          const decoded = await ctx.decodeAudioData(buf.slice(0));
          await playBuffer(ctx, decoded);
        } catch (err) {
          console.error("[deepgram-tts] speak failed", err);
          setError(err instanceof Error ? err.message : "unknown");
        } finally {
          setSpeaking(false);
        }
      });
      return queueRef.current;
    },
    [enabled, ensureContext, model]
  );

  return { videoRef, status, error, speak, speaking };
}

function playBuffer(ctx: AudioContext, buffer: AudioBuffer): Promise<void> {
  return new Promise((resolve) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => resolve();
    source.start();
  });
}
