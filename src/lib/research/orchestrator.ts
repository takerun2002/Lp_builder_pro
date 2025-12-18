/**
 * リサーチオーケストレーター
 *
 * 複数のリサーチソースを並列実行し、結果を統合
 * AI駆動の高精度分析対応
 */

import { getGeminiClient } from "@/lib/ai/gemini";
import { hybridGenerate, getHybridStats } from "@/lib/ai/hybrid-knowledge";
import { getStorage } from "@/lib/storage/hybrid-storage";
import { scrapeInfotopRanking, scrapeInfotopRankingWithAnalysis, extractPatterns } from "./scrapers/infotop";
import { searchCompetitorLPs, extractCommonPatterns, type EnhancedCompetitorLPResult } from "./scrapers/competitor";
import { analyzeCompetitorAds, type MetaAdAnalysis } from "./scrapers/meta-ads";
import { analyzeChiebukuro, type ChiebukuroAnalysis } from "./scrapers/yahoo-chiebukuro";
import { analyzeAmazonBooks, type AmazonBookAnalysis } from "./scrapers/amazon-books";
import { analyzeYouTube, type YouTubeAnalysis } from "./scrapers/youtube";
import { executeSnsResearch, toSNSTrendResult, type SnsResearchResult } from "./scrapers/sns-scraper";
import type {
  ResearchContext,
  ResearchResult,
  ResearchProgress,
  ResearchStep,
  DeepResearchResult,
  ResearchSynthesis,
  ResearchProposals,
  RecommendedSection,
  HeadlineOption,
  CTAOption,
  SectionType,
  LPPattern,
} from "./types";

export interface ResearchOrchestrationOptions {
  includeInfotop?: boolean;
  includeCompetitor?: boolean;
  includeDeepResearch?: boolean;
  includeSNS?: boolean;
  includeAds?: boolean;
  includeMetaAds?: boolean;
  includeChiebukuro?: boolean;
  includeAmazonBooks?: boolean;
  includeYouTube?: boolean;
  useAI?: boolean;
  onProgress?: (progress: ResearchProgress) => void;
}

// 拡張されたリサーチ結果
export interface EnhancedResearchResult extends ResearchResult {
  metaAdsAnalysis?: MetaAdAnalysis;
  competitorResults?: EnhancedCompetitorLPResult[];
  infotopPriceInsights?: {
    average: number;
    range: { min: number; max: number };
    sweetSpot: string;
  };
  infotopConceptPatterns?: string[];
  // 新規スクレイパー結果
  chiebukuroAnalysis?: ChiebukuroAnalysis;
  amazonBooksAnalysis?: AmazonBookAnalysis;
  youtubeAnalysis?: YouTubeAnalysis;
  // SNS個別結果
  snsXResult?: SnsResearchResult;
  snsInstagramResult?: SnsResearchResult;
  snsTiktokResult?: SnsResearchResult;
}

/**
 * リサーチを実行
 */
