import { groqChatStream } from "@/lib/groq";
import { geminiGenerateStream } from "@/lib/gemini";

/**
 * Phase 11: unified LLM provider layer.
 *
 * Previous phases branched between Groq (light) and Gemini (heavy) at
 * the route level based on keyword-matched intent. That was fragile —
 * a question like "うちの業界で使えますか" would fall into the light
 * bucket and get a shallow Groq reply, while a filler like "なるほど
 * 面白いですね" would trip a HEAVY_KEYWORD and burn a Gemini call.
 *
 * The new rule: phase decides token budget, callLLM decides provider.
 * Groq is primary (≈50ms first token, llama-3.3-70b is plenty smart
 * for a sales conversation) and Gemini is the hot standby. Callers
 * just send messages and await the stream.
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CallLLMOptions {
  /** Hard cap on output tokens. Defaults to 256. */
  maxTokens?: number;
  /** Sampling temperature. Defaults to 0.7. */
  temperature?: number;
  /**
   * Gemini-only: a CachedContent name to reuse the system+product
   * prefix on paid-tier Gemini. Ignored on the Groq path.
   */
  cachedContent?: string;
}

/**
 * Stream an LLM response. Tries Groq first, falls back to Gemini on
 * any error (rate limit, 5xx, network). If both providers fail the
 * error is re-thrown and the caller is expected to emit a fixed
 * fallback utterance.
 */
export async function* callLLM(
  messages: LLMMessage[],
  options: CallLLMOptions = {}
): AsyncGenerator<string> {
  const maxTokens = options.maxTokens ?? 256;
  const temperature = options.temperature ?? 0.7;

  try {
    for await (const chunk of groqChatStream(messages, {
      temperature,
      max_tokens: maxTokens,
    })) {
      yield chunk;
    }
    return;
  } catch (err) {
    console.warn("[llm] groq failed, falling back to gemini", err);
  }

  // Gemini takes a single prompt string, so collapse the messages.
  // System goes first (anchors the implicit prefix cache), then the
  // user / assistant turns in order.
  const prompt = messages
    .map((m) => (m.role === "system" ? m.content : `${m.role}: ${m.content}`))
    .join("\n\n");

  for await (const chunk of geminiGenerateStream(prompt, {
    maxOutputTokens: maxTokens,
    temperature,
    cachedContent: options.cachedContent,
  })) {
    yield chunk;
  }
}
