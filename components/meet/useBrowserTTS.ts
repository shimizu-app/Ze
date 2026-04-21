"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Status = "idle" | "connecting" | "ready" | "error" | "ended";

export interface BrowserVoice {
  id: string; // voiceURI
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
  /** Heuristic quality score — higher is better. */
  quality: number;
}

/**
 * Browser-native TTS pipeline using the Web Speech API.
 * Zero cost, zero API calls, zero credits — ideal for お試しモード.
 *
 * Exposes a voice list so the user can swap between whatever high-
 * quality Japanese voices their OS ships with (macOS Siri/Kyoko
 * Enhanced, Windows Ayumi/Haruka Neural, mobile system voices, etc.).
 */
export function useBrowserTTS({
  enabled,
  language = "ja-JP",
  initialVoiceId,
}: {
  enabled: boolean;
  language?: string;
  /** Pre-selected voice from the lobby picker. Applied on first load. */
  initialVoiceId?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null); // unused but kept for shape parity
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setError("このブラウザは音声合成に対応していません");
      setStatus("error");
      return;
    }

    function loadVoices() {
      const all = window.speechSynthesis.getVoices();
      if (all.length === 0) return;
      setVoices(all);

      // Use the lobby pre-selection if provided, otherwise auto-pick.
      setSelectedVoiceId((prev) => {
        if (prev) return prev;
        if (initialVoiceId) {
          const match = all.find((v) => v.voiceURI === initialVoiceId);
          if (match) {
            selectedVoiceRef.current = match;
            return initialVoiceId;
          }
        }
        const best = pickBestJapaneseVoice(all);
        if (best) {
          selectedVoiceRef.current = best;
          return best.voiceURI;
        }
        return null;
      });

      setStatus("ready");
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, [enabled]);

  // Keep ref in sync with selected id so speak() uses the latest pick.
  useEffect(() => {
    const match = voices.find((v) => v.voiceURI === selectedVoiceId);
    if (match) selectedVoiceRef.current = match;
  }, [voices, selectedVoiceId]);

  const selectableVoices = useMemo<BrowserVoice[]>(() => {
    return voices
      .filter((v) => v.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase()))
      .map((v) => ({
        id: v.voiceURI,
        name: v.name,
        lang: v.lang,
        localService: v.localService,
        default: v.default,
        quality: voiceQualityScore(v),
      }))
      .sort((a, b) => b.quality - a.quality);
  }, [voices, language]);

  const speak = useCallback(
    async (text: string) => {
      if (!enabled) return;
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      const clean = text.trim();
      if (!clean) return;

      const u = new SpeechSynthesisUtterance(clean);
      u.lang = language;
      if (selectedVoiceRef.current) u.voice = selectedVoiceRef.current;
      u.rate = 1.0;
      u.pitch = 1.0;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(u);
    },
    [enabled, language]
  );

  return {
    videoRef,
    status,
    error,
    speak,
    speaking,
    voices: selectableVoices,
    selectedVoiceId,
    setSelectedVoiceId,
  };
}

function voiceQualityScore(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  let score = 0;
  // Modern neural / premium voice markers
  if (/premium|enhanced|neural|siri|natural|wavenet/.test(name)) score += 100;
  // Known high-quality Japanese voices
  if (/kyoko|otoya|ayumi|haruka|nanami|keita/.test(name)) score += 50;
  // Network voices (often higher quality than default local ones)
  if (!v.localService) score += 10;
  // Bonus for exact ja-JP tag
  if (v.lang.toLowerCase() === "ja-jp") score += 5;
  return score;
}

function pickBestJapaneseVoice(
  all: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const japanese = all.filter((v) =>
    v.lang.toLowerCase().startsWith("ja")
  );
  if (japanese.length === 0) return all[0] ?? null;
  const sorted = japanese
    .map((v) => ({ v, score: voiceQualityScore(v) }))
    .sort((a, b) => b.score - a.score);
  return sorted[0].v;
}
