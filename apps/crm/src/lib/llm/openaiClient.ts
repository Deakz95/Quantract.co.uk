import OpenAI from "openai";

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey });
}

export const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
