"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "requesting-mic" | "connecting" | "listening" | "error" | "stopped";

interface Options {
  roomId: string;
  enabled: boolean;
  /**
   * When true, the hook suspends mic capture and drops any transcripts
   * that arrive. MeetRoom uses this to mute the mic while the avatar
   * is speaking so the TTS output doesn't loop back through Deepgram
   * and trigger an echo conversation.
   */
  externalMute?: boolean;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
}

/**
 * Browser-side Deepgram streaming hook.
 * Fetches a scoped key from /api/deepgram/token, captures the mic via
 * getUserMedia, and streams audio chunks over a WebSocket.
 */
export function useDeepgramSTT({
  roomId,
  enabled,
  externalMute = false,
  onInterim,
  onFinal,
}: Options) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onInterimRef = useRef(onInterim);
  const onFinalRef = useRef(onFinal);
  const mutedRef = useRef(false);
  const externalMuteRef = useRef(externalMute);

  useEffect(() => {
    onInterimRef.current = onInterim;
    onFinalRef.current = onFinal;
  }, [onInterim, onFinal]);

  // Re-apply mute state whenever the manual or external mute flags change.
  useEffect(() => {
    externalMuteRef.current = externalMute;
    const shouldMute = muted || externalMute;
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !shouldMute));
  }, [muted, externalMute]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function start() {
      setError(null);
      setStatus("requesting-mic");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        setStatus("connecting");
        const tokenRes = await fetch("/api/deepgram/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_id: roomId }),
        });
        if (!tokenRes.ok) throw new Error("failed to fetch Deepgram token");
        const { key } = await tokenRes.json();

        if (cancelled) return;

        // Phase 11 endpointing: tuned so the server commits a turn
        // quickly once the user pauses.
        //   endpointing=300       - fire is_final 300ms after last voice
        //   utterance_end_ms=1000 - guarantee an UtteranceEnd event
        //                           1s after speech really stops
        //   vad_events=true       - surface SpeechStarted/SpeechFinished
        //                           so we can flush interim as final
        const wsUrl =
          "wss://api.deepgram.com/v1/listen?model=nova-3&language=ja&smart_format=true&interim_results=true&encoding=opus&endpointing=300&utterance_end_ms=1000&vad_events=true";
        const ws = new WebSocket(wsUrl, ["token", key]);
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) return;
          setStatus("listening");
          const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
          recorderRef.current = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
              ws.send(e.data);
            }
          };
          recorder.start(250);
        };

        // Phase 11: with utterance_end_ms enabled Deepgram sends
        // separate `UtteranceEnd` frames when the user stops talking.
        // We buffer the last interim transcript so that, if the server
        // never upgrades it to is_final (e.g. trailing silence), we
        // can flush it ourselves when UtteranceEnd arrives.
        let pendingInterim = "";

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data as string);

            // Deepgram event-type frames don't carry a transcript.
            if (data?.type === "UtteranceEnd") {
              if (externalMuteRef.current || mutedRef.current) return;
              if (pendingInterim.trim()) {
                const flushed = pendingInterim;
                pendingInterim = "";
                onFinalRef.current?.(flushed);
              }
              return;
            }
            if (data?.type === "SpeechStarted" || data?.type === "Metadata") {
              return;
            }

            const alt = data?.channel?.alternatives?.[0];
            if (!alt || !alt.transcript) return;
            // Drop anything that arrives while the avatar is speaking
            // or the user has muted — otherwise the avatar's own voice
            // or accidental background noise would loop back in.
            if (externalMuteRef.current || mutedRef.current) return;
            if (data.is_final) {
              pendingInterim = "";
              onFinalRef.current?.(alt.transcript);
            } else {
              pendingInterim = alt.transcript;
              onInterimRef.current?.(alt.transcript);
            }
          } catch {
            // ignore parse errors
          }
        };

        ws.onerror = () => {
          setError("音声認識の接続でエラーが発生しました");
          setStatus("error");
        };

        ws.onclose = () => {
          if (!cancelled) setStatus("stopped");
        };
      } catch (err) {
        console.error("[deepgram] start failed", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "unknown");
          setStatus("error");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      try {
        recorderRef.current?.stop();
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      wsRef.current?.close();
      recorderRef.current = null;
      streamRef.current = null;
      wsRef.current = null;
    };
  }, [enabled, roomId]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  return { status, error, muted, toggleMute };
}
