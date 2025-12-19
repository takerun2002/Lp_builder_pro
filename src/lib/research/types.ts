/**
 * リサーチエージェント型定義
 */

// === 入力コンテキスト ===

export interface ResearchContext {
  // 基本情報
  projectName: string;
  genre: Genre;
  subGenre?: string;
  
  // ターゲット
  target: TargetInfo;
  
  // トンマナ（任意 - デザイン収集時に使用）
  toneManner?: ToneManner;
  
  // 演者/モデル
  presenter?: PresenterInfo;
  
  // 検索設定
  searchConfig: SearchConfig;
  
  // 自由入力
  freeText?: string;
  
  // 参考URL
  referenceUrls?: string[];
}

export type Genre = 
  | "beauty"      // 美容
  | "health"      // 健康
  | "education"   // 教育
  | "business"    // ビジネス
  | "investment"  // 投資
  | "romance"     // 恋愛
  | "spiritual"   // スピリチュアル
  | "other";      // その他

export const GENRE_LABELS: Record<Genre, string> = {
  beauty: "美容",
  health: "健康",
  education: "教育・学習",
  business: "ビジネス",
  investment: "投資・副業",
  romance: "恋愛",
  spiritual: "スピリチュアル",
  other: "その他",
};

export interface TargetInfo {
  ageGroups: AgeGroup[];
  gender: "male" | "female" | "both";
  problems?: string;     // 悩み・課題（任意）
  desires?: string;      // 理想の状態（任意）
  occupation?: string;   // 職業
}

export type AgeGroup = "20s" | "30s" | "40s" | "50s" | "60plus";

export interface ToneManner {
  moods: Mood[];
  colorImage?: string;   // カラーコード or プリセット名
  fontStyle?: "formal" | "casual" | "elegant" | "pop";
}

export type Mood = 
  | "luxury"      // 高級感
  | "casual"      // カジュアル
  | "trust"       // 信頼感
  | "friendly"    // 親しみ
  | "professional" // 専門的
  | "emotional";   // エモーショナル

export const MOOD_LABELS: Record<Mood, string> = {
  luxury: "高級感",
  casual: "カジュアル",
  trust: "信頼感",
  friendly: "親しみやすい",
  professional: "専門的",
  emotional: "エモーショナル",
};

export interface PresenterInfo {
  type: "expert" | "influencer" | "regular" | "character" | "none";
  moods: PresenterMood[];
  referenceImageUrl?: string;
}

export type PresenterMood = 
  | "intellectual"   // 知的
  | "friendly"       // 親しみやすい
  | "energetic"      // エネルギッシュ
  | "calm"           // 落ち着き
  | "charismatic";   // カリスマ的

export interface SearchConfig {
  regions: Region[];
  period: SearchPeriod;
  sources: DataSource[];
}

export type Region = "japan" | "us" | "europe" | "asia";
export type SearchPeriod = "1month" | "3months" | "6months" | "1year" | "all";
export type DataSource =
  | "infotop"
  | "competitor"
  | "ads"
  | "sns"           // 後方互換性のため残す（廃止予定）
  | "sns_x"         // X (Twitter)
  | "sns_instagram" // Instagram
  | "sns_tiktok"    // TikTok
  | "overseas"
  | "chiebukuro"
  | "amazon_books"
  | "youtube";

export const REGION_LABELS: Record<Region, string> = {
  japan: "日本",
  us: "アメリカ",
  europe: "ヨーロッパ",
  asia: "アジア",
};

// ============================================
// APIプロバイダー・無料枠・コスト設定
// ============================================

export type ApiProvider =
  | "gemini"
  | "firecrawl"
  | "brightdata"
  | "perplexity"
  | "openrouter"
  | "manus";

export interface ApiFreeQuota {
  provider: ApiProvider;
  name: string;
  freeQuota: number;
  quotaPeriod: "minute" | "hour" | "day" | "month";
  costPerRequest?: number;
  envKey: string;
}

