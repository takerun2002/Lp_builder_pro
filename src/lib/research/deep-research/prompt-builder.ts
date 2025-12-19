import type { ResearchContext } from "@/lib/research/types";

export type PromptKind = "base" | "persona" | "competitor";

export interface PromptBuildInput {
  context: ResearchContext;
  genreLabel?: string;
  targetSummary?: string;
  moods?: string;
  genreOverlay?: string;
}

export const GENRE_OVERLAYS: Record<string, string> = {
  beauty: "Beauty and skincare context. Prioritize evidence and review patterns.",
  health: "Health and wellness context. Focus on symptoms and adherence barriers.",
  business: "Business and monetization context. Emphasize repeatability and proof.",
  education: "Learning and upskilling context. Emphasize friction and success paths.",
  romance: "Romance and relationship context. Emphasize emotional barriers and change.",
  spiritual: "Spiritual context. Emphasize belief formation and testimonies.",
  other: "General LP optimization context.",
};

export const BASE_DEEP_RESEARCH_PROMPT = `
You are an LP and sales copy expert. Use web research and provide grounded insights.
Return JSON only. Do not use Markdown.

Inputs:
- Genre: {{genreLabel}}
- Sub-genre: {{subGenre}}
- Target: {{targetSummary}}
- Problems: {{problems}}
- Desires: {{desires}}
- Tone: {{moods}}
- Notes: {{freeText}}
- Genre overlay: {{genreOverlay}}

Required output (JSON only):
{
  "trendReport": "string",
  "marketAnalysis": "string",
  "psychologyInsights": "string",
  "recommendations": ["string"],
  "citations": ["https://..."]
}

Rules:
- citations must be https URLs
- unknown fields must be empty string or empty array
`;

export const N1_PERSONA_PROMPT = `
Create a single realistic persona based on the user's pains and desires.
Use web research for real-world wording. Return JSON only.

Inputs:
- Genre: {{genreLabel}}
- Target: {{targetSummary}}
- Problems: {{problems}}
- Desires: {{desires}}
- Notes: {{freeText}}
- Genre overlay: {{genreOverlay}}

Required output (JSON only):
{
  "persona": {
    "name": "string",
    "age": 0,
    "occupation": "string",
    "context": "string",
    "painQuotes": ["string"],
    "desireQuotes": ["string"],
    "triggers": ["string"],
    "hesitations": ["string"],
    "tone": "string"
  },
  "citations": ["https://..."]
}
`;

export const COMPETITOR_ANALYSIS_PROMPT = `
Find 5-10 high-performing LPs in the target genre and summarize patterns.
Return JSON only.

Inputs:
- Genre: {{genreLabel}}
- Sub-genre: {{subGenre}}
- Target: {{targetSummary}}
- Notes: {{freeText}}
- Genre overlay: {{genreOverlay}}

Required output (JSON only):
{
  "commonStructure": ["string"],
  "headlinePatterns": ["string"],
  "ctaPatterns": ["string"],
  "proofElements": ["string"],
  "psychologicalTriggers": ["string"],
  "notableExamples": [{"url": "string", "notes": "string"}],
  "citations": ["https://..."]
}
`;

export function buildPrompt(input: PromptBuildInput, kind: PromptKind = "base"): string {
  const context = input.context;
  const genreOverlay = input.genreOverlay || GENRE_OVERLAYS[context.genre] || GENRE_OVERLAYS.other;

  const vars: Record<string, string> = {
    genreLabel: input.genreLabel || context.genre,
    subGenre: context.subGenre || "n/a",
    targetSummary: input.targetSummary || buildTargetSummary(context),
    problems: context.target.problems || "n/a",
    desires: context.target.desires || "n/a",
    moods: input.moods || context.toneManner?.moods?.join(", ") || "n/a",
    freeText: context.freeText || "n/a",
    genreOverlay,
  };

  const template =
    kind === "persona"
      ? N1_PERSONA_PROMPT
      : kind === "competitor"
        ? COMPETITOR_ANALYSIS_PROMPT
        : BASE_DEEP_RESEARCH_PROMPT;

  return renderTemplate(template, vars);
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => normalizeValue(vars[key]));
}

function normalizeValue(value?: string): string {
  if (!value) return "n/a";
  return value.replace(/\s+/g, " ").trim();
}

function buildTargetSummary(context: ResearchContext): string {
  const age = context.target.ageGroups.join(", ");
  const gender = context.target.gender;
  const occupation = context.target.occupation ? `, ${context.target.occupation}` : "";
  return `${age} ${gender}${occupation}`.trim();
}
