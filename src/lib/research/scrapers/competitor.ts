/**
 * 競合LP分析スクレイパー
 *
 * Google検索から競合LPを発見し、構成・デザインを分析
 * AI駆動の高精度分析対応
 */

import { searchAndScrape, scrapeUrl, analyzeLPStructure } from "../firecrawl";
import {
  analyzeLPWithAI,
  analyzeCompetitorWithAI,
  calculateSimilarityWithAI,
  type CompetitorAnalysisResult as AICompetitorAnalysis,
} from "../ai-analyzer";
import type {
  CompetitorLPResult,
  LPStructure,
  CopyElements,
  DesignElements,
  SectionType,
  ResearchContext,
} from "../types";

export interface CompetitorSearchOptions {
  query?: string;
  genre: string;
  region?: string;
  limit?: number;
  useAI?: boolean;
}

export interface EnhancedCompetitorLPResult extends CompetitorLPResult {
  // AI分析による追加情報
  aiAnalysis?: AICompetitorAnalysis;
  similarityFactors?: string[];
  similarityRationale?: string;
}

/**
 * 競合LPを検索・分析
 */
export async function searchCompetitorLPs(
  context: ResearchContext,
  options?: CompetitorSearchOptions
): Promise<EnhancedCompetitorLPResult[]> {
  const limit = options?.limit || 5;
  const region = options?.region || context.searchConfig.regions[0] || "japan";
  const useAI = options?.useAI ?? false;

  // 検索クエリを構築
  const searchQuery = buildSearchQuery(context, options?.query);

  console.log("[competitor] Searching:", searchQuery, { useAI });

  try {
    // Google検索でLPを発見
    const searchResults = await searchAndScrape(searchQuery, {
      limit: limit * 2, // 多めに取得して絞り込む
      region,
    });

    if (searchResults.length === 0) {
      console.warn("[competitor] No search results, using simulated data");
      return getSimulatedCompetitors(context, limit);
    }

    // 各LPを詳細分析
    const results: EnhancedCompetitorLPResult[] = [];

    for (const sr of searchResults) {
      if (results.length >= limit) break;

      if (!sr.metadata?.title) continue;

      let structure: LPStructure;
      let copyElements: CopyElements;
      let aiAnalysis: AICompetitorAnalysis | undefined;
      let similarityScore: number;
      let similarityFactors: string[] | undefined;
      let similarityRationale: string | undefined;

      // AI分析を使用する場合
      if (useAI && sr.markdown) {
        // LP構造のAI分析
        const lpAnalysis = await analyzeLPWithAI(sr.markdown, {
          genre: context.genre,
        });

        structure = {
          sections: lpAnalysis.sections.map((s, i) => ({
            index: i,
            type: s.type as SectionType,
            name: s.name || `セクション${i + 1}`,
            startY: i * 500,
            endY: (i + 1) * 500,
          })),
          totalHeight: lpAnalysis.sections.length * 500,
          sectionCount: lpAnalysis.sections.length,
        };

        copyElements = {
          headline: lpAnalysis.headlines[0] || "",
          subheadlines: lpAnalysis.subheadlines || lpAnalysis.headlines.slice(1, 5),
          ctaTexts: lpAnalysis.ctaTexts,
          keyPhrases: lpAnalysis.keyPhrases,
        };

        // 競合詳細分析
        aiAnalysis = await analyzeCompetitorWithAI(sr.markdown, {
          genre: context.genre,
          targetProblems: context.target.problems || "",
          targetDesires: context.target.desires || "",
        });

        // AI類似度計算
        const similarityResult = await calculateSimilarityWithAI(sr.markdown, {
          genre: context.genre,
          targetProblems: context.target.problems || "",
          targetDesires: context.target.desires || "",
        });

        similarityScore = similarityResult.score;
        similarityFactors = similarityResult.factors;
        similarityRationale = similarityResult.rationale;
      } else {
        // 従来の分析
        const analysis = sr.markdown
          ? analyzeLPStructure(sr.markdown)
          : { sections: [], headlines: [], ctaTexts: [] };

        structure = {
          sections: analysis.sections.map((s, i) => ({
            index: i,
            type: s.type as SectionType,
            name: analysis.headlines[i] || `セクション${i + 1}`,
            startY: i * 500,
            endY: (i + 1) * 500,
          })),
          totalHeight: analysis.sections.length * 500,
          sectionCount: analysis.sections.length,
        };

        copyElements = {
          headline: analysis.headlines[0] || "",
          subheadlines: analysis.headlines.slice(1, 5),
          ctaTexts: analysis.ctaTexts,
          keyPhrases: extractKeyPhrases(sr.markdown || ""),
        };

        similarityScore = calculateSimilarity(context, analysis, sr.metadata);
      }

      results.push({
        url: "",
        title: sr.metadata.title || "Unknown",
        screenshotUrl: sr.metadata.ogImage || "",
        structure,
        copyElements,
        designElements: extractDesignElements(sr.markdown || ""),
        similarityScore,
        aiAnalysis,
        similarityFactors,
        similarityRationale,
      });
    }

    // 類似度順にソート
    results.sort((a, b) => b.similarityScore - a.similarityScore);

    return results.length > 0 ? results : getSimulatedCompetitors(context, limit);
  } catch (err) {
    console.error("[competitor] Error:", err);
    return getSimulatedCompetitors(context, limit);
  }
}