export const API_FREE_QUOTAS: ApiFreeQuota[] = [
  { provider: "gemini", name: "Gemini API", freeQuota: 60, quotaPeriod: "minute", costPerRequest: 0.0001, envKey: "GOOGLE_API_KEY" },
  { provider: "firecrawl", name: "Firecrawl API", freeQuota: 500, quotaPeriod: "month", costPerRequest: 0.01, envKey: "FIRECRAWL_API_KEY" },
  { provider: "brightdata", name: "BrightData API", freeQuota: 0, quotaPeriod: "month", costPerRequest: 0.005, envKey: "BRIGHTDATA_API_KEY" },
  { provider: "perplexity", name: "Perplexity API", freeQuota: 0, quotaPeriod: "month", costPerRequest: 0.005, envKey: "PERPLEXITY_API_KEY" },
  { provider: "openrouter", name: "OpenRouter", freeQuota: 0, quotaPeriod: "month", costPerRequest: 0, envKey: "OPENROUTER_API_KEY" },
  { provider: "manus", name: "Manus AI", freeQuota: 0, quotaPeriod: "month", costPerRequest: 0.01, envKey: "MANUS_API_KEY" },
];

export interface SourceApiMapping {
  source: DataSource;
  primaryApi: ApiProvider;
  alternativeApis?: ApiProvider[];
  estimatedRequests: number;
}

export const SOURCE_API_MAPPINGS: SourceApiMapping[] = [
  { source: "infotop", primaryApi: "firecrawl", estimatedRequests: 3 },
  { source: "competitor", primaryApi: "firecrawl", estimatedRequests: 5 },
  { source: "chiebukuro", primaryApi: "firecrawl", estimatedRequests: 3 },
  { source: "amazon_books", primaryApi: "firecrawl", estimatedRequests: 3 },
  { source: "youtube", primaryApi: "firecrawl", estimatedRequests: 2 },
  { source: "ads", primaryApi: "brightdata", alternativeApis: ["firecrawl"], estimatedRequests: 5 },
  { source: "sns_x", primaryApi: "brightdata", estimatedRequests: 10 },
  { source: "sns_instagram", primaryApi: "brightdata", estimatedRequests: 10 },
  { source: "sns_tiktok", primaryApi: "brightdata", estimatedRequests: 10 },
  { source: "overseas", primaryApi: "firecrawl", estimatedRequests: 5 },
];

// ============================================
// リサーチプリセット（新版）
// ============================================

export type ResearchPresetId = "free" | "standard" | "thorough" | "custom";

export interface ResearchPreset {
  id: ResearchPresetId;
  name: string;
  description: string;
  icon: string;
  enabledSources: DataSource[];
  estimatedCost: string;
  estimatedTime: string;
}

export const RESEARCH_PRESETS: ResearchPreset[] = [
  {
    id: "free",
    name: "無料",
    description: "無料枠のみ使用。Gemini + Firecrawlの無料枠でリサーチ。",
    icon: "⚡",
    enabledSources: ["chiebukuro", "amazon_books"],
    estimatedCost: "$0",
    estimatedTime: "1〜2分",
  },
  {
    id: "standard",
    name: "標準",
    description: "バランス型。競合分析・YouTube分析も含む。主に無料枠で収まる。",
    icon: "🔍",
    enabledSources: ["infotop", "competitor", "chiebukuro", "amazon_books", "youtube"],
    estimatedCost: "$0〜0.10",
    estimatedTime: "3〜5分",
  },
  {
    id: "thorough",
    name: "徹底",
    description: "SNS分析・広告調査も含む。BrightData/Perplexityが必要。",
    icon: "🚀",
    enabledSources: ["infotop", "competitor", "chiebukuro", "amazon_books", "youtube", "ads", "sns_x", "sns_instagram", "sns_tiktok", "overseas"],
    estimatedCost: "$1〜3",
    estimatedTime: "5〜10分",
  },
  {
    id: "custom",
    name: "カスタム",
    description: "自分で全てのソースとAPIを選択。",
    icon: "⚙️",
    enabledSources: [],
    estimatedCost: "選択次第",
    estimatedTime: "選択次第",
  },
];