export async function runResearch(
  context: ResearchContext,
  options?: ResearchOrchestrationOptions
): Promise<EnhancedResearchResult> {
  const startTime = Date.now();
  const useAI = options?.useAI ?? false;

  const result: EnhancedResearchResult = {
    id: `research-${Date.now()}`,
    context,
    status: "running",
    progress: createInitialProgress(options, context),
    createdAt: new Date().toISOString(),
  };

  const updateProgress = (step: ResearchStep, status: "running" | "completed" | "failed") => {
    const stepIndex = result.progress.steps.findIndex((s) => s.step === step);
    if (stepIndex !== -1) {
      result.progress.steps[stepIndex].status = status;
      result.progress.steps[stepIndex].elapsedMs = Date.now() - startTime;
    }
    result.progress.currentStep = step;
    result.progress.overallPercent = calculateOverallPercent(result.progress.steps);
    options?.onProgress?.(result.progress);
  };

  try {
    // Phase 1: 並列でデータ収集
    console.log("[orchestrator] Phase 1: Parallel data collection", { useAI });
    updateProgress("init", "completed");

    const dataCollectionPromises: Promise<void>[] = [];

    // Infotop分析
    if (context.searchConfig.sources.includes("infotop")) {
      dataCollectionPromises.push(
        (async () => {
          updateProgress("infotop", "running");
          try {
            if (useAI) {
              // AI分析付きで取得
              const analysisResult = await scrapeInfotopRankingWithAnalysis({
                genre: context.genre,
                limit: 10,
                useAI: true,
              });
              result.infotopResults = analysisResult.products;
              result.infotopPriceInsights = analysisResult.priceInsights;
              result.infotopConceptPatterns = analysisResult.conceptPatterns;
            } else {
              result.infotopResults = await scrapeInfotopRanking({
                genre: context.genre,
                limit: 10,
              });
            }
            updateProgress("infotop", "completed");
          } catch (err) {
            console.error("[orchestrator] Infotop error:", err);
            updateProgress("infotop", "failed");
          }
        })()
      );
    }

    // 競合LP分析
    if (context.searchConfig.sources.includes("competitor")) {
      dataCollectionPromises.push(
        (async () => {
          updateProgress("competitor", "running");
          try {
            result.competitorResults = await searchCompetitorLPs(context, {
              limit: 5,
              useAI,
              genre: context.genre,
            });
            updateProgress("competitor", "completed");
          } catch (err) {
            console.error("[orchestrator] Competitor error:", err);
            updateProgress("competitor", "failed");
          }
        })()
      );
    }

    // Meta広告分析
    if (context.searchConfig.sources.includes("ads")) {
      dataCollectionPromises.push(
        (async () => {
          updateProgress("ads", "running");
          try {
            // 競合キーワードでMeta広告を検索
            const competitors = context.subGenre
              ? [context.subGenre, context.genre]
              : [context.genre];

            result.metaAdsAnalysis = await analyzeCompetitorAds(competitors, {
              country: "JP",
              useAI,
              genre: context.genre,
            });

            // adResultsにも変換して格納
            if (result.metaAdsAnalysis?.ads) {
              result.adResults = result.metaAdsAnalysis.ads.map((ad) => ({
                platform: "meta" as const,
                adType: ad.mediaType === "video" ? "video" : "image",
                thumbnailUrl: ad.mediaUrls[0] || "",
                headline: ad.adContent.headline || "",
                description: ad.adContent.bodyText || "",
                callToAction: ad.adContent.ctaText || "",
                landingUrl: ad.adContent.ctaLink || "",
              }));
            }
            updateProgress("ads", "completed");
          } catch (err) {
            console.error("[orchestrator] Meta Ads error:", err);
            updateProgress("ads", "failed");
          }
        })()
      );
    }

    // Yahoo知恵袋分析
    if (context.searchConfig.sources.includes("chiebukuro")) {
      dataCollectionPromises.push(
        (async () => {
          updateProgress("chiebukuro", "running");
          try {
            // ジャンルとターゲットの悩みから検索キーワードを生成
            const searchKeywords = [
              context.genre,
              context.subGenre,
              context.target.problems,
            ].filter(Boolean).join(" ");

            // analyzeChiebukuroは内部でsearchChiebukuroを呼び出す
            result.chiebukuroAnalysis = await analyzeChiebukuro({
              keyword: searchKeywords,
              limit: 20,
              useAI,
            });

            console.log(`[orchestrator] Chiebukuro: found ${result.chiebukuroAnalysis?.questions?.length || 0} questions`);
            updateProgress("chiebukuro", "completed");
          } catch (err) {
            console.error("[orchestrator] Chiebukuro error:", err);
            updateProgress("chiebukuro", "failed");
          }
        })()
      );
    }

    // Amazon書籍分析
    if (context.searchConfig.sources.includes("amazon_books")) {
      dataCollectionPromises.push(
        (async () => {
          updateProgress("amazon_books", "running");
          try {
            const searchKeywords = [
              context.genre,
              context.subGenre,
            ].filter(Boolean).join(" ");

            result.amazonBooksAnalysis = await analyzeAmazonBooks({
              keyword: searchKeywords,
              limit: 20,
              useAI,
            });

            console.log(`[orchestrator] Amazon Books: found ${result.amazonBooksAnalysis?.insights?.totalBooks || 0} books`);
            updateProgress("amazon_books", "completed");
          } catch (err) {
            console.error("[orchestrator] Amazon Books error:", err);
            updateProgress("amazon_books", "failed");
          }
        })()
      );
    }

    // YouTube分析
    if (context.searchConfig.sources.includes("youtube")) {
      dataCollectionPromises.push(
        (async () => {
          updateProgress("youtube", "running");
          try {
            const searchKeywords = [
              context.genre,
              context.subGenre,
            ].filter(Boolean).join(" ");

            result.youtubeAnalysis = await analyzeYouTube({
              keyword: searchKeywords,
              limit: 20,
              useAI,
            });

            console.log(`[orchestrator] YouTube: found ${result.youtubeAnalysis?.insights?.totalVideos || 0} videos`);
            updateProgress("youtube", "completed");
          } catch (err) {
            console.error("[orchestrator] YouTube error:", err);
            updateProgress("youtube", "failed");
          }
        })()
      );
    }

    // SNS X (Twitter) 分析
    if (context.searchConfig.sources.includes("sns_x")) {
      dataCollectionPromises.push(
        (async () => {
          updateProgress("sns_x", "running");
          try {
            const searchKeywords = context.projectName || context.genre;
            result.snsXResult = await executeSnsResearch({
              keyword: searchKeywords,
              platforms: ["x"],
              limit: 50,
              analyzeWithAI: useAI,
            });

            // 既存のsnsResultsにも統合
            if (result.snsXResult) {
              result.snsResults = result.snsResults || { hashtags: [], topics: [], influencers: [] };
              const xResult = toSNSTrendResult(result.snsXResult);
              result.snsResults.hashtags.push(...xResult.hashtags);
              result.snsResults.topics.push(...xResult.topics);
              result.snsResults.influencers.push(...xResult.influencers);
            }

            console.log(`[orchestrator] X: found ${result.snsXResult?.xData?.tweets?.length || 0} tweets`);
            updateProgress("sns_x", "completed");
          } catch (err) {
            console.error("[orchestrator] X error:", err);
            updateProgress("sns_x", "failed");
          }
        })()
      );
    }

    // SNS Instagram 分析
    if (context.searchConfig.sources.includes("sns_instagram")) {
      dataCollectionPromises.push(
        (async () => {
          updateProgress("sns_instagram", "running");
          try {
            const searchKeywords = context.projectName || context.genre;
            result.snsInstagramResult = await executeSnsResearch({
              keyword: searchKeywords,
              platforms: ["instagram"],
              limit: 50,
              analyzeWithAI: useAI,
            });

            // 既存のsnsResultsにも統合
            if (result.snsInstagramResult) {
              result.snsResults = result.snsResults || { hashtags: [], topics: [], influencers: [] };
              const igResult = toSNSTrendResult(result.snsInstagramResult);
              result.snsResults.hashtags.push(...igResult.hashtags);
              result.snsResults.influencers.push(...igResult.influencers);
            }

            console.log(`[orchestrator] Instagram: found ${result.snsInstagramResult?.instagramData?.posts?.length || 0} posts`);
            updateProgress("sns_instagram", "completed");
          } catch (err) {
            console.error("[orchestrator] Instagram error:", err);
            updateProgress("sns_instagram", "failed");
          }
        })()
      );
    }

    // SNS TikTok 分析
    if (context.searchConfig.sources.includes("sns_tiktok")) {
      dataCollectionPromises.push(
        (async () => {
          updateProgress("sns_tiktok", "running");
          try {
            const searchKeywords = context.projectName || context.genre;
            result.snsTiktokResult = await executeSnsResearch({
              keyword: searchKeywords,
              platforms: ["tiktok"],
              limit: 50,
              analyzeWithAI: useAI,
            });

            // 既存のsnsResultsにも統合
            if (result.snsTiktokResult) {
              result.snsResults = result.snsResults || { hashtags: [], topics: [], influencers: [] };
              const tiktokResult = toSNSTrendResult(result.snsTiktokResult);
              result.snsResults.hashtags.push(...tiktokResult.hashtags);
            }

            console.log(`[orchestrator] TikTok: found ${result.snsTiktokResult?.tiktokData?.videos?.length || 0} videos`);
            updateProgress("sns_tiktok", "completed");
          } catch (err) {
            console.error("[orchestrator] TikTok error:", err);
            updateProgress("sns_tiktok", "failed");
          }
        })()
      );
    }

    // Deep Research
    if (options?.includeDeepResearch !== false) {
      dataCollectionPromises.push(
        (async () => {
          updateProgress("deep_research", "running");
          try {
            result.deepResearchResult = await runDeepResearch(context);
            updateProgress("deep_research", "completed");
          } catch (err) {
            console.error("[orchestrator] Deep Research error:", err);
            updateProgress("deep_research", "failed");
          }
        })()
      );
    }

    // 並列実行
    await Promise.all(dataCollectionPromises);

    // Phase 2: 結果統合（hybridGenerateでAI強化）
    console.log("[orchestrator] Phase 2: Synthesizing results with hybridGenerate");
    updateProgress("synthesis", "running");

    result.synthesis = await synthesizeResults(result);
    updateProgress("synthesis", "completed");

    // Phase 3: 提案生成
    console.log("[orchestrator] Phase 3: Generating proposals");
    updateProgress("proposals", "running");

    result.proposals = await generateProposals(context, result);
    updateProgress("proposals", "completed");

    // 完了
    result.status = "completed";
    result.completedAt = new Date().toISOString();
    result.elapsedMs = Date.now() - startTime;
    result.progress.overallPercent = 100;

    console.log(`[orchestrator] Completed in ${result.elapsedMs}ms`);

    // Google Sheetsに自動保存（ハイブリッドストレージ経由）
    try {
      const storage = getStorage();
      // 1. JSONデータをローカル/クラウドに保存
      await storage.save(`research_${result.id}`, result, "research_result");
      console.log(`[orchestrator] Research result saved to storage: research_${result.id}`);

      // 2. Google Sheets認証済みの場合、綺麗にフォーマットしたスプレッドシートも作成
      const connectionStatus = await storage.getConnectionStatus();
      if (connectionStatus.googleAuthenticated && connectionStatus.mode !== "local") {
        try {
          const { getGoogleSheets } = await import("@/lib/storage/google-sheets-adapter");
          const sheetsAdapter = getGoogleSheets();
          const { spreadsheetUrl } = await sheetsAdapter.saveFormattedResearch(result, {
            projectName: context.projectName,
          });
          console.log(`[orchestrator] Formatted research exported to Sheets: ${spreadsheetUrl}`);
        } catch (formattedError) {
          console.warn("[orchestrator] Failed to create formatted spreadsheet:", formattedError);
        }
      }
    } catch (storageError) {
      console.warn("[orchestrator] Failed to save to hybrid storage:", storageError);
      // ストレージ保存失敗はリサーチ結果には影響させない
    }

    // コスト削減統計をログ
    const stats = getHybridStats();
    if (stats.totalQueries > 0) {
      console.log(`[orchestrator] Hybrid stats: ${stats.cacheHitRate}% cache hit rate, $${stats.estimatedCostSaved.toFixed(4)} saved`);
    }

    return result;
  } catch (err) {
    console.error("[orchestrator] Fatal error:", err);
    result.status = "failed";
    result.progress.overallPercent = 0;
    throw err;
  }
}

