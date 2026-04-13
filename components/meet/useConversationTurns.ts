"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Turn = { role: "user" | "assistant"; text: string; ts: string };

/**
 * Tracks in-memory conversation turns and persists each one through the
 * conversations API. Creates the conversation row on mount.
 */
export function useConversationTurns({ roomId, enabled }: { roomId: string; enabled: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_id: roomId }),
        });
        if (!res.ok) throw new Error("failed to create conversation");
        const { conversation_id } = await res.json();
        if (!cancelled) conversationIdRef.current = conversation_id;
      } catch (err) {
        console.error("[turns] init failed", err);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [enabled, roomId]);

  const append = useCallback(
    async (role: "user" | "assistant", text: string) => {
      const turn: Turn = { role, text, ts: new Date().toISOString() };
      setTurns((prev) => [...prev, turn]);

      const id = conversationIdRef.current;
      if (!id) return;
      try {
        await fetch(`/api/conversations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_id: roomId, turn }),
        });
      } catch (err) {
        console.error("[turns] append failed", err);
      }
    },
    [roomId]
  );

  const endMeeting = useCallback(async () => {
    const id = conversationIdRef.current;
    if (!id) return;
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId, end: true }),
      });
    } catch (err) {
      console.error("[turns] end failed", err);
    }
  }, [roomId]);

  return { turns, append, endMeeting };
}
