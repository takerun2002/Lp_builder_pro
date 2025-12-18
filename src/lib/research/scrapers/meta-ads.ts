/**
 * Meta広告ライブラリ スクレイパー
 * https://www.facebook.com/ads/library/
 *
 * 機能:
 * - 競合の広告クリエイティブを取得
 * - 広告文・ビジュアル・CTAを分析
 * - アクティブな広告をトラッキング
 * - AI駆動の高精度分析
 */

import { scrapeUrl } from '../firecrawl';
import { analyzeAdsWithAI, extractKeywordsWithAI, type AdAnalysisResult } from '../ai-analyzer';

// ============================================================
// 型定義
// ============================================================

export interface MetaAd {
  id: string;
  pageId: string;
  pageName: string;
  adContent: {
    headline?: string;
    bodyText?: string;
    description?: string;
    ctaText?: string;
    ctaLink?: string;
  };
  mediaType: 'image' | 'video' | 'carousel';
  mediaUrls: string[];
  status: 'active' | 'inactive';
  startDate?: string;
  platforms: ('facebook' | 'instagram' | 'messenger' | 'audience_network')[];
  impressionRange?: string;
  country: string;
  scrapedAt: string;
}

export interface MetaAdSearchParams {
  query: string;
  country?: string; // デフォルト: 'JP'
  adType?: 'all' | 'image' | 'video';
  platforms?: string[];
  activeOnly?: boolean;
  limit?: number;
}

export interface MetaAdAnalysis {
  ads: MetaAd[];
  insights: {
    commonHeadlinePatterns: string[];
    commonCtaTexts: string[];
    averageTextLength: number;
    platformDistribution: Record<string, number>;
    mediaTypeDistribution: Record<string, number>;
    // AI分析による追加インサイト
    emotionalTriggers?: string[];
    copyTechniques?: string[];
    recommendedApproaches?: string[];
  };
  topPerformers: MetaAd[];
  // AI分析結果
  aiAnalysis?: AdAnalysisResult;
}

// ============================================================
// Meta広告ライブラリ URL生成
// ============================================================

/**
 * 検索URL生成
 */
export function buildMetaAdsUrl(params: MetaAdSearchParams): string {
  const baseUrl = 'https://www.facebook.com/ads/library/';
  const searchParams = new URLSearchParams();
  
  searchParams.set('active_status', params.activeOnly !== false ? 'active' : 'all');
  searchParams.set('ad_type', 'all');
  searchParams.set('country', params.country || 'JP');
  searchParams.set('q', params.query);
  searchParams.set('search_type', 'keyword_unordered');
  searchParams.set('media_type', params.adType || 'all');
  
  return `${baseUrl}?${searchParams.toString()}`;
}

/**
 * ページ別広告URL生成
 */
