---
paths:
  - src/lib/ai/**/*.ts
---

# Gemini API Rules

## Package & Import
- Use `@google/genai` package (NOT `@google/generative-ai`)
- Import: `import { GoogleGenAI } from "@google/genai"`
- Initialize: `const ai = new GoogleGenAI({})` (API key auto-detected from env)

## Models
- **Text (selectable)**: `gemini-2.5-flash` / `gemini-2.5-pro` / `gemini-3-pro-preview`
- **Image Generation**: `gemini-3-pro-image-preview`
- **Default text model**: controlled by `GEMINI_TEXT_MODEL` (see `.env.example`)
- **Fallback**: transient errors (429/5xx) can fallback `flash -> pro -> 3pro` (see `src/lib/ai/gemini.ts`)

## Common Mistakes to Avoid
1. ❌ Wrong package: `@google/generative-ai` → ✅ Use `@google/genai`
2. ❌ Wrong model name: `gemini-2.5-flash-image-generation` → ✅ Use `gemini-3-pro-image-preview`
3. ❌ Changing temperature: Keep default 1.0 (changing causes loops)
4. ❌ Missing thoughtSignature: Required for image editing workflows

## Error Handling
- Always wrap in try-catch
- Return structured errors
- Handle rate limits with backoff

## Templates
Ready-to-use templates in `.claude/templates/`:
- `gemini_basic.ts` - Basic text generation
- `gemini_image_generation.ts` - Image generation (Magic Pen)
- `gemini_image_editing.ts` - Conversational image editing
- `gemini_ocr.ts` - Text extraction from images