/**
 * 初期進捗を作成（選択されたソースに基づいて動的に生成）
 */
function createInitialProgress(options?: ResearchOrchestrationOptions, context?: ResearchContext): ResearchProgress {
  const sources = context?.searchConfig?.sources || [];
  
  const steps: ResearchProgress["steps"] = [
    { step: "init", label: "初期化", status: "pending" },
  ];

  // 選択されたソースに応じてステップを追加
  if (sources.includes("infotop")) {
    steps.push({ step: "infotop", label: "Infotop分析", status: "pending" });
  }

  if (sources.includes("competitor")) {
    steps.push({ step: "competitor", label: "競合LP収集", status: "pending" });
  }

  if (sources.includes("ads")) {
    steps.push({ step: "ads", label: "Meta広告分析", status: "pending" });
  }

  if (sources.includes("chiebukuro")) {
    steps.push({ step: "chiebukuro", label: "Yahoo知恵袋分析", status: "pending" });
  }

  if (sources.includes("amazon_books")) {
    steps.push({ step: "amazon_books", label: "Amazon書籍分析", status: "pending" });
  }

  if (sources.includes("youtube")) {
    steps.push({ step: "youtube", label: "YouTube分析", status: "pending" });
  }

  // SNS個別ソース
  if (sources.includes("sns_x")) {
    steps.push({ step: "sns_x", label: "X (Twitter) 分析", status: "pending" });
  }

  if (sources.includes("sns_instagram")) {
    steps.push({ step: "sns_instagram", label: "Instagram分析", status: "pending" });
  }

  if (sources.includes("sns_tiktok")) {
    steps.push({ step: "sns_tiktok", label: "TikTok分析", status: "pending" });
  }

  // Deep Research（オプションによる）
  if (options?.includeDeepResearch !== false) {
    steps.push({ step: "deep_research", label: "Deep Research", status: "pending" });
  }

  steps.push(
    { step: "synthesis", label: "結果統合", status: "pending" },
    { step: "proposals", label: "提案生成", status: "pending" }
  );

  return {
    currentStep: "init",
    steps,
    overallPercent: 0,
  };
}