export function buildPageAdsUrl(pageId: string, country: string = 'JP'): string {
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&view_all_page_id=${pageId}`;
}

// ============================================================
// スクレイピング関数
// ============================================================

/**
 * キーワードで広告を検索
 */
export async function searchMetaAds(
  params: MetaAdSearchParams & { useAI?: boolean; genre?: string }
): Promise<MetaAd[]> {
  const url = buildMetaAdsUrl(params);

  try {
    // Firecrawlでスクレイピング
    const result = await scrapeUrl(url, {
      formats: ['markdown'],
      waitFor: 5000,
    });

    if (!result.success || !result.markdown) {
      console.warn('[meta-ads] スクレイピング失敗:', url);
      return [];
    }

    // AI分析を使用する場合
    if (params.useAI) {
      const aiResult = await analyzeAdsWithAI(result.markdown, {
        genre: params.genre,
      });

      // AI結果をMetaAd形式に変換
      const ads: MetaAd[] = aiResult.ads.map((ad) => ({
        id: ad.id,
        pageId: '',
        pageName: ad.pageName,
        adContent: {
          headline: ad.headline,
          bodyText: ad.bodyText,
          ctaText: ad.ctaText,
        },
        mediaType: ad.mediaType,
        mediaUrls: [],
        status: 'active' as const,
        platforms: ad.platforms as MetaAd['platforms'],
        country: params.country || 'JP',
        scrapedAt: new Date().toISOString(),
      }));

      return params.limit ? ads.slice(0, params.limit) : ads;
    }

    // 従来のパース（フォールバック）
    const ads = parseMetaAdsContent(result.markdown, params.country || 'JP');

    // リミット適用
    return params.limit ? ads.slice(0, params.limit) : ads;
  } catch (error) {
    console.error('[meta-ads] 検索エラー:', error);
    return [];
  }
}

/**
 * 特定ページの広告を取得
 */
export async function getPageAds(
  pageId: string,
  options?: { country?: string; useAI?: boolean; genre?: string }
): Promise<MetaAd[]> {
  const country = options?.country || 'JP';
  const url = buildPageAdsUrl(pageId, country);

  try {
    const result = await scrapeUrl(url, {
      formats: ['markdown'],
      waitFor: 5000,
    });

    if (!result.success || !result.markdown) {
      return [];
    }

    // AI分析を使用する場合
    if (options?.useAI) {
      const aiResult = await analyzeAdsWithAI(result.markdown, {
        genre: options.genre,
      });

      return aiResult.ads.map((ad) => ({
        id: ad.id,
        pageId,
        pageName: ad.pageName,
        adContent: {
          headline: ad.headline,
          bodyText: ad.bodyText,
          ctaText: ad.ctaText,
        },
        mediaType: ad.mediaType,
        mediaUrls: [],
        status: 'active' as const,
        platforms: ad.platforms as MetaAd['platforms'],
        country,
        scrapedAt: new Date().toISOString(),
      }));
    }

    return parseMetaAdsContent(result.markdown, country);
  } catch (error) {
    console.error('[meta-ads] ページ広告取得エラー:', error);
    return [];
  }
}

/**
 * 競合広告を分析
 */
export async function analyzeCompetitorAds(
  competitors: string[],
  options?: {
    country?: string;
    useAI?: boolean;
    genre?: string;
  }
): Promise<MetaAdAnalysis> {
  const country = options?.country || 'JP';
  const allAds: MetaAd[] = [];
  let combinedMarkdown = '';

  // 各競合の広告を取得
  for (const competitor of competitors) {
    const ads = await searchMetaAds({
      query: competitor,
      country,
      activeOnly: true,
      limit: 20,
      useAI: options?.useAI,
      genre: options?.genre,
    });
    allAds.push(...ads);

    // AI分析用にコンテンツを蓄積
    if (options?.useAI) {
      const url = buildMetaAdsUrl({ query: competitor, country });
      const result = await scrapeUrl(url, { formats: ['markdown'], waitFor: 3000 });
      if (result.markdown) {
        combinedMarkdown += `\n\n--- ${competitor} ---\n${result.markdown}`;
      }
    }

    // レート制限対策
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // 基本分析
  const insights = analyzeAdInsights(allAds);
  const topPerformers = identifyTopPerformers(allAds);

  // AI分析を追加
  let aiAnalysis: AdAnalysisResult | undefined;
  if (options?.useAI && combinedMarkdown.length > 100) {
    aiAnalysis = await analyzeAdsWithAI(combinedMarkdown, {
      genre: options.genre,
    });

    // AIインサイトをマージ
    insights.emotionalTriggers = aiAnalysis.insights.emotionalTriggers;
    insights.copyTechniques = aiAnalysis.insights.copyTechniques;
    insights.recommendedApproaches = aiAnalysis.insights.recommendedApproaches;
  }

  return {
    ads: allAds,
    insights,
    topPerformers,
    aiAnalysis,
  };
}

// ============================================================
// パース関数
// ============================================================

/**
 * スクレイピング結果をパース
 * 注意: Meta広告ライブラリは動的コンテンツのため、
 * 実際の実装ではSelenium/Playwrightが必要な場合があります
 */
function parseMetaAdsContent(content: string, country: string): MetaAd[] {
  const ads: MetaAd[] = [];

  // マークダウン形式のコンテンツから情報を抽出
  const sections = content.split(/---+/);
  
  for (const section of sections) {
    if (section.length < 50) continue;
    
    const ad = extractAdFromSection(section, country);
    if (ad) {
      ads.push(ad);
    }
  }
  
  return ads;
}

/**
 * セクションから広告情報を抽出
 */
function extractAdFromSection(section: string, country: string): MetaAd | null {
  // 最低限の情報がない場合はスキップ
  if (!section.includes('広告') && !section.includes('Ad')) {
    return null;
  }
  
  // ページ名を抽出
  const pageNameMatch = section.match(/^\s*\*\*(.+?)\*\*/m) ||
                        section.match(/^#\s*(.+?)$/m);
  const pageName = pageNameMatch ? pageNameMatch[1].trim() : 'Unknown';
  
  // 広告テキストを抽出
  const bodyTextMatch = section.match(/(?:本文|テキスト|内容)[:\s]*(.+?)(?:\n|$)/i) ||
                        section.match(/^(?!#|\*).{50,}$/m);
  const bodyText = bodyTextMatch ? bodyTextMatch[1].trim() : undefined;
  
  // CTAを抽出
  const ctaMatch = section.match(/(詳しくはこちら|今すぐ購入|登録する|ダウンロード|詳細を見る|申し込む|無料で始める|今すぐチェック)/i);
  const ctaText = ctaMatch ? ctaMatch[1] : undefined;
  
  // メディアタイプを判定
  let mediaType: 'image' | 'video' | 'carousel' = 'image';
  if (section.includes('動画') || section.includes('video')) {
    mediaType = 'video';
  } else if (section.includes('カルーセル') || section.includes('carousel')) {
    mediaType = 'carousel';
  }
  
  return {
    id: `meta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    pageId: '',
    pageName,
    adContent: {
      bodyText,
      ctaText,
    },
    mediaType,
    mediaUrls: [],
    status: 'active',
    platforms: ['facebook'],
    country,
    scrapedAt: new Date().toISOString(),
  };
}

