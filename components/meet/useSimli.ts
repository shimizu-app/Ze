"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "connecting" | "ready" | "error" | "ended";

/**
 * Simli avatar hook — Standard tier.
 *
 * SimliClient renders a lip-synced video avatar from PCM16 audio.
 * The speak() function converts text → TTS audio → PCM16 → Simli.
 *
 * TTS strategy:
 *   1. Try /api/deepgram-tts (server-side, high quality)
 *   2. Fall back to browser SpeechSynthesis (no lip sync, audio only)
 *
 * Exposes the same { videoRef, status, error, speak } shape as
 * useLiveAvatar so MeetRoom can swap pipelines transparently.
 */
export function useSimli({
  roomId,
  enabled,
  faceId,
}: {
  roomId: string;
  enabled: boolean;
  faceId?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clientRef = useRef<unknown>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function start() {
      setStatus("connecting");
      setError(null);

      try {
        // Dynamic import to avoid SSR issues with WebRTC
        const { SimliClient, generateIceServers } = await import("simli-client");

        // 1. Get session token from our API
        console.log("[simli] fetching token...");
        const tokenRes = await fetch("/api/simli/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ face_id: faceId }),
        });
        if (!tokenRes.ok) {
          const body = await tokenRes.text();
          throw new Error(`token fetch ${tokenRes.status}: ${body.slice(0, 300)}`);
        }
        const { session_token } = await tokenRes.json();
        if (!session_token) throw new Error("missing session_token");
        console.log("[simli] token ok");

        if (cancelled) return;

        // 2. Create video + audio elements if needed
        if (!audioRef.current) {
          audioRef.current = document.createElement("audio");
          audioRef.current.autoplay = true;
        }

        if (!videoRef.current) {
          console.warn("[simli] videoRef not mounted yet");
          throw new Error("video element not available");
        }

        // 3. Get ICE servers
        let iceServers: RTCIceServer[] | null = null;
        try {
          const simliApiKey = ""; // ICE servers may work without key for public TURN
          iceServers = await generateIceServers(simliApiKey);
        } catch {
          console.warn("[simli] ICE servers fetch failed, using null");
        }

        // 4. Create SimliClient
        const client = new SimliClient(
          session_token,
          videoRef.current,
          audioRef.current,
          iceServers
        );

        client.on("start", () => {
          console.log("[simli] session started");
          if (!cancelled) setStatus("ready");
        });
        client.on("speaking", () => setSpeaking(true));
        client.on("silent", () => setSpeaking(false));
        client.on("error", (detail: string) => {
          console.error("[simli] error:", detail);
          if (!cancelled) {
            setError(detail);
            setStatus("error");
          }
        });
        client.on("stop", () => {
          if (!cancelled) setStatus("ended");
        });

        clientRef.current = client;
        console.log("[simli] starting connection...");
        await client.start();
      } catch (err) {
        console.error("[simli] start failed", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "unknown error");
          setStatus("error");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      const client = clientRef.current as { stop?: () => Promise<void> } | null;
      client?.stop?.().catch(() => {});
      clientRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, [enabled, roomId, faceId]);

  const speak = useCallback(async (text: string) => {
    const client = clientRef.current as {
      sendAudioData?: (data: Uint8Array) => void;
    } | null;
    if (!client?.sendAudioData) {
      // Simli not connected — fall back to browser SpeechSynthesis
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "ja-JP";
        window.speechSynthesis.speak(u);
      }
      return;
    }

    try {
      // Fetch TTS audio from Deepgram
      const res = await fetch("/api/deepgram-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(`TTS ${res.status}`);

      const audioBuffer = await res.arrayBuffer();

      // Decode audio to PCM via Web Audio API
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext({ sampleRate: 16000 });
      }
      const decoded = await audioCtxRef.current.decodeAudioData(audioBuffer);
      const float32 = decoded.getChannelData(0);

      // Convert Float32 → Int16 PCM
      const pcm16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Send to Simli in chunks (16000 samples/sec = 32000 bytes/sec)
      const CHUNK_SIZE = 6400; // 200ms chunks
      const bytes = new Uint8Array(pcm16.buffer);
      for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
        const chunk = bytes.slice(offset, offset + CHUNK_SIZE);
        client.sendAudioData(chunk);
      }
    } catch (err) {
      console.warn("[simli] TTS failed, falling back to browser speech", err);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "ja-JP";
        window.speechSynthesis.speak(u);
      }
    }
  }, []);

  return { videoRef, status, error, speak, speaking };
}
