/**
 * Gemini Image Generation Template
 * For Magic Pen feature - generating images from text prompts
 */

import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({});

export async function generateImage(
  prompt: string,
  options?: {
    aspectRatio?: "1:1" | "16:9" | "9:16";
    imageSize?: "2K" | "4K";
    useGoogleSearch?: boolean;
  }
) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: prompt,
      config: {
        tools: options?.useGoogleSearch ? [{ googleSearch: {} }] : [],
        imageConfig: {
          aspectRatio: options?.aspectRatio || "16:9",
          imageSize: options?.imageSize || "4K",
        },
      },
    });

    // Extract image from response
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        return buffer;
      }
    }

    throw new Error("No image data in response");
  } catch (error) {
    console.error("Gemini image generation error:", error);
    throw new Error("Failed to generate image");
  }
}





