/**
 * Gemini Conversational Image Editing Template
 * IMPORTANT: Preserve thoughtSignature for multi-turn editing
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

interface ImageEditState {
  thoughtSignature?: string;
  previousParts?: any[];
}

export async function editImage(
  prompt: string,
  imageBase64: string,
  state?: ImageEditState
) {
  try {
    const contents = [];

    // Include previous conversation if editing
    if (state?.previousParts) {
      contents.push(...state.previousParts);
    }

    // Add current image and edit request
    contents.push({
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64,
          },
        },
        { text: prompt },
      ],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents,
    });

    // Extract edited image and thoughtSignature
    let editedImage: Buffer | null = null;
    let newThoughtSignature: string | undefined;

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        editedImage = Buffer.from(imageData, "base64");
      }
      if (part.thoughtSignature) {
        newThoughtSignature = part.thoughtSignature;
      }
    }

    if (!editedImage) {
      throw new Error("No image data in response");
    }

    return {
      image: editedImage,
      state: {
        thoughtSignature: newThoughtSignature,
        previousParts: contents.concat(response.candidates[0].content.parts),
      },
    };
  } catch (error) {
    console.error("Gemini image editing error:", error);
    throw new Error("Failed to edit image");
  }
}