/**
 * 全体進捗率を計算
 */
function calculateOverallPercent(steps: ResearchProgress["steps"]): number {
  const completed = steps.filter((s) => s.status === "completed").length;
  return Math.round((completed / steps.length) * 100);
}

/**
 * Deep Research実行（Interactions API使用）
 * 
 * 公式ドキュメント: https://ai.google.dev/gemini-api/docs/interactions
 */
async function runDeepResearch(
  context: ResearchContext
): Promise<DeepResearchResult> {
  const client = getGeminiClient();
  const prompt = buildDeepResearchPrompt(context);

  console.log("[orchestrator] Starting Deep Research Agent...");

  try {
    // 1. Deep Researchエージェントを開始（バックグラウンド実行）
    const initialInteraction = await client.interactions.create({
      input: prompt,
      agent: "deep-research-pro-preview-12-2025",
      background: true,
    });

    console.log(`[orchestrator] Deep Research started. Interaction ID: ${initialInteraction.id}`);

    // 2. 結果をポーリング（最大5分待機）
    const maxAttempts = 30; // 30回 × 10秒 = 5分
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // 10秒待機

      const interaction = await client.interactions.get(initialInteraction.id);
      console.log(`[orchestrator] Deep Research status: ${interaction.status}`);

      if (interaction.status === "completed") {
        // 最後のテキスト出力を取得
        const textOutput = interaction.outputs?.find((o: { type: string }) => o.type === "text") as { type: string; text?: string } | undefined;
        const text = textOutput?.text || "";

        console.log("[orchestrator] Deep Research completed. Parsing results...");

        // JSONパース試行
        try {
          const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1]);
            return {
              trendReport: parsed.trendReport || text,
              marketAnalysis: parsed.marketAnalysis || "",
              psychologyInsights: parsed.psychologyInsights || "",
              recommendations: parsed.recommendations || [],
              citations: parsed.citations || [],
            };
          }
        } catch (parseErr) {
          console.warn("[orchestrator] Failed to parse JSON, using raw text:", parseErr);
        }

        // JSON形式でなければテキストとして返す
        return {
          trendReport: text,
          marketAnalysis: "",
          psychologyInsights: "",
          recommendations: [],
          citations: [],
        };
      } else if (interaction.status === "failed" || interaction.status === "cancelled") {
        throw new Error(`Deep Research failed with status: ${interaction.status}`);
      }

      attempts++;
    }

    // タイムアウト
    throw new Error("Deep Research timeout after 5 minutes");
  } catch (err) {
    console.error("[orchestrator] Deep Research error:", err);
    
    // フォールバック: 通常のInteractions APIを使用
    console.log("[orchestrator] Falling back to standard Interactions API...");
    try {
      const fallbackInteraction = await client.interactions.create({
        model: "gemini-2.5-pro",
        input: prompt,
      });
      const textOutput = fallbackInteraction.outputs?.find((o: { type: string }) => o.type === "text") as { type: string; text?: string } | undefined;
      const text = textOutput?.text || "";
      return {
        trendReport: text,
        marketAnalysis: "",
        psychologyInsights: "",
        recommendations: [],
        citations: [],
      };
    } catch (fallbackErr) {
      console.error("[orchestrator] Fallback also failed:", fallbackErr);
      throw err instanceof Error ? err : new Error("Deep Research failed");
    }
  }
}

/**
 * Deep Researchプロンプト生成
 */
function buildDeepResearchPrompt(context: ResearchContext): string {
  const genreLabel = getGenreLabel(context.genre);
  const moodLabels = context.toneManner.moods.map(getMoodLabel).join(", ");

  return `あなたはLP（ランディングページ）とセールスコピーの専門家です。
以下の条件に基づいて、効果的なLP構成とコピー戦略をリサーチしてください。

## 案件情報
- **ジャンル**: ${genreLabel}${context.subGenre ? ` (${context.subGenre})` : ""}
- **ターゲット**: ${context.target.ageGroups.join(", ")}歳代 ${
    context.target.gender === "female"
      ? "女性"
      : context.target.gender === "male"
        ? "男性"
        : "男女"
  }
- **悩み・課題**: ${context.target.problems || "未指定"}
- **理想の状態**: ${context.target.desires || "未指定"}
- **雰囲気・トンマナ**: ${moodLabels}

${context.freeText ? `## 追加情報\n${context.freeText}` : ""}

## 調査項目
1. **トレンドレポート**: 最新のデザイン・コピートレンド
2. **市場分析**: ターゲット心理、競合状況
3. **心理学的インサイト**: 効果的な心理トリガー
4. **推奨事項**: 具体的な構成・コピー提案

## 出力形式
\`\`\`json
{
  "trendReport": "トレンドレポート（500文字程度）",
  "marketAnalysis": "市場分析（500文字程度）",
  "psychologyInsights": "心理学的インサイト（500文字程度）",
  "recommendations": ["推奨1", "推奨2", "推奨3", "推奨4", "推奨5"],
  "citations": []
}
\`\`\``;
}