// ソースに必要なAPIを取得
export function getRequiredApiForSource(source: DataSource): ApiProvider | null {
  const mapping = SOURCE_API_MAPPINGS.find((m) => m.source === source);
  return mapping?.primaryApi || null;
}

// API無料枠情報を取得
export function getApiQuotaInfo(provider: ApiProvider): ApiFreeQuota | null {
  return API_FREE_QUOTAS.find((q) => q.provider === provider) || null;
}

export const PERIOD_LABELS: Record<SearchPeriod, string> = {
  "1month": "最新1ヶ月",
  "3months": "3ヶ月",
  "6months": "6ヶ月",
  "1year": "1年",
  "all": "全期間",
};

export const SOURCE_LABELS: Record<DataSource, string> = {
  infotop: "Infotopランキング",
  competitor: "競合LP",
  ads: "広告クリエイティブ",
  sns: "SNSトレンド",
  sns_x: "X (Twitter)",
  sns_instagram: "Instagram",
  sns_tiktok: "TikTok",
  overseas: "海外LP",
  chiebukuro: "Yahoo知恵袋",
  amazon_books: "Amazon書籍",
  youtube: "YouTube動画",
};

// スクレイパー詳細情報
export interface ScraperOption {
  id: DataSource;
  name: string;
  description: string;
  icon: string;
  defaultEnabled: boolean;
  category: "keyword" | "pain" | "competitor" | "trend";
}

export const SCRAPER_OPTIONS: ScraperOption[] = [
  {
    id: "infotop",
    name: "Infotopランキング",
    description: "売れている情報商材のタイトル・価格帯・コンセプトを分析",
    icon: "🏪",
    defaultEnabled: true,
    category: "keyword",
  },
  {
    id: "competitor",
    name: "競合LP分析",
    description: "Google検索上位の競合LPを自動スクレイピング・構造分析",
    icon: "🎯",
    defaultEnabled: true,
    category: "competitor",
  },
  {
    id: "chiebukuro",
    name: "Yahoo知恵袋",
    description: "リアルな悩み・質問を収集して深刻度を分析",
    icon: "❓",
    defaultEnabled: true,
    category: "pain",
  },
  {
    id: "amazon_books",
    name: "Amazon書籍",
    description: "売れている書籍のタイトル・パワーワードを抽出",
    icon: "📚",
    defaultEnabled: true,
    category: "keyword",
  },
  {
    id: "youtube",
    name: "YouTube動画",
    description: "人気動画のタイトル・サムネイル要素を分析",
    icon: "🎬",
    defaultEnabled: true,
    category: "keyword",
  },
  {
    id: "ads",
    name: "Meta広告",
    description: "Facebook/Instagram広告のクリエイティブを分析",
    icon: "📢",
    defaultEnabled: false,
    category: "trend",
  },
  {
    id: "sns_x",
    name: "X (Twitter)",
    description: "Xのトレンド・ハッシュタグ・インフルエンサーを分析",
    icon: "𝕏",
    defaultEnabled: false,
    category: "trend",
  },
  {
    id: "sns_instagram",
    name: "Instagram",
    description: "Instagramの投稿・ハッシュタグ・エンゲージメントを分析",
    icon: "📸",
    defaultEnabled: false,
    category: "trend",
  },
  {
    id: "sns_tiktok",
    name: "TikTok",
    description: "TikTokのバイラル動画・トレンドサウンドを分析",
    icon: "🎵",
    defaultEnabled: false,
    category: "trend",
  },
  {
    id: "overseas",
    name: "海外LP",
    description: "海外の競合LPを分析（英語圏）",
    icon: "🌐",
    defaultEnabled: false,
    category: "competitor",
  },
];

