# LP Scraping Skill

## Description
Guidelines for implementing the full-page LP scraping functionality.

## Key Concepts
- **Full-page capture**: Use Playwright for headless browser automation.
- **Tile capture**: Scroll and capture tiles, then stitch together.
- **Section detection**: Use Gemini 2.5 Flash to detect section boundaries.

## Implementation Steps
1. Accept URL input from user.
2. Launch Playwright headless browser.
3. Navigate to URL, wait for full load.
4. Auto-scroll and capture viewport tiles.
5. Stitch tiles into full-page image.
6. Send to Gemini 2.5 Flash for section boundary detection.
7. Split image by sections.
8. Extract colors using Canvas API.
9. Save as swipe file.

## Tech Stack
- Playwright 1.x for browser automation
- sharp for image processing
- Gemini 2.5 Flash for OCR and section detection
- Canvas API for color extraction