/**
 * 結果統合（hybridGenerate使用でCAG+RAG活用）
 */
async function synthesizeResults(result: EnhancedResearchResult): Promise<ResearchSynthesis> {
  const topPatterns: LPPattern[] = [];
  const topHeadlines: string[] = [];
  const topCTAs: string[] = [];
  const keyInsights: string[] = [];
  const differentiationPoints: string[] = [];

  // Infotop結果から抽出
  if (result.infotopResults && result.infotopResults.length > 0) {
    const patterns = extractPatterns(result.infotopResults);
    keyInsights.push(
      `Infotopランキング上位の価格帯: ${patterns.priceRange.min}円〜${patterns.priceRange.max}円（平均${patterns.priceRange.avg}円）`
    );

    // AI分析による追加インサイト
    if (result.infotopPriceInsights?.sweetSpot) {
      keyInsights.push(`価格のスイートスポット: ${result.infotopPriceInsights.sweetSpot}`);
    }
    if (result.infotopConceptPatterns && result.infotopConceptPatterns.length > 0) {
      keyInsights.push(`売れているコンセプトパターン: ${result.infotopConceptPatterns.slice(0, 3).join("、")}`);
    }
  }

  // 競合LP結果から抽出
  if (result.competitorResults && result.competitorResults.length > 0) {
    const common = extractCommonPatterns(result.competitorResults);

    topPatterns.push({
      name: "競合共通パターン",
      sections: common.commonSections.slice(0, 7),
      usageRate: 0.8,
      successScore: 0.85,
      description: `競合${result.competitorResults.length}社の分析から抽出した共通構成`,
    });

    topHeadlines.push(...common.topHeadlinePatterns);
    topCTAs.push(...common.topCTAPatterns);

    keyInsights.push(
      `競合LPの平均セクション数: ${common.avgSectionCount}セクション`
    );

    // AI分析による競合インサイト
    const aiAnalyzedCompetitors = result.competitorResults.filter((c) => c.aiAnalysis);
    if (aiAnalyzedCompetitors.length > 0) {
      const takeaways = aiAnalyzedCompetitors
        .flatMap((c) => c.aiAnalysis?.recommendedTakeaways || [])
        .slice(0, 5);
      if (takeaways.length > 0) {
        keyInsights.push(`競合から学べるポイント: ${takeaways.join("、")}`);
      }
    }
  }

  // Meta広告結果から抽出
  if (result.metaAdsAnalysis) {
    const adInsights = result.metaAdsAnalysis.insights;

    if (adInsights.commonCtaTexts.length > 0) {
      topCTAs.push(...adInsights.commonCtaTexts);
    }

    if (adInsights.emotionalTriggers && adInsights.emotionalTriggers.length > 0) {
      keyInsights.push(`広告で使われている感情トリガー: ${adInsights.emotionalTriggers.slice(0, 3).join("、")}`);
    }

    if (adInsights.copyTechniques && adInsights.copyTechniques.length > 0) {
      keyInsights.push(`広告のコピーテクニック: ${adInsights.copyTechniques.slice(0, 3).join("、")}`);
    }

    if (adInsights.recommendedApproaches && adInsights.recommendedApproaches.length > 0) {
      differentiationPoints.push(...adInsights.recommendedApproaches.slice(0, 3));
    }
  }

  // Deep Research結果から抽出
  if (result.deepResearchResult) {
    keyInsights.push(...result.deepResearchResult.recommendations.slice(0, 3));
  }

  // Yahoo知恵袋結果から抽出
  if (result.chiebukuroAnalysis) {
    const chiebukuro = result.chiebukuroAnalysis;

    // 深刻度の高いキーワードをインサイトに追加
    if (chiebukuro.painPointStats?.topSeverityKeywords && chiebukuro.painPointStats.topSeverityKeywords.length > 0) {
      keyInsights.push(`深刻な悩みのキーワード: ${chiebukuro.painPointStats.topSeverityKeywords.slice(0, 5).join("、")}`);
    }

    // 知恵袋からのインサイトを追加
    if (chiebukuro.insights && chiebukuro.insights.length > 0) {
      keyInsights.push(...chiebukuro.insights.slice(0, 2));
    }
  }

  // Amazon書籍結果から抽出
  if (result.amazonBooksAnalysis) {
    const amazon = result.amazonBooksAnalysis;

    // コンセプトパターンをインサイトに追加
    if (amazon.insights?.topConceptPatterns && amazon.insights.topConceptPatterns.length > 0) {
      keyInsights.push(`売れている書籍のコンセプトパターン: ${amazon.insights.topConceptPatterns.slice(0, 3).join("、")}`);
    }

    // キーワードをヘッドラインに追加
    if (amazon.insights?.topKeywords && amazon.insights.topKeywords.length > 0) {
      topHeadlines.push(...amazon.insights.topKeywords.slice(0, 5));
    }

    // タイトルパターンをヘッドラインに追加
    if (amazon.insights?.titlePatterns && amazon.insights.titlePatterns.length > 0) {
      topHeadlines.push(...amazon.insights.titlePatterns.slice(0, 3));
    }
  }

  // YouTube結果から抽出
  if (result.youtubeAnalysis) {
    const youtube = result.youtubeAnalysis;

    // 人気タイトル要素をインサイトに追加
    if (youtube.insights?.topTitlePatterns && youtube.insights.topTitlePatterns.length > 0) {
      keyInsights.push(`YouTubeで人気のタイトル要素: ${youtube.insights.topTitlePatterns.slice(0, 5).join("、")}`);
    }

    // エモーショナルフックをヘッドラインに追加
    if (youtube.insights?.topEmotionalHooks && youtube.insights.topEmotionalHooks.length > 0) {
      topHeadlines.push(...youtube.insights.topEmotionalHooks.slice(0, 5));
    }

    // トップパフォーマー動画からのインサイト
    if (youtube.insights?.topPerformers && youtube.insights.topPerformers.length > 0) {
      keyInsights.push(`トップパフォーマンス動画: ${youtube.insights.topPerformers.length}件`);
    }
  }

  // デフォルトパターンを追加
  if (topPatterns.length === 0) {
    topPatterns.push({
      name: "王道構成パターン",
      sections: [
        "hero",
        "problem",
        "solution",
        "features",
        "testimonials",
        "pricing",
        "cta",
      ] as SectionType[],
      usageRate: 0.9,
      successScore: 0.88,
      description:
        "問題提起→解決策→証拠→行動の王道フロー。多くのジャンルで高いCVRを実現",
    });
  }

  // hybridGenerateでAI強化インサイトを取得
  try {
    const synthesisPrompt = `以下のリサーチデータを分析し、追加のインサイトと差別化ポイントを提案してください。

## 収集済みデータ
- 競合LP数: ${result.competitorResults?.length || 0}件
- Infotop商品数: ${result.infotopResults?.length || 0}件
- 広告数: ${result.metaAdsAnalysis?.ads.length || 0}件
- 知恵袋質問数: ${result.chiebukuroAnalysis?.questions?.length || 0}件
- YouTube動画数: ${result.youtubeAnalysis?.insights?.totalVideos || 0}件
- Amazon書籍数: ${result.amazonBooksAnalysis?.insights?.totalBooks || 0}件

## 現在のインサイト
${keyInsights.slice(0, 5).map((i, idx) => `${idx + 1}. ${i}`).join("\n")}

## 現在のヘッドライン案
${topHeadlines.slice(0, 5).join(", ")}

## 出力形式（JSON）
\`\`\`json
{
  "additionalInsights": ["インサイト1", "インサイト2", "インサイト3"],
  "differentiationIdeas": ["差別化アイデア1", "差別化アイデア2"],
  "headlineSuggestions": ["ヘッドライン案1", "ヘッドライン案2"]
}
\`\`\``;

    console.log("[orchestrator] Enhancing synthesis with hybridGenerate...");

    const hybridResult = await hybridGenerate({
      prompt: synthesisPrompt,
      projectId: result.id,
      useCache: true,
      dynamicSources: ["research_result"],
      maxDynamicTokens: 2000,
    });

    // JSONパース
    const jsonMatch = hybridResult.text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]) as {
        additionalInsights?: string[];
        differentiationIdeas?: string[];
        headlineSuggestions?: string[];
      };

      if (parsed.additionalInsights) {
        keyInsights.push(...parsed.additionalInsights);
      }
      if (parsed.differentiationIdeas) {
        differentiationPoints.push(...parsed.differentiationIdeas);
      }
      if (parsed.headlineSuggestions) {
        topHeadlines.push(...parsed.headlineSuggestions);
      }

      console.log("[orchestrator] Synthesis enhanced with AI insights");
    }
  } catch (err) {
    console.warn("[orchestrator] Failed to enhance synthesis with AI:", err);
    // AI強化に失敗しても基本のsynthesisは返す
  }

  return {
    topPatterns,
    topHeadlines: Array.from(new Set(topHeadlines)).slice(0, 10),
    topCTAs: Array.from(new Set(topCTAs)).slice(0, 5),
    keyInsights,
    differentiationPoints,
  };
}

