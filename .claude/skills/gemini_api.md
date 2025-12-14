# Gemini API Integration Skill

## Description
Guidelines for integrating Google's Gemini API using the official `@google/genai` package.

## Models

| Model ID | Use Case | Context Window |
|----------|----------|----------------|
| `gemini-3-pro-preview` | Complex reasoning, text generation | 1M / 64k |
| `gemini-3-pro-image-preview` | Image generation/editing (Magic Pen) | 65k / 32k |
| `gemini-2.5-pro` | Strong reasoning with long context (optional) | 1M / 64k |
| `gemini-2.5-flash` | Fast + cost-effective (OCR, simple analysis) | 1M / 64k |

## Basic Setup Template

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});
// API key automatically read from GOOGLE_API_KEY env var
// Text model can be selected via GEMINI_TEXT_MODEL env var:
// - gemini-2.5-flash (default)
// - gemini-2.5-pro
// - gemini-3-pro-preview

// Text generation
const response = await ai.models.generateContent({
  model: process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash",
  contents: "Your prompt here",
});
```

## Image Generation Template

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: "Generate a visualization of the current weather in Tokyo.",
  config: {
    tools: [{ googleSearch: {} }], // For grounded generation
    imageConfig: {
      aspectRatio: "16:9", // or "1:1", "9:16"
      imageSize: "4K" // or "2K"
    }
  }
});

// Extract image from response
for (const part of response.candidates[0].content.parts) {
  if (part.inlineData) {
    const imageData = part.inlineData.data;
    const buffer = Buffer.from(imageData, "base64");
    // Save or use image
  }
}
```

## Image Editing (Conversational) Template

```typescript
// IMPORTANT: Must preserve thoughtSignature for multi-turn editing
const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: [
    // Previous turn's response (with thoughtSignature)
    previousResponse,
    // New edit request
    { text: "Change the background to sunset" }
  ]
});

// Extract thoughtSignature from response for next turn
const thoughtSignature = response.candidates[0].content.parts
  .find(p => p.thoughtSignature)?.thoughtSignature;
```

## Thinking Level Configuration

```typescript
const response = await ai.models.generateContent({
  model: "gemini-3-pro-preview",
  contents: "Simple question here",
  config: {
    thinkingConfig: {
      thinkingLevel: "low" // "low" for speed, "high" (default) for complex reasoning
    }
  }
});
```

## Media Resolution (for images/PDFs/videos)

```typescript
// For high-quality image analysis
const response = await ai.models.generateContent({
  model: "gemini-3-pro-preview",
  contents: [
    {
      parts: [
        { text: "What is in this image?" },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
          mediaResolution: {
            level: "media_resolution_high" // 1120 tokens for images
          }
        }
      ]
    }
  ]
});
```

## Best Practices

1. **Temperature**: Keep default 1.0 (don't change - causes loops)
2. **Thinking Level**: Use "low" for simple tasks, "high" (default) for complex reasoning
3. **Image Resolution**: Use `media_resolution_high` for images, `medium` for PDFs
4. **Thought Signature**: Always preserve for conversational image editing
5. **Error Handling**: Wrap in try-catch, implement retry logic
6. **Rate Limits**: Implement exponential backoff

## Security

- Store API key in `.env.local` as `GOOGLE_API_KEY`
- Use server-side API routes (Next.js API routes)
- Never expose API key to client-side code