// デフォルトで有効なソースを取得
export function getDefaultSources(): DataSource[] {
  return SCRAPER_OPTIONS
    .filter((option) => option.defaultEnabled)
    .map((option) => option.id);
}

// カテゴリ別にスクレイパーを取得
export function getScrapersByCategory(category: ScraperOption["category"]): ScraperOption[] {
  return SCRAPER_OPTIONS.filter((option) => option.category === category);
}

// === リサーチ結果 ===

export interface ResearchResult {
  id: string;
  context: ResearchContext;
  status: ResearchStatus;
  progress: ResearchProgress;
  
  // 各ソースからの結果
  infotopResults?: InfotopResult[];
  competitorResults?: CompetitorLPResult[];
  deepResearchResult?: DeepResearchResult;
  adResults?: AdCreativeResult[];
  snsResults?: SNSTrendResult;
  
  // 統合結果
  synthesis?: ResearchSynthesis;
  
  // 提案
  proposals?: ResearchProposals;
  
  // メタデータ
  createdAt: string;
  completedAt?: string;
  elapsedMs?: number;
}

export type ResearchStatus = "pending" | "running" | "completed" | "failed";

export interface ResearchProgress {
  currentStep: ResearchStep;
  steps: ResearchStepStatus[];
  overallPercent: number;
}

export type ResearchStep =
  | "init"
  | "infotop"
  | "competitor"
  | "deep_research"
  | "ads"
  | "sns"          // 後方互換性のため残す
  | "sns_x"
  | "sns_instagram"
  | "sns_tiktok"
  | "chiebukuro"
  | "amazon_books"
  | "youtube"
  | "synthesis"
  | "proposals"
  | "complete";

export interface ResearchStepStatus {
  step: ResearchStep;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  elapsedMs?: number;
  error?: string;
}

// === Infotop結果 ===

export interface InfotopResult {
  rank: number;
  productName: string;
  genre: string;
  price: number;
  lpUrl: string;                // 販売ページURL
  productPageUrl?: string;      // 商品詳細ページURL (infotop.jp/...)
  affiliateUrl?: string;        // アフィリエイトリンク
  productId?: string;           // 商品ID
  screenshotUrl?: string;
  structure?: LPStructure;
  // AI分析による追加情報
  salesCopy?: string;           // キャッチコピー
  targetPain?: string[];        // ターゲットの悩み
  benefits?: string[];          // ベネフィット
  priceStrategy?: string;       // 価格戦略
  concept?: string;             // コンセプト（21文字以内）
}

// Infotop商品詳細ページ分析結果
export interface InfotopProductAnalysis {
  lpUrl: string | null;
  salesCopy: string;
  targetPain: string[];
  benefits: string[];
  priceStrategy: string;
  concept: string;
}

// === 競合LP結果 ===

export interface CompetitorLPResult {
  url: string;
  title: string;
  screenshotUrl: string;
  structure: LPStructure;
  copyElements: CopyElements;
  designElements: DesignElements;
  similarityScore: number;
}

export interface LPStructure {
  sections: LPSection[];
  totalHeight: number;
  sectionCount: number;
}

export interface LPSection {
  index: number;
  type: SectionType;
  name: string;
  startY: number;
  endY: number;
  description?: string;
}

export type SectionType = 
  | "hero"
  | "problem"
  | "solution"
  | "features"
  | "benefits"
  | "testimonials"
  | "pricing"
  | "guarantee"
  | "faq"
  | "cta"
  | "about"
  | "other";

export interface CopyElements {
  headline: string;
  subheadlines: string[];
  ctaTexts: string[];
  keyPhrases: string[];
}

export interface DesignElements {
  primaryColor: string;
  secondaryColor: string;
  fontStyle: string;
  layoutType: "single" | "multi" | "grid";
  hasVideo: boolean;
  hasAnimation: boolean;
}