/**
 * 提案生成（hybridGenerate使用でCAG+RAG活用）
 */
async function generateProposals(
  context: ResearchContext,
  result: EnhancedResearchResult
): Promise<ResearchProposals> {
  const prompt = buildProposalsPrompt(context, result);

  console.log("[orchestrator] Generating proposals with hybridGenerate (CAG+RAG)...");

  // hybridGenerate()を使用してCAGキャッシュとRAGを活用
  const hybridResult = await hybridGenerate({
    prompt,
    projectId: result.id,
    useCache: true,           // CAGキャッシュを使用（静的ナレッジ）
    dynamicSources: ["research_result", "competitor_lp"], // RAGで動的データも参照
    includeN1: true,          // N1データも含める
    includeCompetitors: true, // 競合データも含める
    maxDynamicTokens: 4000,
  });

  console.log(`[orchestrator] hybridGenerate completed:`, {
    cachedTokens: hybridResult.tokensUsed.cached,
    dynamicTokens: hybridResult.tokensUsed.dynamic,
    costSavings: hybridResult.costSavings.explanation,
    timing: hybridResult.timing,
  });

  const text = hybridResult.text || "";

  // JSONパース試行
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return normalizeProposals(parsed, context);
    }
  } catch (e) {
    console.error("[orchestrator] Failed to parse proposals JSON:", e);
  }

  // フォールバック
  return getDefaultProposals(context);
}

/**
 * 提案生成プロンプト
 */
