# Magic Pen Implementation Skill

## Description
Guidelines for implementing Magic Pen functionality - the core differentiator of LP Builder Pro.

## Key Concepts
- **Coordinate-based editing**: User draws on canvas, we capture bounding box (x, y, width, height).
- **Gemini integration**: Send full image + coordinates + instruction to Gemini for regeneration.
- **Canvas library**: Use Fabric.js for drawing and selection.

## Implementation Steps
1. Set up Fabric.js canvas overlay on the LP preview.
2. Implement drawing tools (freehand, rectangle selection).
3. Calculate bounding box from user's drawing.
4. Send to Gemini API with structured prompt.
5. Display regenerated image and highlight changes.

## Prompt Template
```
This image's region at coordinates (x:{x}, y:{y}, w:{width}, h:{height}) needs modification.
User's instruction: "{userInstruction}"
Please regenerate the entire image with the specified region improved according to the instruction.
```

## Tech Stack
- Fabric.js 5.x for canvas manipulation
- @google/generative-ai for Gemini API
- React state for tool selection