// === Deep Research結果 ===

// 信念移転（Belief Transfer）
export interface BeliefTransfer {
  currentBeliefs: string[];       // 現状の信念
  desiredBeliefs: string[];       // 望ましい信念
  bridgeLogic: string[];          // 橋渡しロジック
}

// 損失回避バイアス
export interface LossAversion {
  doNothingRisks: string[];       // 行動しないリスク
  timeLossExamples: string[];     // 時間損失例
  opportunityCosts: string[];     // 機会損失
}

// AIDAインサイト
export interface AidaInsights {
  attention: string[];            // 注意を引くポイント
  interest: string[];             // 興味を持たせるポイント
  desire: string[];               // 欲求を高めるポイント
  action: string[];               // 行動を促すポイント
}

// 競合分析（拡張版）
export interface DeepCompetitorAnalysis {
  commonStructure: string[];      // 共通構成
  headlinePatterns: string[];     // ヘッドラインパターン
  ctaPatterns: string[];          // CTAパターン
  industryDarkness: string[];     // 業界の闘・不都合な真実
  commonEnemyCandidates: string[]; // 共通の敵の候補
}

// アトラクティブキャラクター
export interface AttractiveCharacter {
  backstory: string;              // バックストーリー
  parable: string;                // 寓話・比喩
  flaw: string;                   // 欠点
  polarity: string;               // 極性・立場
}

// N1ペルソナ
export interface N1Persona {
  name: string;                   // 名前
  age: number;                    // 年齢
  occupation: string;             // 職業
  context: string;                // 状況・背景
  painQuotes: string[];           // 痛みの言葉
  desireQuotes: string[];         // 欲求の言葉
  triggers: string[];             // 購買トリガー
  hesitations: string[];          // 躊躇・障壁
  attractiveCharacter?: AttractiveCharacter;
}

// Deep Research結果（拡張版）
export interface DeepResearchResult {
  // 基本フィールド
  trendReport: string;
  marketAnalysis: string;
  psychologyInsights: string;
  recommendations: string[];
  citations: Citation[];

  // 拡張フィールド（コピーライティング強化）
  beliefTransfer?: BeliefTransfer;
  lossAversion?: LossAversion;
  aidaInsights?: AidaInsights;
  competitorAnalysis?: DeepCompetitorAnalysis;
  persona?: N1Persona;
}

export interface Citation {
  title: string;
  url: string;
  snippet: string;
}

// === 広告クリエイティブ結果 ===

export interface AdCreativeResult {
  platform: "meta" | "google" | "tiktok";
  adType: "image" | "video" | "carousel";
  thumbnailUrl: string;
  headline: string;
  description: string;
  callToAction: string;
  landingUrl: string;
}

// === SNSトレンド結果 ===

export interface SNSTrendResult {
  hashtags: HashtagTrend[];
  topics: TopicTrend[];
  influencers: InfluencerInfo[];
}

export interface HashtagTrend {
  tag: string;
  count: number;
  growth: number;
}

export interface TopicTrend {
  topic: string;
  sentiment: "positive" | "neutral" | "negative";
  mentions: number;
}

export interface InfluencerInfo {
  name: string;
  platform: string;
  followers: number;
  engagement: number;
}

// === 統合結果 ===

export interface ResearchSynthesis {
  topPatterns: LPPattern[];
  topHeadlines: string[];
  topCTAs: string[];
  keyInsights: string[];
  differentiationPoints: string[];
}

export interface LPPattern {
  name: string;
  sections: SectionType[];
  usageRate: number;
  successScore: number;
  description: string;
}

// === 提案 ===

export interface ResearchProposals {
  structure: StructureProposal;
  copy: CopyProposal;
  design: DesignProposal;
  referenceLPs: ReferenceLPProposal[];
}

export interface StructureProposal {
  recommended: RecommendedSection[];
  alternativePatterns: LPPattern[];
  rationale: string;
}