// ============================================================
// 分析関数
// ============================================================

/**
 * 広告の洞察を分析
 */
function analyzeAdInsights(ads: MetaAd[]): MetaAdAnalysis['insights'] {
  // ヘッドラインパターン
  const headlines = ads
    .map(ad => ad.adContent.headline)
    .filter((h): h is string => !!h);
  
  const headlinePatterns = extractCommonPatterns(headlines);
  
  // CTAテキスト
  const ctaTexts = ads
    .map(ad => ad.adContent.ctaText)
    .filter((c): c is string => !!c);
  
  const ctaCounts: Record<string, number> = {};
  ctaTexts.forEach(cta => {
    ctaCounts[cta] = (ctaCounts[cta] || 0) + 1;
  });
  
  const commonCtaTexts = Object.entries(ctaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cta]) => cta);
  
  // 平均テキスト長
  const textLengths = ads
    .map(ad => ad.adContent.bodyText?.length || 0)
    .filter(len => len > 0);
  
  const averageTextLength = textLengths.length > 0
    ? Math.round(textLengths.reduce((a, b) => a + b, 0) / textLengths.length)
    : 0;
  
  // プラットフォーム分布
  const platformDistribution: Record<string, number> = {};
  ads.forEach(ad => {
    ad.platforms.forEach(platform => {
      platformDistribution[platform] = (platformDistribution[platform] || 0) + 1;
    });
  });
  
  // メディアタイプ分布
  const mediaTypeDistribution: Record<string, number> = {};
  ads.forEach(ad => {
    mediaTypeDistribution[ad.mediaType] = (mediaTypeDistribution[ad.mediaType] || 0) + 1;
  });
  
  return {
    commonHeadlinePatterns: headlinePatterns,
    commonCtaTexts,
    averageTextLength,
    platformDistribution,
    mediaTypeDistribution,
  };
}

/**
 * 共通パターンを抽出
 */