/**
 * 単一LPを詳細分析
 */
export async function analyzeCompetitorLP(
  url: string,
  options?: {
    useAI?: boolean;
    context?: {
      genre: string;
      targetProblems?: string;
      targetDesires?: string;
    };
  }
): Promise<EnhancedCompetitorLPResult | null> {
  try {
    const result = await scrapeUrl(url, {
      formats: ["markdown", "screenshot"],
      onlyMainContent: false,
      waitFor: 3000,
    });

    if (!result.success || !result.markdown) {
      return null;
    }

    // AI分析を使用する場合
    if (options?.useAI) {
      const lpAnalysis = await analyzeLPWithAI(result.markdown, {
        genre: options.context?.genre,
        url,
      });

      let aiCompetitorAnalysis: AICompetitorAnalysis | undefined;
      let similarityScore = 0.8;
      let similarityFactors: string[] | undefined;
      let similarityRationale: string | undefined;

      if (options.context) {
        aiCompetitorAnalysis = await analyzeCompetitorWithAI(result.markdown, {
          genre: options.context.genre,
          targetProblems: options.context.targetProblems,
          targetDesires: options.context.targetDesires,
        });

        if (options.context.targetProblems && options.context.targetDesires) {
          const simResult = await calculateSimilarityWithAI(result.markdown, {
            genre: options.context.genre,
            targetProblems: options.context.targetProblems,
            targetDesires: options.context.targetDesires,
          });
          similarityScore = simResult.score;
          similarityFactors = simResult.factors;
          similarityRationale = simResult.rationale;
        }
      }

      return {
        url,
        title: result.metadata?.title || "Unknown",
        screenshotUrl: result.screenshot || "",
        structure: {
          sections: lpAnalysis.sections.map((s, i) => ({
            index: i,
            type: s.type as SectionType,
            name: s.name || `セクション${i + 1}`,
            startY: i * 500,
            endY: (i + 1) * 500,
          })),
          totalHeight: lpAnalysis.sections.length * 500,
          sectionCount: lpAnalysis.sections.length,
        },
        copyElements: {
          headline: lpAnalysis.headlines[0] || "",
          subheadlines: lpAnalysis.subheadlines || lpAnalysis.headlines.slice(1, 5),
          ctaTexts: lpAnalysis.ctaTexts,
          keyPhrases: lpAnalysis.keyPhrases,
        },
        designElements: extractDesignElements(result.markdown),
        similarityScore,
        aiAnalysis: aiCompetitorAnalysis,
        similarityFactors,
        similarityRationale,
      };
    }

    // 従来の分析
    const analysis = analyzeLPStructure(result.markdown);

    return {
      url,
      title: result.metadata?.title || "Unknown",
      screenshotUrl: result.screenshot || "",
      structure: {
        sections: analysis.sections.map((s, i) => ({
          index: i,
          type: s.type as SectionType,
          name: analysis.headlines[i] || `セクション${i + 1}`,
          startY: i * 500,
          endY: (i + 1) * 500,
        })),
        totalHeight: analysis.sections.length * 500,
        sectionCount: analysis.sections.length,
      },
      copyElements: {
        headline: analysis.headlines[0] || "",
        subheadlines: analysis.headlines.slice(1, 5),
        ctaTexts: analysis.ctaTexts,
        keyPhrases: extractKeyPhrases(result.markdown),
      },
      designElements: extractDesignElements(result.markdown),
      similarityScore: 0.8,
    };
  } catch (err) {
    console.error("[competitor] Analyze error:", err);
    return null;
  }
}

/**
 * 検索クエリを構築
 */
