---
paths:
  - src/lib/ai/**/*.ts
---

# Gemini API Common Mistakes

## ❌ Wrong Package Name
```typescript
// WRONG
import { GoogleGenerativeAI } from "@google/generative-ai";

// CORRECT
import { GoogleGenAI } from "@google/genai";
```

## ❌ Wrong Model Names
```typescript
// WRONG
model: "gemini-2.5-flash-image-generation"
model: "gemini-2.0-flash-exp"

// CORRECT
model: "gemini-3-pro-image-preview"  // Image generation
model: "gemini-3-pro-preview"         // Text/reasoning
model: "gemini-2.5-flash"             // Lightweight tasks
model: "gemini-2.5-pro"               // Strong reasoning with long context
```

## ❌ Wrong Initialization
```typescript
// WRONG
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// CORRECT
const ai = new GoogleGenAI({});
// API key auto-read from GOOGLE_API_KEY env var
```

## ❌ Wrong Method Name
```typescript
// WRONG
genAI.getGenerativeModel({ model: "..." });

// CORRECT
ai.models.generateContent({ model: "...", contents: "..." });
```

## ❌ Changing Temperature
```typescript
// WRONG - Causes loops and performance issues
config: { temperature: 0.7 }

// CORRECT - Keep default 1.0
// Don't set temperature parameter
```

## ❌ Missing thoughtSignature (Image Editing)
```typescript
// WRONG - Multi-turn editing won't work
const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: [newEditRequest],
});

// CORRECT - Preserve thoughtSignature
const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: [
    previousResponseWithSignature, // Include previous turn
    newEditRequest
  ],
});
```

## ✅ Quick Reference
- Package: `@google/genai` (NOT `@google/generative-ai`)
- Class: `GoogleGenAI` (NOT `GoogleGenerativeAI`)
- Method: `ai.models.generateContent()` (NOT `getGenerativeModel()`)
- Image Model: `gemini-3-pro-image-preview` (NOT `gemini-2.5-flash-image-generation`)
- Temperature: Don't set (keep default 1.0)
- thoughtSignature: Required for multi-turn image editing