function extractCommonPatterns(texts: string[]): string[] {
  const patterns: string[] = [];
  
  // 数字パターン
  const numberPattern = texts.filter(t => /\d+/.test(t));
  if (numberPattern.length > texts.length * 0.3) {
    patterns.push('数字を含む（〇〇%、〇〇日など）');
  }
  
  // 疑問形パターン
  const questionPattern = texts.filter(t => /[?？]/.test(t));
  if (questionPattern.length > texts.length * 0.2) {
    patterns.push('疑問形（〜ですか？）');
  }
  
  // 限定パターン
  const limitedPattern = texts.filter(t => 
    /限定|期間|今だけ|先着|残り/.test(t)
  );
  if (limitedPattern.length > texts.length * 0.2) {
    patterns.push('限定・緊急性（今だけ、期間限定）');
  }
  
  // 無料パターン
  const freePattern = texts.filter(t => /無料|0円|タダ/.test(t));
  if (freePattern.length > texts.length * 0.2) {
    patterns.push('無料訴求（無料、0円）');
  }
  
  return patterns;
}

/**
 * トップパフォーマーを特定
 * 注意: 実際のインプレッション数は取得困難なため、
 * アクティブ期間やエンゲージメント指標で推定
 */
function identifyTopPerformers(ads: MetaAd[]): MetaAd[] {
  // アクティブな広告を優先
  const activeAds = ads.filter(ad => ad.status === 'active');
  
  // 複数プラットフォームで配信されている広告を優先
  const sortedAds = activeAds.sort((a, b) => {
    return b.platforms.length - a.platforms.length;
  });
  
  return sortedAds.slice(0, 10);
}

// ============================================================
// ユーティリティ
// ============================================================

/**
 * 広告テキストからキーワードを抽出
 */
export function extractKeywordsFromAds(ads: MetaAd[]): string[] {
  const allText = ads
    .map(ad => [
      ad.adContent.headline,
      ad.adContent.bodyText,
      ad.adContent.description,
    ].filter(Boolean).join(' '))
    .join(' ');
  
  // 頻出単語を抽出（簡易版）
  const words = allText
    .split(/[\s,。、！？!?.]+/)
    .filter(w => w.length >= 2 && w.length <= 20)
    .filter(w => !/^(です|ます|する|した|ある|いる|この|その|あの)$/.test(w));
  
  const wordCounts: Record<string, number> = {};
  words.forEach(w => {
    wordCounts[w] = (wordCounts[w] || 0) + 1;
  });
  
  return Object.entries(wordCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word]) => word);
}

/**
 * 広告からCTAパターンを学習
 */
export function learnCtaPatterns(ads: MetaAd[]): string[] {
  const ctaTexts = ads
    .map(ad => ad.adContent.ctaText)
    .filter((c): c is string => !!c);
  
  // ユニークなCTAを抽出
  const uniqueCtas = Array.from(new Set(ctaTexts));
  
  return uniqueCtas;
}

// ============================================================
// AI強化版キーワード抽出
// ============================================================

/**
 * AI駆動のキーワード抽出
 */
export async function extractKeywordsWithAIFromAds(
  ads: MetaAd[],
  genre?: string
): Promise<{
  powerWords: string[];
  benefitWords: string[];
  painWords: string[];
  urgencyWords: string[];
  trustWords: string[];
  emotionalTriggers: string[];
}> {
  // 全広告のテキストを結合
  const allText = ads
    .map((ad) =>
      [ad.adContent.headline, ad.adContent.bodyText, ad.adContent.description].filter(Boolean).join(' ')
    )
    .join('\n');

  if (allText.length < 50) {
    return {
      powerWords: [],
      benefitWords: [],
      painWords: [],
      urgencyWords: [],
      trustWords: [],
      emotionalTriggers: [],
    };
  }

  return extractKeywordsWithAI(allText, genre);
}

// ============================================================
// エクスポート用まとめ
// ============================================================

export const MetaAdsResearch = {
  search: searchMetaAds,
  getPageAds,
  analyzeCompetitors: analyzeCompetitorAds,
  extractKeywords: extractKeywordsFromAds,
  extractKeywordsWithAI: extractKeywordsWithAIFromAds,
  learnCtaPatterns,
  buildUrl: buildMetaAdsUrl,
};

export default MetaAdsResearch;


