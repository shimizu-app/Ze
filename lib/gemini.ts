import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("[gemini] GEMINI_API_KEY not set");
}

export const genAI = new GoogleGenerativeAI(apiKey ?? "");

// Model names confirmed against ListModels for the current API key.
// gemini-1.5-* aliases aren't on this key; gemini-2.5-flash is.
const TEXT_MODEL = "gemini-2.5-flash";

// gemini-embedding-001 is the only embedding model the current key
// exposes. It returns Matryoshka embeddings (typically 3072 dims),
// so we slice the leading 768 dims to match our pgvector column
// — the MRL training guarantees the first N dims preserve most of
// the semantic signal.
const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIMS = 768;

/**
 * Generate an embedding for the given text and truncate to the
 * dimension of the pgvector column (768). Uses gemini-embedding-001
 * which supports matryoshka truncation.
 */
export async function geminiEmbed(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
  const result = await model.embedContent(text);
  const vec = result.embedding.values;
  if (vec.length < EMBED_DIMS) return vec;
  return vec.slice(0, EMBED_DIMS);
}

/**
 * Generate a text completion using Gemini 2.5 Flash.
 */
export async function geminiGenerate(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: TEXT_MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Stream a text completion using Gemini 2.5 Flash.
 * Yields partial text chunks as they arrive so the caller can start
 * speaking the first sentence before the full response is ready.
 * This is the primitive behind Phase 4's sub-second time-to-first-
 * speech target.
 */
export async function* geminiGenerateStream(prompt: string): AsyncGenerator<string> {
  const model = genAI.getGenerativeModel({ model: TEXT_MODEL });
  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
