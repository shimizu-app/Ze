/**
 * Groq client used for the "light" branch of the 3-layer router and
 * for interim session-learning analysis. Groq is essentially a very
 * fast inference hosting service for open models (llama-3.3-70b in
 * our case) and typically returns first token in ~50ms.
 *
 * We call the REST API directly to avoid pulling groq-sdk's
 * top-level SDK footprint into every edge invocation — the wire
 * protocol is OpenAI-compatible so it's trivial.
 */

const API_BASE = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

function apiKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  return key;
}

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Call Groq chat completions in non-streaming mode and return the
 * first choice's content. Short, quick responses only — the use
 * case is "light" acknowledgements and JSON analysis, not long-form
 * sales pitches (those still go through Gemini).
 */
export async function groqChat(
  messages: GroqMessage[],
  opts: { model?: string; temperature?: number; max_tokens?: number; response_format?: "text" | "json_object" } = {}
): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model ?? DEFAULT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.6,
    max_tokens: opts.max_tokens ?? 256,
  };
  if (opts.response_format === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq chat failed: ${res.status} ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

/**
 * Stream a chat completion from Groq using Server-Sent Events. Yields
 * each delta as the server emits them so the caller can begin
 * speaking the first sentence immediately. Drop-in replacement for
 * lib/gemini.ts::geminiGenerateStream on the "light" branch.
 */
export async function* groqChatStream(
  messages: GroqMessage[],
  opts: { model?: string; temperature?: number; max_tokens?: number } = {}
): AsyncGenerator<string> {
  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.6,
    max_tokens: opts.max_tokens ?? 256,
    stream: true,
  };

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const text = res.body ? await res.text() : "";
    throw new Error(`Groq stream failed: ${res.status} ${text.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const text = parsed.choices?.[0]?.delta?.content;
        if (text) yield text;
      } catch {
        // ignore parse errors on incomplete payloads
      }
    }
  }
}
