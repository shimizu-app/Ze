import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { HostObserver } from "@/components/meetings/HostObserver";

export const dynamic = "force-dynamic";

export default async function HostMeetingPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) notFound();
  const meeting = data as {
    id: string;
    room_id: string;
    company_name: string;
    contact_name: string | null;
    status: string | null;
    host_paused: boolean | null;
    mode: string | null;
  };

  const { data: convRaw } = await supabase
    .from("conversations")
    .select("id, transcript, turns")
    .eq("meeting_id", meeting.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const initialConversation = convRaw as {
    id: string;
    transcript: { role: "user" | "assistant"; text: string; ts?: string }[] | null;
    turns: number | null;
  } | null;

  return (
    <>
      <Topbar title={`会議観察: ${meeting.company_name}`} code="HOST" />
      <HostObserver
        meeting={meeting}
        initialConversationId={initialConversation?.id ?? null}
        initialTurns={initialConversation?.transcript ?? []}
      />
    </>
  );
}
