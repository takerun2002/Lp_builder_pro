import type { Citation, DeepResearchResult } from "@/lib/research/types";

export interface QualityScoreOptions {
  minRecommendations?: number;
  minCitations?: number;
  allowMissingCitations?: boolean;
  passThreshold?: number;
  partialThreshold?: number;
  authorityDomains?: string[];
  keywords?: string[];
}

export interface QualityScoreResult {
  coverageScore: number;
  specificityScore: number;
  actionabilityScore: number;
  citationScore: number;
  qualityScore: number;
  status: "pass" | "partial" | "fail";
  missingFields: string[];
}

const DEFAULT_OPTIONS: Required<QualityScoreOptions> = {
  minRecommendations: 3,
  minCitations: 2,
  allowMissingCitations: false,
  passThreshold: 0.75,
  partialThreshold: 0.6,
  authorityDomains: [],
  keywords: [],
};

export function scoreDeepResearchResult(
  result: DeepResearchResult,
  options?: QualityScoreOptions
): QualityScoreResult {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const missingFields = getMissingFields(result, config);
  const coverageScore = 1 - missingFields.length / 5;

  const combinedText = [
    result.trendReport,
    result.marketAnalysis,
    result.psychologyInsights,
    result.recommendations.join("\n"),
  ].join("\n");

  const specificityScore = computeSpecificityScore(combinedText);
  const actionabilityScore = Math.min(1, result.recommendations.length / 5);
  const citationScore = computeCitationScore(result.citations, config);

  const qualityScore =
    coverageScore * 0.35 +
    citationScore * 0.3 +
    specificityScore * 0.2 +
    actionabilityScore * 0.15;

  const status =
    qualityScore >= config.passThreshold
      ? "pass"
      : qualityScore >= config.partialThreshold
        ? "partial"
        : "fail";

  return {
    coverageScore,
    specificityScore,
    actionabilityScore,
    citationScore,
    qualityScore,
    status,
    missingFields,
  };
}

function getMissingFields(
  result: DeepResearchResult,
  options: Required<QualityScoreOptions>
): string[] {
  const missing: string[] = [];

  if (!isNonEmpty(result.trendReport)) missing.push("trendReport");
  if (!isNonEmpty(result.marketAnalysis)) missing.push("marketAnalysis");
  if (!isNonEmpty(result.psychologyInsights)) missing.push("psychologyInsights");
  if (result.recommendations.length < options.minRecommendations) missing.push("recommendations");

  const citationCount = filterValidCitations(result.citations).length;
  if (!options.allowMissingCitations && citationCount < options.minCitations) {
    missing.push("citations");
  }

  return missing;
}

function computeSpecificityScore(text: string): number {
  const numericFacts = (text.match(/\d+(\.\d+)?/g) || []).length;
  const bullets = (text.match(/\n[-*]\s/g) || []).length;
  return Math.min(1, (numericFacts + bullets) / 8);
}

function computeCitationScore(
  citations: Citation[],
  options: Required<QualityScoreOptions>
): number {
  const urls = filterValidCitations(citations).map((c) => c.url);
  if (urls.length === 0) return 0;

  const domains = urls.map((url) => getDomain(url)).filter(Boolean) as string[];
  const distinctDomains = new Set(domains);

  const authorityScores = urls.map((url) => getAuthorityScore(url, options.authorityDomains));
  const authorityScore = average(authorityScores);

  const relevanceScore = computeRelevanceScore(urls, options.keywords);
  const domainDiversityScore = Math.min(1, distinctDomains.size / 2);

  return authorityScore * 0.6 + relevanceScore * 0.2 + domainDiversityScore * 0.2;
}

function filterValidCitations(citations: Citation[]): Citation[] {
  return citations.filter((c) => typeof c.url === "string" && c.url.startsWith("https://"));
}

function getAuthorityScore(url: string, authorityDomains: string[]): number {
  const domain = getDomain(url);
  if (!domain) return 0.2;

  const lower = domain.toLowerCase();
  if (lower.endsWith(".gov") || lower.endsWith(".edu") || lower.endsWith(".go.jp") || lower.endsWith(".ac.jp")) {
    return 1.0;
  }

  if (authorityDomains.some((d) => lower === d || lower.endsWith(`.${d}`))) {
    return 0.8;
  }

  if (lower.includes("news")) return 0.5;

  return 0.2;
}

function computeRelevanceScore(urls: string[], keywords: string[]): number {
  if (keywords.length === 0) return 0.5;

  let hits = 0;
  for (const url of urls) {
    const lower = url.toLowerCase();
    for (const keyword of keywords) {
      if (keyword && lower.includes(keyword.toLowerCase())) {
        hits += 1;
        break;
      }
    }
  }

  return Math.min(1, hits / 3);
}

function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isNonEmpty(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