export interface RecommendedSection {
  order: number;
  type: SectionType;
  name: string;
  purpose: string;
  elements: string[];
  wordCount: { min: number; max: number };
}

export interface CopyProposal {
  headlines: HeadlineOption[];
  subheadlines: string[];
  ctaButtons: CTAOption[];
  keyPhrases: string[];
}

export interface HeadlineOption {
  text: string;
  type: "benefit" | "curiosity" | "problem" | "social_proof";
  score: number;
}

export interface CTAOption {
  text: string;
  urgency: "low" | "medium" | "high";
  score: number;
}

export interface DesignProposal {
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  fontSuggestions: {
    heading: string;
    body: string;
  };
  layoutType: "single" | "multi" | "grid";
  moodBoard: string[];
}

export interface ReferenceLPProposal {
  url: string;
  screenshotUrl: string;
  title: string;
  similarityScore: number;
  strengths: string[];
  takeaways: string[];
}

// ============================================
// たけるん式リサーチエージェント 追加型定義
// ============================================

// === 市場分析 ===

export interface MarketAnalysis {
  keywords: KeywordVolume[];
  isViable: boolean;  // 2,000〜20,000の範囲か
  recommendation: string;
  totalVolume: number;
}

export interface KeywordVolume {
  term: string;
  volume: number;
  competition: "low" | "medium" | "high";
  trend?: "up" | "stable" | "down";
}

// === 競合分析（たけるん式） ===

export interface CompetitorAnalysis {
  url: string;
  name: string;
  concept: string;           // ヘッドコピー（コンセプト）
  targetPain: string;        // ターゲットの悩み
  benefit: string;           // 提示しているベネフィット
  sections: string[];        // セクション構成
  powerWords: string[];      // パワーワード一覧
  ctaTexts: string[];        // CTAボタンの文言
  pricePoint?: number;       // 価格
  testimonialCount?: number; // お客様の声の数
  source: "google" | "infotop" | "manual";
}

// === 悩み収集（たけるん式） ===

export interface CollectedPainPoint {
  id: string;
  content: string;           // 悩みの内容
  original: string;          // 元のテキスト
  source: PainPointSource;
  sourceUrl?: string;
  depth: 1 | 2 | 3 | 4 | 5;       // 深さ（お金を払うレベルか）
  urgency: 1 | 2 | 3 | 4 | 5;     // 緊急性（今すぐ解決したいか）
  quadrant: PainPointQuadrant;
  severityKeywords: string[];     // 深刻度キーワード
  viewCount?: number;             // 閲覧数（知恵袋等）
  answerCount?: number;           // 回答数
}

export type PainPointSource = 
  | "yahoo_chiebukuro"
  | "amazon_review"
  | "youtube_comment"
  | "competitor_lp"
  | "manual";

export type PainPointQuadrant = 
  | "priority"    // 深い×緊急 → 最優先ターゲット
  | "important"   // 深い×非緊急 → 重要だが後回し
  | "consider"    // 浅い×緊急 → 検討
  | "ignore";     // 浅い×非緊急 → 無視

export const QUADRANT_LABELS: Record<PainPointQuadrant, string> = {
  priority: "🔴 最優先",
  important: "🟡 重要",
  consider: "🟢 検討",
  ignore: "⚪ 無視",
};

// === キーワードバンク（たけるん式） ===

export interface CollectedKeyword {
  id: string;
  word: string;
  source: KeywordSource;
  sourceTitle?: string;      // 書籍タイトル、動画タイトル等
  sourceUrl?: string;
  context: string;           // どんな文脈で使われていたか
  performanceScore?: number; // パフォーマンススコア（再生数比率等）
  category?: "power_word" | "benefit" | "pain" | "urgency" | "trust";
}

export type KeywordSource = 
  | "amazon_book"
  | "youtube_video"
  | "infotop_product"
  | "competitor_lp"
  | "google_ad"
  | "manual";