function buildSearchQuery(
  context: ResearchContext,
  customQuery?: string
): string {
  if (customQuery) return customQuery;

  const genreTerms: Record<string, string> = {
    beauty: "美容 スキンケア LP",
    health: "健康 サプリ ダイエット LP",
    education: "オンライン講座 教材 LP",
    business: "副業 ビジネス LP",
    investment: "投資 FX 株 LP",
    romance: "恋愛 婚活 LP",
    spiritual: "スピリチュアル 占い LP",
    other: "商品 LP ランディングページ",
  };

  let query = genreTerms[context.genre] || genreTerms.other;

  // サブジャンルを追加
  if (context.subGenre) {
    query = `${context.subGenre} ${query}`;
  }

  // ターゲット情報を追加
  if (context.target.gender === "female") {
    query += " 女性向け";
  } else if (context.target.gender === "male") {
    query += " 男性向け";
  }

  return query;
}

/**
 * 類似度スコアを計算
 */
function calculateSimilarity(
  context: ResearchContext,
  analysis: { sections: { type: string; content: string }[]; headlines: string[] },
  metadata: { title?: string; description?: string }
): number {
  let score = 0.5; // 基本スコア

  // ジャンルマッチング
  const genreKeywords: Record<string, string[]> = {
    beauty: ["美容", "スキンケア", "化粧品", "美肌", "エイジング"],
    health: ["健康", "サプリ", "ダイエット", "痩せる", "体質改善"],
    education: ["講座", "学習", "教材", "スキル", "資格"],
    business: ["副業", "稼ぐ", "収入", "ビジネス", "マーケティング"],
    investment: ["投資", "FX", "株", "仮想通貨", "資産"],
    romance: ["恋愛", "婚活", "出会い", "モテる", "復縁"],
    spiritual: ["スピリチュアル", "占い", "開運", "引き寄せ"],
  };

  const keywords = genreKeywords[context.genre] || [];
  const text = (metadata.title || "") + (metadata.description || "");

  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      score += 0.1;
    }
  }

  // セクション数に基づくスコア調整
  if (analysis.sections.length >= 5) {
    score += 0.1;
  }

  // 見出し数に基づくスコア調整
  if (analysis.headlines.length >= 3) {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}

/**
 * キーフレーズを抽出
 */
function extractKeyPhrases(markdown: string): string[] {
  const phrases: string[] = [];
  const text = markdown.toLowerCase();

  // よく使われるセールスフレーズを検出
  const salesPhrases = [
    "今だけ",
    "限定",
    "特別",
    "無料",
    "保証",
    "実績",
    "満足度",
    "簡単",
    "即効",
    "効果",
    "人気",
    "話題",
    "おすすめ",
    "安心",
    "信頼",
  ];

  for (const phrase of salesPhrases) {
    if (text.includes(phrase)) {
      phrases.push(phrase);
    }
  }

  return phrases.slice(0, 10);
}

/**
 * デザイン要素を抽出（マークダウンから推測）
 */
function extractDesignElements(markdown: string): DesignElements {
  const hasVideo =
    markdown.includes("動画") ||
    markdown.includes("video") ||
    markdown.includes("youtube");
  const hasAnimation =
    markdown.includes("アニメーション") || markdown.includes("animation");

  // デフォルト値を返す（実際の分析にはスクリーンショット/HTML解析が必要）
  return {
    primaryColor: "#2563EB",
    secondaryColor: "#7C3AED",
    fontStyle: "modern",
    layoutType: "single",
    hasVideo,
    hasAnimation,
  };
}

/**
 * シミュレートされた競合データ（フォールバック用）
 */
