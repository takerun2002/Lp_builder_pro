/**
 * Gemini OCR Template
 * For extracting text from images (LP Scraping feature)
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export async function extractTextFromImage(
  imageBase64: string,
  mimeType: string = "image/jpeg",
  options?: {
    model?: "gemini-2.5-flash" | "gemini-2.5-pro" | "gemini-3-pro-preview";
  },
) {
  try {
    const response = await ai.models.generateContent({
      model: options?.model ?? (process.env.GEMINI_TEXT_MODEL as any) ?? "gemini-2.5-flash",
      contents: [
        {
          parts: [
            { text: "Extract all text from this image. Return only the text content." },
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
              mediaResolution: {
                level: "media_resolution_high", // High quality OCR
              },
            },
          ],
        },
      ],
      config: {
        thinkingConfig: {
          thinkingLevel: "low", // Fast OCR doesn't need deep reasoning
        },
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini OCR error:", error);
    throw new Error("Failed to extract text from image");
  }
}