function buildProposalsPrompt(
  context: ResearchContext,
  result: EnhancedResearchResult
): string {
  const deepResearch = result.deepResearchResult;
  const synthesis = result.synthesis;
  const metaAds = result.metaAdsAnalysis;
  const chiebukuro = result.chiebukuroAnalysis;
  const amazonBooks = result.amazonBooksAnalysis;
  const youtube = result.youtubeAnalysis;

  // Meta広告インサイトを構築
  let metaAdsSection = "";
  if (metaAds && metaAds.ads.length > 0) {
    metaAdsSection = `
## Meta広告分析
- 分析した広告数: ${metaAds.ads.length}件
- よく使われるCTA: ${metaAds.insights.commonCtaTexts.slice(0, 5).join(", ") || "なし"}
- 感情トリガー: ${metaAds.insights.emotionalTriggers?.slice(0, 5).join(", ") || "なし"}
- コピーテクニック: ${metaAds.insights.copyTechniques?.slice(0, 5).join(", ") || "なし"}
`;
  }

  // Yahoo知恵袋インサイトを構築
  let chiebukuroSection = "";
  if (chiebukuro && chiebukuro.questions?.length > 0) {
    chiebukuroSection = `
## Yahoo知恵袋分析（リアルな悩み）
- 分析した質問数: ${chiebukuro.questions.length}件
- 深刻度キーワード: ${chiebukuro.painPointStats?.topSeverityKeywords?.slice(0, 5).join("、") || "なし"}
- インサイト: ${chiebukuro.insights?.slice(0, 2).join("、") || "なし"}
`;
  }

  // Amazon書籍インサイトを構築
  let amazonBooksSection = "";
  if (amazonBooks && amazonBooks.insights?.totalBooks > 0) {
    amazonBooksSection = `
## Amazon書籍分析（売れているコンセプト）
- 分析した書籍数: ${amazonBooks.insights.totalBooks}冊
- コンセプトパターン: ${amazonBooks.insights.topConceptPatterns?.slice(0, 3).join("、") || "なし"}
- トップキーワード: ${amazonBooks.insights.topKeywords?.slice(0, 5).join("、") || "なし"}
`;
  }

  // YouTubeインサイトを構築
  let youtubeSection = "";
  if (youtube && youtube.insights?.totalVideos > 0) {
    youtubeSection = `
## YouTube分析（人気タイトル要素）
- 分析した動画数: ${youtube.insights.totalVideos}本
- 人気タイトルパターン: ${youtube.insights.topTitlePatterns?.slice(0, 5).join("、") || "なし"}
- トップキーワード: ${youtube.insights.topKeywords?.slice(0, 5).join("、") || "なし"}
- エモーショナルフック: ${youtube.insights.topEmotionalHooks?.slice(0, 5).join("、") || "なし"}
`;
  }

  return `以下のリサーチ結果に基づいて、具体的なLP提案を生成してください。

## リサーチ結果サマリー
${deepResearch?.trendReport || "トレンド情報なし"}

## 市場インサイト
${synthesis?.keyInsights.join("\n") || "インサイトなし"}

## 競合パターン
${synthesis?.topPatterns.map((p) => `- ${p.name}: ${p.sections.join(" → ")}`).join("\n") || "パターンなし"}
${metaAdsSection}${chiebukuroSection}${amazonBooksSection}${youtubeSection}

## 案件情報
- ジャンル: ${getGenreLabel(context.genre)}
- ターゲット: ${context.target.ageGroups.join(", ")}歳代
- 悩み: ${context.target.problems}
- 理想: ${context.target.desires}
- トンマナ: ${context.toneManner.moods.map(getMoodLabel).join(", ")}

## 出力形式
\`\`\`json
{
  "structure": {
    "recommended": [
      {"order": 1, "type": "hero", "name": "ヒーロー", "purpose": "目的", "elements": ["要素"], "wordCount": {"min": 50, "max": 100}}
    ],
    "alternativePatterns": [],
    "rationale": "推奨理由"
  },
  "copy": {
    "headlines": [{"text": "ヘッドライン", "type": "benefit", "score": 0.9}],
    "subheadlines": ["サブヘッド"],
    "ctaButtons": [{"text": "CTA", "urgency": "high", "score": 0.9}],
    "keyPhrases": ["キーフレーズ"]
  },
  "design": {
    "colorPalette": {"primary": "#HEX", "secondary": "#HEX", "accent": "#HEX", "background": "#FFF"},
    "fontSuggestions": {"heading": "フォント名", "body": "フォント名"},
    "layoutType": "single",
    "moodBoard": []
  },
  "referenceLPs": []
}
\`\`\`

structure.recommended は6〜10セクション生成してください。
headlines は5案、ctaButtons は3案生成してください。`;
}

/**
 * 提案を正規化
 */
function normalizeProposals(
  parsed: Record<string, unknown>,
  context: ResearchContext
): ResearchProposals {
  const structure = parsed.structure as Record<string, unknown> | undefined;
  const copy = parsed.copy as Record<string, unknown> | undefined;
  const design = parsed.design as Record<string, unknown> | undefined;

  // 参考LPを競合結果から追加
  const referenceLPs = context.searchConfig.sources.includes("competitor")
    ? []
    : [];

  return {
    structure: {
      recommended: ((structure?.recommended as RecommendedSection[]) || []).map(
        (s, i) => ({
          order: s.order || i + 1,
          type: (s.type as SectionType) || "other",
          name: s.name || `セクション${i + 1}`,
          purpose: s.purpose || "",
          elements: s.elements || [],
          wordCount: s.wordCount || { min: 50, max: 200 },
        })
      ),
      alternativePatterns: [],
      rationale: (structure?.rationale as string) || "",
    },
    copy: {
      headlines: ((copy?.headlines as HeadlineOption[]) || []).map((h) => ({
        text: h.text || "",
        type: h.type || "benefit",
        score: h.score || 0.8,
      })),
      subheadlines: (copy?.subheadlines as string[]) || [],
      ctaButtons: ((copy?.ctaButtons as CTAOption[]) || []).map((c) => ({
        text: c.text || "",
        urgency: c.urgency || "medium",
        score: c.score || 0.8,
      })),
      keyPhrases: (copy?.keyPhrases as string[]) || [],
    },
    design: {
      colorPalette: (design?.colorPalette as {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
      }) || {
        primary: "#2563EB",
        secondary: "#7C3AED",
        accent: "#F59E0B",
        background: "#FFFFFF",
      },
      fontSuggestions: (design?.fontSuggestions as {
        heading: string;
        body: string;
      }) || {
        heading: "Noto Sans JP Bold",
        body: "Noto Sans JP Regular",
      },
      layoutType: (design?.layoutType as "single" | "multi" | "grid") || "single",
      moodBoard: (design?.moodBoard as string[]) || [],
    },
    referenceLPs,
  };
}

