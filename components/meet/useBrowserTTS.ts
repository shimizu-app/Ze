"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "connecting" | "ready" | "error" | "ended";

/**
 * Browser-native TTS pipeline. Uses the Web Speech API (SpeechSynthesis)
 * to drive avatar speech without any external service, credits, or
 * camera hardware. Shape-compatible with useLiveAvatar / useHeyGenAvatar
 * so MeetRoom can swap pipelines behind a simple dispatch.
 *
 * Trade-offs:
 * - Quality depends on the user's OS (macOS Kyoko/Otoya are decent,
 *   mobile devices usually ship with good Japanese voices).
 * - No video stream — the VideoPanel falls back to the static
 *   avatar placeholder + speaking indicator.
 * - Zero latency, zero API calls, zero cost — ideal for お試しモード.
 */
export function useBrowserTTS({
  enabled,
  language = "ja-JP",
}: {
  enabled: boolean;
  language?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null); // unused but kept for shape parity
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Pick a Japanese voice as soon as voices are loaded.
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setError("このブラウザは音声合成に対応していません");
      setStatus("error");
      return;
    }

    function pickVoice() {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      // Prefer Japanese; fall back to whatever we have.
      const ja = voices.find((v) => v.lang.startsWith("ja"));
      voiceRef.current = ja ?? voices[0];
      setStatus("ready");
    }

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, [enabled]);

  const speak = useCallback(
    async (text: string) => {
      if (!enabled) return;
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      const clean = text.trim();
      if (!clean) return;

      const u = new SpeechSynthesisUtterance(clean);
      u.lang = language;
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 1.05;
      u.pitch = 1.0;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(u);
    },
    [enabled, language]
  );

  return { videoRef, status, error, speak, speaking };
}
