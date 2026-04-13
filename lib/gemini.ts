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

/**
 * Generate a text completion using Gemini 2.5 Flash.
 */
export async function geminiGenerate(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