/**
 * デフォルト提案
 */
function getDefaultProposals(context: ResearchContext): ResearchProposals {
  const isFemale = context.target.gender !== "male";
  const isLuxury = context.toneManner.moods.includes("luxury");

  return {
    structure: {
      recommended: [
        {
          order: 1,
          type: "hero",
          name: "ヒーローセクション",
          purpose: "第一印象で注目を集め、続きを読ませる",
          elements: ["メインビジュアル", "キャッチコピー", "サブコピー"],
          wordCount: { min: 50, max: 100 },
        },
        {
          order: 2,
          type: "problem",
          name: "悩み共感セクション",
          purpose: "ターゲットの悩みに共感し、自分事化させる",
          elements: ["悩みリスト", "共感コピー"],
          wordCount: { min: 100, max: 200 },
        },
        {
          order: 3,
          type: "solution",
          name: "解決策提示",
          purpose: "商品・サービスを解決策として提示",
          elements: ["解決策概要", "差別化ポイント"],
          wordCount: { min: 150, max: 300 },
        },
        {
          order: 4,
          type: "features",
          name: "特徴・メリット",
          purpose: "具体的な特徴とベネフィットを伝える",
          elements: ["特徴×3", "詳細説明"],
          wordCount: { min: 200, max: 400 },
        },
        {
          order: 5,
          type: "testimonials",
          name: "お客様の声",
          purpose: "社会的証明で信頼性を高める",
          elements: ["体験談×3", "Before/After"],
          wordCount: { min: 150, max: 300 },
        },
        {
          order: 6,
          type: "pricing",
          name: "価格・オファー",
          purpose: "価格の正当性と特典を提示",
          elements: ["価格", "特典", "限定オファー"],
          wordCount: { min: 100, max: 200 },
        },
        {
          order: 7,
          type: "guarantee",
          name: "保証",
          purpose: "リスクリバーサルで不安を解消",
          elements: ["返金保証", "サポート"],
          wordCount: { min: 50, max: 100 },
        },
        {
          order: 8,
          type: "faq",
          name: "よくある質問",
          purpose: "疑問・不安を先回りして解消",
          elements: ["Q&A×5"],
          wordCount: { min: 200, max: 400 },
        },
        {
          order: 9,
          type: "cta",
          name: "最終CTA",
          purpose: "行動を促す最終の一押し",
          elements: ["まとめ", "CTAボタン"],
          wordCount: { min: 50, max: 100 },
        },
      ],
      alternativePatterns: [],
      rationale:
        "問題提起→解決策→証拠→行動の王道パターン。多くのジャンルで高いCVRを実現。",
    },
    copy: {
      headlines: [
        {
          text: isFemale
            ? "もう悩まない。あなたの理想の姿がここに"
            : "今日から変わる。結果を出す最短ルート",
          type: "benefit",
          score: 0.92,
        },
        {
          text: "なぜ、これまでの方法では上手くいかなかったのか？",
          type: "curiosity",
          score: 0.88,
        },
        {
          text: "97%が実感！驚きの変化を体験してください",
          type: "social_proof",
          score: 0.85,
        },
      ],
      subheadlines: ["〜 たった3ステップで理想の状態へ 〜", "専門家監修の信頼の品質"],
      ctaButtons: [
        { text: "今すぐ始める", urgency: "high", score: 0.9 },
        { text: "無料で詳しく見る", urgency: "low", score: 0.85 },
        { text: "限定価格で申し込む", urgency: "high", score: 0.88 },
      ],
      keyPhrases: ["今だけ", "限定", "実証済み", "満足度97%"],
    },
    design: {
      colorPalette: isLuxury
        ? { primary: "#1A1A1A", secondary: "#D4AF37", accent: "#8B0000", background: "#FAFAFA" }
        : isFemale
          ? { primary: "#E91E63", secondary: "#9C27B0", accent: "#FF9800", background: "#FFF5F8" }
          : { primary: "#2563EB", secondary: "#1E40AF", accent: "#F59E0B", background: "#FFFFFF" },
      fontSuggestions: {
        heading: isLuxury ? "Noto Serif JP Bold" : "Noto Sans JP Bold",
        body: "Noto Sans JP Regular",
      },
      layoutType: "single",
      moodBoard: [],
    },
    referenceLPs: [],
  };
}

// ヘルパー関数
function getGenreLabel(genre: string): string {
  const labels: Record<string, string> = {
    beauty: "美容",
    health: "健康",
    education: "教育",
    business: "ビジネス",
    investment: "投資",
    romance: "恋愛",
    spiritual: "スピリチュアル",
    other: "その他",
  };
  return labels[genre] || genre;
}

function getMoodLabel(mood: string): string {
  const labels: Record<string, string> = {
    luxury: "高級感",
    casual: "カジュアル",
    trust: "信頼感",
    friendly: "親しみ",
    professional: "専門的",
    emotional: "エモーショナル",
  };
  return labels[mood] || mood;
}


