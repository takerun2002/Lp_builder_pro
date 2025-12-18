/**
 * リサーチアナライザー エクスポート
 */

// Concept Extractor
export {
  extractConcept,
  extractConceptsBulk,
  evaluateSalesLetterStrength,
  exportToCSV as exportConceptToCSV,
  exportToSpreadsheetData as exportConceptToSpreadsheet,
  type CompetitorAnalysis,
  type ConceptExtractionOptions,
  type BulkConceptResult,
} from "./concept-extractor";

// Pain Classifier
export {
  classifyPainPoints,
  classifyPainPointSimple,
  groupSimilarPains,
  getQuadrantDescription,
  exportToCSV as exportPainPointsToCSV,
  type ClassifiedPainPoint,
  type PainClassificationResult,
  type PainClassificationOptions,
  type PainQuadrant,
  type DepthScore,
  type UrgencyScore,
} from "./pain-classifier";

// Keyword Ranker
export {
  rankKeywords,
  extractKeywordsFromPainPoints,
  categorizeKeywords,
  generateKeywordBankSummary,
  exportToCSV as exportKeywordsToCSV,
  exportToSpreadsheetData as exportKeywordsToSpreadsheet,
  type RankedKeyword,
  type KeywordRankingResult,
  type KeywordRankingOptions,
  type KeywordSource,
  type KeywordCategory,
} from "./keyword-ranker";
