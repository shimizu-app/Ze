import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("[gemini] GEMINI_API_KEY not set");
}

export const genAI = new GoogleGenerativeAI(apiKey ?? "");

/**
 * Generate a 768-dimensional embedding for the given text using
 * Google's text-embedding-004 model.
 */
export async function geminiEmbed(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

const MODEL = "gemini-1.5-flash";

/**
 * Generate a text completion using Gemini 2.0 Flash.
 */
export async function geminiGenerate(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Stream a text completion using Gemini 2.0 Flash.
 * Yields partial text chunks as they arrive from Gemini so the caller
 * can start speaking the first sentence before the full response is
 * ready. This is the critical primitive behind Phase 4's sub-second
 * time-to-first-speech target.
 */
export async function* geminiGenerateStream(prompt: string): AsyncGenerator<string> {
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
