/**
 * Basic Gemini API Template
 * Copy this template when creating new Gemini API integrations
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});
// API key automatically read from GOOGLE_API_KEY env var
// Text model can be selected via GEMINI_TEXT_MODEL env var:
// - gemini-2.5-flash (default)
// - gemini-2.5-pro
// - gemini-3-pro-preview

export async function generateText(prompt: string) {
  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate text");
  }
}

