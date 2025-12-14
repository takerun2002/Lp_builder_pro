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
  
  // トンマナ
  toneManner: ToneManner;
  
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
  problems: string;      // 悩み・課題
  desires: string;       // 理想の状態
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
export type DataSource = "infotop" | "competitor" | "ads" | "sns" | "overseas" | "chiebukuro" | "amazon_books" | "youtube";

export const REGION_LABELS: Record<Region, string> = {
  japan: "日本",
  us: "アメリカ",
  europe: "ヨーロッパ",
  asia: "アジア",
};

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
  overseas: "海外LP",
  chiebukuro: "Yahoo知恵袋",
  amazon_books: "Amazon書籍",
  youtube: "YouTube動画",
};

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
  | "sns"
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
  lpUrl: string;
  screenshotUrl?: string;
  structure?: LPStructure;
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

export interface DeepResearchResult {
  trendReport: string;
  marketAnalysis: string;
  psychologyInsights: string;
  recommendations: string[];
  citations: Citation[];
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
// 内田式リサーチエージェント 追加型定義
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

// === 競合分析（内田式） ===

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

// === 悩み収集（内田式） ===

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

// === キーワードバンク（内田式） ===

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

// === コンセプト候補（内田式） ===

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

// === 内田式リサーチ結果 ===

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

// === リサーチステップ（内田式6ステップ） ===

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