export const KEYWORD_SOURCE_LABELS: Record<KeywordSource, string> = {
  amazon_book: "📚 Amazon書籍",
  youtube_video: "🎬 YouTube",
  infotop_product: "🏪 Infotop",
  competitor_lp: "🎯 競合LP",
  google_ad: "📢 Google広告",
  manual: "✏️ 手動入力",
};

// === ベネフィット変換 ===

export interface BenefitConversion {
  painPointId: string;
  painPoint: string;         // 元の悩み
  benefit: string;           // ベネフィット
  concreteExpression: string; // 具体的表現（パッとイメージできる）
  keywords: string[];        // 使用したキーワード
}

// === コンセプト候補（たけるん式） ===

export interface ConceptCandidate {
  id: string;
  headline: string;          // コンセプト（21文字以内理想）
  headlineLong?: string;     // 長いバージョン
  characterCount: number;    // 文字数
  targetPain: string;
  benefit: string;
  benefitConcrete: string;   // 具体的表現
  usedKeywords: string[];
  referenceCompetitorId?: string;
  referenceCompetitorConcept?: string;
  scores: ConceptScores;
  rationale: string;         // なぜこのコンセプトを提案したか
}

export interface ConceptScores {
  benefitClarity: number;    // ベネフィット明確度 (0-100)
  specificity: number;       // 具体性 (0-100)
  impact: number;            // インパクト (0-100)
  overall: number;           // 総合スコア (0-100)
}

// === たけるん式リサーチ結果 ===

export interface UchidaResearchResult {
  id: string;
  context: ResearchContext;
  status: ResearchStatus;
  createdAt: string;
  completedAt?: string;
  elapsedMs?: number;
  
  // 市場分析
  market?: MarketAnalysis;
  
  // 競合分析
  competitors: CompetitorAnalysis[];
  
  // 悩みマトリックス
  painPoints: CollectedPainPoint[];
  painPointStats?: {
    total: number;
    byQuadrant: Record<PainPointQuadrant, number>;
    topSeverityKeywords: string[];
  };
  
  // キーワードバンク
  keywords: CollectedKeyword[];
  keywordStats?: {
    total: number;
    bySource: Record<KeywordSource, number>;
    topCategories: { category: string; count: number }[];
  };
  
  // ベネフィット変換
  benefits: BenefitConversion[];
  
  // コンセプト候補
  conceptCandidates: ConceptCandidate[];
  
  // 推奨コンセプト
  recommendedConcept?: ConceptCandidate;
}

// === リサーチステップ（たけるん式6ステップ） ===

export type UchidaResearchStep = 
  | "init"                // 初期化
  | "market_analysis"     // 市場規模チェック
  | "competitor_discovery" // 競合発見
  | "competitor_analysis" // 競合分析
  | "pain_collection"     // 悩み収集
  | "pain_classification" // 悩み分類
  | "keyword_collection"  // キーワード収集
  | "benefit_conversion"  // ベネフィット変換
  | "concept_generation"  // コンセプト生成
  | "complete";           // 完了

export const UCHIDA_STEP_LABELS: Record<UchidaResearchStep, string> = {
  init: "初期化",
  market_analysis: "市場規模チェック",
  competitor_discovery: "競合発見",
  competitor_analysis: "競合分析",
  pain_collection: "悩み収集",
  pain_classification: "悩み分類（マトリックス）",
  keyword_collection: "キーワード収集",
  benefit_conversion: "ベネフィット変換",
  concept_generation: "コンセプト生成",
  complete: "完了",
};

export interface UchidaResearchProgress {
  currentStep: UchidaResearchStep;
  steps: {
    step: UchidaResearchStep;
    label: string;
    status: "pending" | "running" | "completed" | "failed";
    elapsedMs?: number;
    itemCount?: number;  // 収集した項目数
    error?: string;
  }[];
  overallPercent: number;
}


