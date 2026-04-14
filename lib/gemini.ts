import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("[gemini] GEMINI_API_KEY not set");
}

export const genAI = new GoogleGenerativeAI(apiKey ?? "");

// Use -latest aliases that are guaranteed to resolve on v1beta.
// Fixed-version names like "gemini-1.5-flash" or "text-embedding-004"
// start returning 404 as Google rotates model tags on the legacy SDK.
const TEXT_MODEL = "gemini-1.5-flash-latest";
const EMBED_MODEL = "embedding-001";

/**
 * Generate a ~768-dimensional embedding for the given text using the
 * embedding-001 model (v1beta-compatible alias).
 */
export async function geminiEmbed(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Generate a text completion using Gemini 1.5 Flash (latest alias).
 */
export async function geminiGenerate(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: TEXT_MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Stream a text completion using Gemini 1.5 Flash (latest alias).
 * Yields partial text chunks as they arrive from Gemini so the caller
 * can start speaking the first sentence before the full response is
 * ready. This is the critical primitive behind Phase 4's sub-second
 * time-to-first-speech target.
 */
export async function* geminiGenerateStream(prompt: string): AsyncGenerator<string> {
  const model = genAI.getGenerativeModel({ model: TEXT_MODEL });
  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
