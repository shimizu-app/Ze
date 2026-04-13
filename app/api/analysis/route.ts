import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { geminiGenerate } from "@/lib/gemini";

interface Turn {
  role: "user" | "assistant";
  text: string;
  ts?: string;
}

/**
 * POST /api/analysis
 * Body: { conversation_id }
 * Uses Gemini to summarise the conversation and extract a cause analysis
 * (win/loss reasons) plus a 1-4 word outcome tag. Writes the result back
 * to the conversations row so the logs/analytics pages can use it.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const conversationId = body.conversation_id as string | undefined;
  if (!conversationId) {
    return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, transcript, turns, company_name")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json({ error: "conversation not found" }, { status: 404 });
  }

  const turns = (conversation.transcript as Turn[] | null) ?? [];
  if (turns.length === 0) {
    await supabase
      .from("conversations")
      .update({
        summary: "会話が発生しませんでした",
        cause_analysis: "ゲストが発話しなかったため分析できません",
        outcome: "pending",
        tags: ["no-speech"],
      })
      .eq("id", conversationId);
    return NextResponse.json({ ok: true, skipped: true });
  }

  const transcriptText = turns
    .map((t) => `${t.role === "user" ? "相手" : "アバター"}: ${t.text}`)
    .join("\n");

  const prompt = `以下は AI 営業アバターと見込み顧客 (${conversation.company_name ?? "不明"}) の商談ログです。
JSONで以下のフィールドを出力してください。余計な前置きやマークダウンは禁止。

{
  "summary": "120文字以内の日本語要約",
  "outcome": "won | lost | pending | escalated のいずれか",
  "cause_analysis": "成約/失注の主な要因を日本語で説明。300文字以内",
  "tags": ["最大5個の短い日本語タグ"]
}

# 商談ログ
${transcriptText}`;

  let summary = "";
  let outcome: "won" | "lost" | "pending" | "escalated" = "pending";
  let causeAnalysis = "";
  let tags: string[] = [];

  try {
    const raw = await geminiGenerate(prompt);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    summary = typeof parsed.summary === "string" ? parsed.summary : "";
    if (["won", "lost", "pending", "escalated"].includes(parsed.outcome)) {
      outcome = parsed.outcome;
    }
    causeAnalysis = typeof parsed.cause_analysis === "string" ? parsed.cause_analysis : "";
    if (Array.isArray(parsed.tags)) tags = parsed.tags.slice(0, 5).map(String);
  } catch (err) {
    console.error("[analysis] gemini parse failed", err);
    summary = "分析に失敗しました";
    causeAnalysis = "Gemini 応答の解析に失敗";
  }

  const { error } = await supabase
    .from("conversations")
    .update({ summary, outcome, cause_analysis: causeAnalysis, tags })
    .eq("id", conversationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, summary, outcome, cause_analysis: causeAnalysis, tags });
}