function getSimulatedCompetitors(
  context: ResearchContext,
  limit: number
): CompetitorLPResult[] {
  const templates: CompetitorLPResult[] = [
    {
      url: "https://example.com/competitor1",
      title: `【${context.genre === "beauty" ? "美容" : "人気"}】効果実感LP例`,
      screenshotUrl: "",
      structure: {
        sections: [
          { index: 0, type: "hero", name: "ヒーロー", startY: 0, endY: 500 },
          { index: 1, type: "problem", name: "悩み共感", startY: 500, endY: 1000 },
          { index: 2, type: "solution", name: "解決策", startY: 1000, endY: 1500 },
          { index: 3, type: "features", name: "特徴", startY: 1500, endY: 2000 },
          { index: 4, type: "testimonials", name: "お客様の声", startY: 2000, endY: 2500 },
          { index: 5, type: "pricing", name: "価格", startY: 2500, endY: 3000 },
          { index: 6, type: "cta", name: "CTA", startY: 3000, endY: 3500 },
        ],
        totalHeight: 3500,
        sectionCount: 7,
      },
      copyElements: {
        headline: "たった3ステップで理想の結果を",
        subheadlines: ["なぜ今までの方法では上手くいかなかったのか", "97%が効果を実感"],
        ctaTexts: ["今すぐ始める", "無料で試す"],
        keyPhrases: ["限定", "保証", "実績"],
      },
      designElements: {
        primaryColor: "#E91E63",
        secondaryColor: "#9C27B0",
        fontStyle: "modern",
        layoutType: "single",
        hasVideo: true,
        hasAnimation: false,
      },
      similarityScore: 0.92,
    },
    {
      url: "https://example.com/competitor2",
      title: "専門家監修の信頼系LP例",
      screenshotUrl: "",
      structure: {
        sections: [
          { index: 0, type: "hero", name: "ヒーロー", startY: 0, endY: 600 },
          { index: 1, type: "about", name: "監修者紹介", startY: 600, endY: 1100 },
          { index: 2, type: "problem", name: "課題", startY: 1100, endY: 1600 },
          { index: 3, type: "solution", name: "メソッド", startY: 1600, endY: 2200 },
          { index: 4, type: "testimonials", name: "事例", startY: 2200, endY: 2800 },
          { index: 5, type: "guarantee", name: "保証", startY: 2800, endY: 3200 },
          { index: 6, type: "faq", name: "FAQ", startY: 3200, endY: 3800 },
          { index: 7, type: "cta", name: "申込", startY: 3800, endY: 4200 },
        ],
        totalHeight: 4200,
        sectionCount: 8,
      },
      copyElements: {
        headline: "専門家が教える、本当に効果のある方法",
        subheadlines: ["10年の研究から生まれた", "医学的根拠に基づく"],
        ctaTexts: ["詳細を見る", "今すぐ申し込む"],
        keyPhrases: ["専門家", "監修", "実績", "信頼"],
      },
      designElements: {
        primaryColor: "#1A1A1A",
        secondaryColor: "#D4AF37",
        fontStyle: "elegant",
        layoutType: "single",
        hasVideo: false,
        hasAnimation: false,
      },
      similarityScore: 0.88,
    },
    {
      url: "https://example.com/competitor3",
      title: "緊急性訴求型LP例",
      screenshotUrl: "",
      structure: {
        sections: [
          { index: 0, type: "hero", name: "限定オファー", startY: 0, endY: 500 },
          { index: 1, type: "problem", name: "今すぐ解決すべき理由", startY: 500, endY: 1000 },
          { index: 2, type: "solution", name: "即効性", startY: 1000, endY: 1500 },
          { index: 3, type: "pricing", name: "特別価格", startY: 1500, endY: 2000 },
          { index: 4, type: "cta", name: "今すぐ", startY: 2000, endY: 2500 },
        ],
        totalHeight: 2500,
        sectionCount: 5,
      },
      copyElements: {
        headline: "【本日限定】特別価格でご案内",
        subheadlines: ["残り3名様のみ", "24時間以内に決断を"],
        ctaTexts: ["今すぐ申し込む", "限定価格で購入"],
        keyPhrases: ["限定", "今だけ", "特別", "残りわずか"],
      },
      designElements: {
        primaryColor: "#DC2626",
        secondaryColor: "#F59E0B",
        fontStyle: "bold",
        layoutType: "single",
        hasVideo: true,
        hasAnimation: true,
      },
      similarityScore: 0.85,
    },
  ];

  return templates.slice(0, limit).map((t, i) => ({
    ...t,
    similarityScore: 0.95 - i * 0.05,
  }));
}

/**
 * 競合LP間の共通パターンを抽出
 */
export function extractCommonPatterns(
  competitors: CompetitorLPResult[]
): {
  commonSections: SectionType[];
  avgSectionCount: number;
  topHeadlinePatterns: string[];
  topCTAPatterns: string[];
} {
  const sectionCounts: Record<string, number> = {};
  const allHeadlines: string[] = [];
  const allCTAs: string[] = [];

  for (const comp of competitors) {
    for (const section of comp.structure.sections) {
      sectionCounts[section.type] = (sectionCounts[section.type] || 0) + 1;
    }
    allHeadlines.push(comp.copyElements.headline);
    allCTAs.push(...comp.copyElements.ctaTexts);
  }

  // 出現頻度でソート
  const commonSections = Object.entries(sectionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type as SectionType);

  const avgSectionCount = competitors.length > 0
    ? Math.round(
        competitors.reduce((sum, c) => sum + c.structure.sectionCount, 0) /
          competitors.length
      )
    : 7;

  return {
    commonSections,
    avgSectionCount,
    topHeadlinePatterns: Array.from(new Set(allHeadlines)).slice(0, 5),
    topCTAPatterns: Array.from(new Set(allCTAs)).slice(0, 5),
  };
}


