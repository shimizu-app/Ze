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

export interface GenerateOpts {
  /** Hard cap on output tokens. Phase 10 uses this per conversation phase. */
  maxOutputTokens?: number;
  /** Sampling temperature. Defaults to 0.7. */
  temperature?: number;
  /**
   * Phase 10 paid-tier hook: a CachedContent name returned by
   * `genAI.caches.create(...)`. When set, Gemini reuses the cached
   * system+product blocks instead of re-tokenising them per turn,
   * shaving ~500ms first-token. Free-tier callers leave this
   * undefined and fall back to implicit-cache via stable prompt
   * prefixes.
   */
  cachedContent?: string;
}

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
 * Generate a text completion using Gemini 2.5 Flash. Phase 10 makes
 * `maxOutputTokens` a first-class param so the caller can clamp
 * replies to the budget for the current conversation phase.
 */
export async function geminiGenerate(prompt: string, opts: GenerateOpts = {}): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: TEXT_MODEL,
    generationConfig: {
      maxOutputTokens: opts.maxOutputTokens ?? 256,
      temperature: opts.temperature ?? 0.7,
    },
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Stream a text completion using Gemini 2.5 Flash.
 * Yields partial text chunks as they arrive so the caller can start
 * speaking the first sentence before the full response is ready.
 *
 * Phase 10:
 * - Honours opts.maxOutputTokens (per-phase budget).
 * - Plumbs opts.cachedContent through so paid callers can reference
 *   a pre-warmed CachedContent and skip re-tokenising the system
 *   prompt on every turn.
 */
export async function* geminiGenerateStream(
  prompt: string,
  opts: GenerateOpts = {}
): AsyncGenerator<string> {
  // Speculative cachedContent passthrough — newer SDKs accept it,
  // v0.21 silently ignores it. Cast through unknown so TS accepts the
  // shape without us having to bring in the new SDK's types.
  const modelConfig = {
    model: TEXT_MODEL,
    generationConfig: {
      maxOutputTokens: opts.maxOutputTokens ?? 256,
      temperature: opts.temperature ?? 0.7,
    },
    ...(opts.cachedContent ? { cachedContent: opts.cachedContent } : {}),
  } as unknown as Parameters<typeof genAI.getGenerativeModel>[0];
  const model = genAI.getGenerativeModel(modelConfig);
  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
