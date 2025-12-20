"use client";

/**
 * リサーチエージェント - ウィザード形式UI
 *
 * たけるん式6ステップに基づいたリサーチフロー
 * 
 * 改善ポイント:
 * - 「お任せモード」で最小限の入力で開始可能
 * - 「悩み・課題」「理想の状態」は任意（リサーチで発見するもの）
 * - N1情報を既に持っている人向けの詳細入力（任意）
 * - LF8（8つの根源的欲求）分析を組み込み
 */

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResearchWizard,
  useResearchWizard,
  type ResearchStep,
} from "@/components/research/ResearchWizard";
import { PainPointMatrix } from "@/components/research/PainPointMatrix";
import { KeywordBank } from "@/components/research/KeywordBank";
import { ConceptList } from "@/components/research/ConceptCard";
import { CompetitorList, CompetitorSummary } from "@/components/research/CompetitorCard";
import { ResearchSourceSelector } from "@/components/research/ResearchSourceSelector";
import {
  type ResearchContext,
  type Genre,
  type AgeGroup,
  type DataSource,
  type ResearchPresetId,
  type DeepResearchResult,
  type InfotopResult,
  GENRE_LABELS,
  getDefaultSources,
} from "@/lib/research/types";
import type { CompetitorAnalysis } from "@/lib/research/analyzers/concept-extractor";
import type { ClassifiedPainPoint } from "@/lib/research/analyzers/pain-classifier";
import type { KeywordRankingResult } from "@/lib/research/analyzers/keyword-ranker";
import type { ConceptCandidate } from "@/lib/research/concept-generator";
import {
  Download, Copy, CheckCircle2, ChevronDown, ChevronUp, Sparkles, User, Zap,
  FileText, Coins, TrendingUp, Brain, Lightbulb, Link as LinkIcon, BarChart3, Loader2,
  ExternalLink, SkipForward
} from "lucide-react";
import { ResearchProgressLog, DiscoveredUrls, type LogEntry } from "@/components/research/ResearchProgressLog";

// ============================================
// LF8（Life Force 8）8つの根源的欲求
// ============================================

type LF8Type = 
  | "survival"      // 生存・長生き
  | "food"          // 食の楽しみ
  | "fear_free"     // 恐怖・苦痛からの解放
  | "sexual"        // 性的魅力・パートナー
  | "comfort"       // 快適な生活
  | "superiority"   // 優越・勝利
  | "protection"    // 愛する人の保護
  | "approval";     // 社会的承認

const LF8_OPTIONS: { id: LF8Type; label: string; description: string; icon: string }[] = [
  { id: "survival", label: "生存・長生き", description: "健康、寿命、安全への欲求", icon: "❤️" },
  { id: "food", label: "食の楽しみ", description: "おいしいもの、満腹感への欲求", icon: "🍽️" },
  { id: "fear_free", label: "恐怖からの解放", description: "苦痛・危険を避けたい欲求", icon: "🛡️" },
  { id: "sexual", label: "性的魅力", description: "モテたい、パートナーが欲しい欲求", icon: "💕" },
  { id: "comfort", label: "快適な生活", description: "便利で楽な生活への欲求", icon: "🏠" },
  { id: "superiority", label: "優越・勝利", description: "人より優れたい、成功したい欲求", icon: "🏆" },
  { id: "protection", label: "愛する人の保護", description: "家族・大切な人を守りたい欲求", icon: "👨‍👩‍👧" },
  { id: "approval", label: "社会的承認", description: "認められたい、尊敬されたい欲求", icon: "👏" },
];

// ============================================
// 型定義
// ============================================

// Yahoo知恵袋結果（簡易版）
interface ChiebukuroResultSimple {
  title: string;
  content?: string;
  url?: string;
  views?: number;
  answers?: number;
  depthScore?: number;
  urgencyScore?: number;
}

// Amazon書籍結果（簡易版）
interface AmazonBookResultSimple {
  title: string;
  author?: string;
  rating?: number;
  reviewCount?: number;
  extractedKeywords?: string[];
}

interface ResearchData {
  context: ResearchContext | null;
  infotopProducts: InfotopProduct[];  // Infotop商品
  competitors: CompetitorAnalysis[];
  painPoints: ClassifiedPainPoint[];
  collectedPains: string[];            // 収集した悩み（知恵袋+Amazon）
  chiebukuroResults?: ChiebukuroResultSimple[];  // Yahoo知恵袋の生結果
  amazonBooksResults?: AmazonBookResultSimple[]; // Amazon書籍の生結果
  keywords: KeywordRankingResult | null;
  concepts: ConceptCandidate[];
  deepResearchResult?: DeepResearchResult;  // Deep Research結果
  // ストーリー型情報
  recommendedStoryType?: string;
  storyTypeLabel?: string;
  storyTypeDescription?: string;
}

// Deep Research進捗状態
interface DeepResearchProgress {
  status: "idle" | "starting" | "polling" | "completed" | "failed";
  attempt: number;
  maxAttempts: number;
  estimatedTimeRemaining: number;
  message: string;
}

// Infotop商品の簡易型
interface InfotopProduct {
  rank: number;
  productName: string;
  price: number;
  lpUrl: string;
  salesCopy?: string;
  targetPain?: string[];
  benefits?: string[];
  concept?: string;
}

interface HybridCostStats {
  totalQueries: number;
  cacheHits: number;
  cacheHitRate: number;
  totalTokensSaved: number;
  estimatedCostSaved: number;
}

// ============================================
// ヘルパーコンポーネント
// ============================================

function CheckboxGroup<T extends string>({
  options,
  labels,
  selected,
  onChange,
}: {
  options: T[];
  labels: Record<T, string>;
  selected: T[];
  onChange: (selected: T[]) => void;
}) {
  const toggle = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => toggle(option)}
          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
            selected.includes(option)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-input hover:bg-muted"
          }`}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

// ============================================
// メインコンポーネント
// ============================================

export default function ResearchPage() {
  // ウィザード状態
  const wizard = useResearchWizard();

  // モード状態
  const [isAutoMode, setIsAutoMode] = useState(true); // お任せモード（デフォルトON）
  const [showAdvanced, setShowAdvanced] = useState(false); // 詳細設定を表示
  const [selectedPreset, setSelectedPreset] = useState<ResearchPresetId>("standard"); // リサーチプリセット

  // 基本フォーム状態（必須）
  const [genre, setGenre] = useState<Genre>("beauty");
  const [subGenre, setSubGenre] = useState("");
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>(["30s", "40s"]);
  const [gender, setGender] = useState<"male" | "female" | "both">("female");
  
  // 任意フォーム状態（N1がわかっている場合など）
  const [problems, setProblems] = useState(""); // 任意：リサーチで発見するもの
  const [desires, setDesires] = useState(""); // 任意：リサーチで発見するもの
  const [n1Profile, setN1Profile] = useState(""); // 任意：N1情報
  const [selectedLF8, setSelectedLF8] = useState<LF8Type[]>([]); // 任意：LF8選択
  
  // 参考情報
  const [referenceUrls, setReferenceUrls] = useState("");
  const [selectedSources, setSelectedSources] = useState<DataSource[]>(getDefaultSources());

  // リサーチデータ
  const [data, setData] = useState<ResearchData>({
    context: null,
    infotopProducts: [],
    competitors: [],
    painPoints: [],
    collectedPains: [],
    keywords: null,
    concepts: [],
  });

  // UI状態
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  
  // ログ機能
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // コスト統計
  const [costStats, setCostStats] = useState<HybridCostStats | null>(null);

  // Deep Research進捗
  const [deepResearchProgress, setDeepResearchProgress] = useState<DeepResearchProgress>({
    status: "idle",
    attempt: 0,
    maxAttempts: 30,
    estimatedTimeRemaining: 300,
    message: "",
  });
  
  // ログ追加関数
  const addLog = useCallback((
    type: LogEntry["type"],
    message: string,
    data?: LogEntry["data"]
  ) => {
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type,
      message,
      data,
    };
    setLogs((prev) => [...prev, newLog]);
  }, []);
  
  // コスト統計を取得（完了ステップで）
  useEffect(() => {
    if (wizard.currentStep === "complete") {
      fetch("/api/hybrid-stats")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.stats) {
            setCostStats(data.stats);
          }
        })
        .catch((err) => console.warn("Failed to fetch hybrid stats:", err));
    }
  }, [wizard.currentStep]);

  // 発見したURL一覧
  const discoveredUrls = data.competitors.map((c) => ({
    url: c.url,
    title: c.concept || undefined,
    domain: (() => {
      try { return new URL(c.url).hostname; } catch { return undefined; }
    })(),
  }));

  // コンテキスト作成
  const buildContext = useCallback((): ResearchContext => {
    return {
      projectName: "リサーチ " + new Date().toLocaleString("ja-JP"),
      genre,
      subGenre: subGenre || undefined,
      target: {
        ageGroups,
        gender,
        problems: problems || undefined, // 任意
        desires: desires || undefined, // 任意
      },
      searchConfig: {
        regions: ["japan"],
        period: "6months",
        sources: selectedSources,
      },
      referenceUrls: referenceUrls
        ? referenceUrls.split("\n").filter((url) => url.trim())
        : undefined,
      // 拡張情報（任意）
      freeText: n1Profile || undefined, // N1情報をfreeTextとして渡す
    };
  }, [genre, subGenre, ageGroups, gender, problems, desires, referenceUrls, selectedSources, n1Profile]);

  // 初期化ステップ完了
  const handleInitComplete = () => {
    const context = buildContext();
    setData((prev) => ({ ...prev, context }));
    wizard.updateStepStatus("init", { status: "completed" });
    wizard.nextStep();
  };

  // ステップ実行
  const handleRunStep = async (step: ResearchStep) => {
    setError(null);

    try {
      switch (step) {
        case "infotop_analysis":
          await runInfotopStep();
          break;
        case "pain_collection":
          await runPainCollectionStep();
          break;
        case "competitor_search":
        case "competitor_analysis":
          await runCompetitorStep();
          break;
        case "pain_classification":
          await runPainClassificationStep();
          break;
        case "keyword_ranking":
          await runKeywordRankingStep();
          break;
        case "deep_research":
          await runDeepResearchStep();
          break;
        case "concept_generation":
          await runConceptGenerationStep();
          break;
        default:
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  // Infotop分析ステップ（新）
  const runInfotopStep = async () => {
    setIsRunning(true);
    addLog("progress", "🏪 Infotop分析を開始します...");

    await wizard.runStep("infotop_analysis", async () => {
      addLog("info", "Infotopランキングを取得中...");

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/398ecfa5-24d8-4a9e-9fa7-c8449daece75',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:runInfotopStep',message:'Starting Infotop step',data:{hasContext:!!data.context,contextGenre:data.context?.genre,contextSubGenre:data.context?.subGenre},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      try {
        const requestBody = {
          context: data.context,
          sources: ["infotop"],
          step: "infotop",
        };

        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/398ecfa5-24d8-4a9e-9fa7-c8449daece75',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:runInfotopStep:beforeFetch',message:'Request body prepared',data:{requestBody:JSON.stringify(requestBody).slice(0,500)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2'})}).catch(()=>{});
        // #endregion

        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/398ecfa5-24d8-4a9e-9fa7-c8449daece75',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:runInfotopStep:afterFetch',message:'Fetch response received',data:{status:res.status,ok:res.ok,statusText:res.statusText},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
        // #endregion

        if (!res.ok) {
          const errorText = await res.text();
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/398ecfa5-24d8-4a9e-9fa7-c8449daece75',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:runInfotopStep:httpError',message:'HTTP error response',data:{status:res.status,errorText:errorText?.slice(0,500)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3,H4'})}).catch(()=>{});
          // #endregion
          addLog("error", `HTTPエラー (${res.status}): ${errorText || "Unknown error"}`);
          throw new Error(`HTTP ${res.status}: ${errorText || "Unknown error"}`);
        }

        const result = await res.json();

        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/398ecfa5-24d8-4a9e-9fa7-c8449daece75',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:runInfotopStep:parseResult',message:'Response parsed',data:{resultOk:result.ok,hasResult:!!result.result,infotopCount:result.result?.infotopResults?.length,resultKeys:Object.keys(result||{})},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion

        // /api/researchは { ok: true, result: ResearchResult } 形式で返す
        if (!result.ok) {
          const errorMessage = result.error || "Infotop分析に失敗しました";
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/398ecfa5-24d8-4a9e-9fa7-c8449daece75',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:runInfotopStep:resultNotOk',message:'API returned not ok',data:{error:errorMessage,resultKeys:Object.keys(result||{})},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3,H5'})}).catch(()=>{});
          // #endregion
          addLog("error", `エラー: ${errorMessage}`);
          throw new Error(errorMessage);
        }

        // result.result.infotopResults から取得
        const infotopResults = result.result?.infotopResults || [];
        
        // InfotopResult → InfotopProduct にマッピング
        const products: InfotopProduct[] = infotopResults.map((r: InfotopResult) => ({
          rank: r.rank || 0,
          productName: r.productName || "",
          price: r.price || 0,
          lpUrl: r.lpUrl || "",
          salesCopy: r.salesCopy,
          targetPain: r.targetPain || [],
          benefits: r.benefits || [],
          concept: r.concept,
        }));

        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/398ecfa5-24d8-4a9e-9fa7-c8449daece75',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:runInfotopStep:success',message:'Products mapped successfully',data:{productCount:products.length,firstProduct:products[0]?.productName},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion

        addLog("success", `${products.length}件の商品を発見しました`, { count: products.length });

        products.forEach((p: InfotopProduct, i: number) => {
          addLog("info", `${i + 1}. ${p.productName} (¥${p.price?.toLocaleString() || "?"})`, {
            url: p.lpUrl || undefined,
          });
        });

        setData((prev) => ({ ...prev, infotopProducts: products }));
        return products;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err) || "Unknown error";
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/398ecfa5-24d8-4a9e-9fa7-c8449daece75',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:runInfotopStep:catch',message:'Exception caught',data:{errorMessage,errorType:err?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3,H4'})}).catch(()=>{});
        // #endregion
        addLog("error", `Infotop分析エラー: ${errorMessage}`);
        throw err;
      }
    });

    setIsRunning(false);
    addLog("success", "Infotop分析ステップ完了");
    wizard.nextStep();
  };

  // 悩み収集ステップ（新）
  const runPainCollectionStep = async () => {
    setIsRunning(true);
    addLog("progress", "😢 悩み収集を開始します...");

    await wizard.runStep("pain_collection", async () => {
      const collectedPains: string[] = [];
      let chiebukuroResults: ChiebukuroResultSimple[] = [];
      let amazonBooksResults: AmazonBookResultSimple[] = [];

      // Infotopから悩みを収集
      data.infotopProducts.forEach((p) => {
        if (p.targetPain) {
          collectedPains.push(...p.targetPain);
        }
      });

      // Yahoo知恵袋から収集
      addLog("info", "Yahoo知恵袋から悩みを収集中...");
      try {
        const chiebukuroRes = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: data.context,
            sources: ["chiebukuro"],
            step: "chiebukuro",
          }),
        });
        const chiebukuroResult = await chiebukuroRes.json();
        if (chiebukuroResult.success && chiebukuroResult.chiebukuroResults) {
          // 生結果を保存
          chiebukuroResults = chiebukuroResult.chiebukuroResults.map((r: ChiebukuroResultSimple) => ({
            title: r.title || "",
            content: r.content,
            url: r.url,
            views: r.views,
            answers: r.answers,
            depthScore: r.depthScore,
            urgencyScore: r.urgencyScore,
          }));
          const pains = chiebukuroResult.chiebukuroResults
            .map((r: { question?: string; title?: string }) => r.question || r.title)
            .filter(Boolean);
          collectedPains.push(...pains);
          addLog("success", `Yahoo知恵袋から${chiebukuroResults.length}件の悩みを収集`);
        }
      } catch {
        addLog("warning", "Yahoo知恵袋の収集に失敗しました");
      }

      // Amazon書籍から収集
      addLog("info", "Amazon書籍からキーワードを収集中...");
      try {
        const amazonRes = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: data.context,
            sources: ["amazon_books"],
            step: "amazon_books",
          }),
        });
        const amazonResult = await amazonRes.json();
        if (amazonResult.success && amazonResult.amazonResults) {
          // 生結果を保存
          amazonBooksResults = amazonResult.amazonResults.map((r: AmazonBookResultSimple) => ({
            title: r.title || "",
            author: r.author,
            rating: r.rating,
            reviewCount: r.reviewCount,
            extractedKeywords: r.extractedKeywords || [],
          }));
          addLog("success", `Amazon書籍から${amazonBooksResults.length}件のタイトルを収集`);
        }
      } catch {
        addLog("warning", "Amazon書籍の収集に失敗しました");
      }

      // ユーザー入力の悩みも追加
      if (data.context?.target.problems) {
        collectedPains.push(data.context.target.problems);
      }

      addLog("success", `合計${collectedPains.length}件の悩みを収集しました`);
      setData((prev) => ({
        ...prev,
        collectedPains,
        chiebukuroResults,
        amazonBooksResults,
      }));
      return collectedPains;
    });

    setIsRunning(false);
    addLog("success", "悩み収集ステップ完了");
    wizard.nextStep();
  };

  // 競合分析ステップ
  const runCompetitorStep = async () => {
    setIsRunning(true);
    addLog("progress", "🔍 競合LP検索を開始します...");
    
    await wizard.runStep("competitor_search", async () => {
      addLog("info", "Google検索で競合LPを収集中...");
      
      const res = await fetch("/api/research/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: data.context,
          mode: "both",
        }),
      });
      const result = await res.json();
      if (!result.success) {
        addLog("error", `エラー: ${result.error}`);
        throw new Error(result.error);
      }

      const competitors = result.analyzed?.analyses || [];
      
      // 発見したLPをログに記録
      addLog("success", `${competitors.length}件の競合LPを発見しました`, { count: competitors.length });
      
      competitors.forEach((c: CompetitorAnalysis, i: number) => {
        addLog("url", `LP ${i + 1}: ${c.concept || "コンセプト分析中"}`, {
          url: c.url,
          title: c.concept || undefined,
        });
      });
      
      setData((prev) => ({ ...prev, competitors }));
      return competitors;
    });
    
    setIsRunning(false);
    addLog("success", "競合分析ステップ完了");
    wizard.nextStep();
  };

  // 悩み分類ステップ
  const runPainClassificationStep = async () => {
    setIsRunning(true);
    addLog("progress", "😢 悩み・課題の分類を開始します...");

    await wizard.runStep("pain_classification", async () => {
      // 収集した悩みを使用（新しいフロー）
      const painTexts = [...data.collectedPains];

      // 競合からも追加（旧フローとの互換性）
      data.competitors.forEach((c) => {
        if (c.targetPain) {
          painTexts.push(c.targetPain);
        }
      });

      // Infotopからも追加
      data.infotopProducts.forEach((p) => {
        if (p.targetPain) {
          painTexts.push(...p.targetPain);
        }
      });

      // ユーザー入力の悩みも追加
      if (data.context?.target.problems) {
        painTexts.push(data.context.target.problems);
      }

      // 重複除去
      const uniquePains = Array.from(new Set(painTexts)).filter(Boolean);

      if (uniquePains.length === 0) {
        addLog("warning", "分類する悩みデータがありません。悩み収集ステップを先に実行してください。");
        throw new Error("分類する悩みがありません");
      }

      addLog("info", `${uniquePains.length}件の悩みテキストを分析中...`, { count: uniquePains.length });

      const res = await fetch("/api/research/pain-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          painPoints: uniquePains,
          context: data.context,
        }),
      });
      const result = await res.json();
      if (!result.success) {
        addLog("error", `エラー: ${result.error}`);
        throw new Error(result.error);
      }

      addLog("success", `${result.classified.length}件の悩みカテゴリに分類しました`, { count: result.classified.length });
      setData((prev) => ({ ...prev, painPoints: result.classified }));
      setIsRunning(false);
      return result.classified;
    });
    wizard.nextStep();
  };

  // キーワードランキングステップ
  const runKeywordRankingStep = async () => {
    setIsRunning(true);
    addLog("progress", "🔑 キーワードランキングを開始します...");

    await wizard.runStep("keyword_ranking", async () => {
      // Infotopからキーワードを収集
      const infotopKeywords = data.infotopProducts.flatMap((p) => [
        p.productName,
        p.concept || "",
        p.salesCopy || "",
        ...(p.benefits || []),
      ]).filter(Boolean);

      // 競合からキーワードを収集
      const competitorKeywords = data.competitors.flatMap((c) => [
        ...c.powerWords,
        ...c.ctaTexts,
        ...c.emotionalTriggers,
      ]);

      // ペインポイントからキーワードを収集
      const painKeywords = data.painPoints.flatMap((p) => p.keywords);

      addLog("info", `Infotopから${infotopKeywords.length}件、競合から${competitorKeywords.length}件、悩みから${painKeywords.length}件のキーワードを収集`);

      // キーワードランキングAPI呼び出し
      const res = await fetch("/api/research/keywords/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: [
            { source: "infotop", keywords: infotopKeywords },
            { source: "competitor", keywords: competitorKeywords },
            { source: "ai_generated", keywords: painKeywords },
          ],
          options: {
            genre: data.context?.genre,
            targetGender: data.context?.target.gender,
            topN: 50,
          },
        }),
      });
      const result = await res.json();
      if (!result.success) {
        addLog("error", `エラー: ${result.error}`);
        throw new Error(result.error);
      }

      addLog("success", `${result.result.rankedKeywords.length}件のキーワードをランキング`, { count: result.result.rankedKeywords.length });
      setData((prev) => ({ ...prev, keywords: result.result }));
      setIsRunning(false);
      return result.result;
    });
    wizard.nextStep();
  };

  // Deep Researchステップ（PRO機能）
  const runDeepResearchStep = async () => {
    if (!data.context) return;

    setIsRunning(true);
    setDeepResearchProgress({
      status: "starting",
      attempt: 0,
      maxAttempts: 30,
      estimatedTimeRemaining: 300,
      message: "Deep Research Agent を起動しています...",
    });

    addLog("progress", "🔍 Deep Research Agent を起動しています...");
    addLog("info", "※ 詳細な市場分析には3〜5分かかる場合があります");

    await wizard.runStep("deep_research", async () => {
      setDeepResearchProgress(prev => ({
        ...prev,
        status: "polling",
        message: "Google検索と市場分析を実行中...",
      }));

      // 進捗表示用のインターバル
      const progressInterval = setInterval(() => {
        setDeepResearchProgress(prev => {
          const newAttempt = prev.attempt + 1;
          const remaining = Math.max(0, (prev.maxAttempts - newAttempt) * 10);
          return {
            ...prev,
            attempt: newAttempt,
            estimatedTimeRemaining: remaining,
            message: getProgressMessage(newAttempt),
          };
        });
      }, 10000);

      try {
        const res = await fetch("/api/research/deep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context: data.context }),
        });

        clearInterval(progressInterval);

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Deep Research failed");
        }

        const { result, elapsedMs } = await res.json();

        setDeepResearchProgress({
          status: "completed",
          attempt: 0,
          maxAttempts: 30,
          estimatedTimeRemaining: 0,
          message: "完了",
        });

        setData((prev) => ({
          ...prev,
          deepResearchResult: result,
        }));

        addLog("success", `Deep Research 完了（${Math.round((elapsedMs || 0) / 1000)}秒）`);

        if (result.trendReport) {
          addLog("info", `📊 トレンドレポート: ${result.trendReport.slice(0, 100)}...`);
        }
        if (result.recommendations?.length > 0) {
          addLog("info", `💡 ${result.recommendations.length}件の推奨事項を取得`);
        }
        if (result.citations?.length > 0) {
          addLog("info", `🔗 ${result.citations.length}件の参考URLを取得`);
        }

        return result;
      } catch (err) {
        clearInterval(progressInterval);
        setDeepResearchProgress({
          status: "failed",
          attempt: 0,
          maxAttempts: 30,
          estimatedTimeRemaining: 0,
          message: err instanceof Error ? err.message : "エラー",
        });

        addLog("error", `Deep Research エラー: ${err instanceof Error ? err.message : "Unknown"}`);
        throw err;
      }
    });

    setIsRunning(false);
    wizard.nextStep();
  };

  // Deep Research進捗メッセージ
  const getProgressMessage = (attempt: number): string => {
    if (attempt < 3) return "🔍 Googleで最新情報を検索中...";
    if (attempt < 6) return "📊 市場データを収集中...";
    if (attempt < 10) return "🧠 競合分析を実行中...";
    if (attempt < 15) return "📈 トレンドレポートを生成中...";
    if (attempt < 20) return "💡 心理学的インサイトを抽出中...";
    return "📝 最終レポートを作成中...";
  };

  // コンセプト生成ステップ
  const runConceptGenerationStep = async () => {
    setIsRunning(true);
    addLog("progress", "💡 コンセプト生成を開始します...");

    // Deep Research結果があれば、コンセプト生成に活用
    const deepResearchInsights = data.deepResearchResult ? `
## Deep Research からの洞察

### トレンドレポート
${data.deepResearchResult.trendReport}

### 市場分析
${data.deepResearchResult.marketAnalysis}

### 心理学的インサイト
${data.deepResearchResult.psychologyInsights}

### 推奨事項
${data.deepResearchResult.recommendations?.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'なし'}

### 参考URL
${data.deepResearchResult.citations?.map(c => `- ${c.title}: ${c.url}`).join('\n') || 'なし'}
` : '';

    await wizard.runStep("concept_generation", async () => {
      addLog("info", "AIがコンセプト案を生成中...");
      if (data.deepResearchResult) {
        addLog("info", "💡 Deep Research結果を活用してコンセプトを強化中...");
      }

      const res = await fetch("/api/research/concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            competitors: data.competitors,
            painPoints: data.painPoints,
            keywords: {
              amazon: [],
              yahoo: [],
              youtube: [],
              infotop: [],
              competitors: data.keywords?.topKeywords.forHeadline || [],
            },
            context: {
              genre: data.context?.genre,
              targetGender: data.context?.target.gender,
            },
            deepResearchInsights,  // Deep Research結果を追加
          },
          options: {
            count: 5,
          },
        }),
      });
      const result = await res.json();
      if (!result.success) {
        addLog("error", `エラー: ${result.error}`);
        throw new Error(result.error);
      }

      addLog("success", `${result.concepts.length}件のコンセプトを生成しました`, { count: result.concepts.length });
      result.concepts.forEach((c: ConceptCandidate, i: number) => {
        addLog("info", `コンセプト${i + 1}: ${c.headline}`);
      });

      // ストーリー型情報をログに追加
      if (result.recommendedStoryType) {
        addLog("info", `📖 推奨ストーリー型: ${result.storyTypeLabel || result.recommendedStoryType}`);
      }

      setData((prev) => ({
        ...prev,
        concepts: result.concepts,
        recommendedStoryType: result.recommendedStoryType,
        storyTypeLabel: result.storyTypeLabel,
        storyTypeDescription: result.storyTypeDescription,
      }));
      setIsRunning(false);
      return result.concepts;
    });
    wizard.nextStep();
  };

  // スキップ処理
  const handleSkipStep = (step: ResearchStep) => {
    wizard.skipStep(step);
    wizard.nextStep();
  };

  // Markdownエクスポート
  const generateMarkdown = useCallback(() => {
    const lines: string[] = [
      "# リサーチ結果レポート",
      "",
      `生成日時: ${new Date().toLocaleString("ja-JP")}`,
      "",
      "---",
      "",
    ];

    // 設定情報
    if (data.context) {
      lines.push("## 📋 リサーチ設定", "");
      lines.push(`- **ジャンル**: ${GENRE_LABELS[data.context.genre]}`);
      if (data.context.subGenre) lines.push(`- **サブジャンル**: ${data.context.subGenre}`);
      lines.push(`- **ターゲット年齢**: ${data.context.target?.ageGroups?.join(", ") || "未指定"}`);
      lines.push(`- **性別**: ${data.context.target?.gender === "female" ? "女性" : data.context.target?.gender === "male" ? "男性" : "両方"}`);
      lines.push("");
    }

    // 発見したLP一覧
    if (data.competitors.length > 0) {
      lines.push("## 🔗 発見した競合LP一覧", "");
      data.competitors.forEach((c, i) => {
        lines.push(`### ${i + 1}. ${c.concept || "コンセプト未検出"}`);
        lines.push(`- **URL**: ${c.url}`);
        if (c.targetPain) lines.push(`- **ターゲットの痛み**: ${c.targetPain}`);
        if (c.benefit) lines.push(`- **ベネフィット**: ${c.benefit}`);
        if (c.powerWords.length > 0) lines.push(`- **パワーワード**: ${c.powerWords.slice(0, 10).join(", ")}`);
        if (c.ctaTexts.length > 0) lines.push(`- **CTA**: ${c.ctaTexts.slice(0, 5).join(", ")}`);
        lines.push("");
      });
    }

    // 悩み分類
    if (data.painPoints.length > 0) {
      lines.push("## 😢 悩み・課題の分類", "");
      data.painPoints.forEach((p, i) => {
        lines.push(`### ${i + 1}. ${p.summary}`);
        lines.push(`- **深刻度**: ${p.depth}/5`);
        lines.push(`- **緊急度**: ${p.urgency}/5`);
        lines.push(`- **分類**: ${p.quadrant}`);
        lines.push(`- **原文**: ${p.original}`);
        if (p.keywords.length > 0) lines.push(`- **キーワード**: ${p.keywords.join(", ")}`);
        lines.push("");
      });
    }

    // キーワード
    if (data.keywords?.rankedKeywords.length) {
      lines.push("## 🔑 キーワードランキング", "");
      lines.push("| 順位 | キーワード | スコア |");
      lines.push("|------|------------|--------|");
      data.keywords.rankedKeywords.slice(0, 20).forEach((kw, i) => {
        lines.push(`| ${i + 1} | ${kw.keyword} | ${kw.scores.overall.toFixed(1)} |`);
      });
      lines.push("");
    }

    // Deep Research結果
    if (data.deepResearchResult) {
      lines.push("## 🧠 Deep Research 結果", "");

      if (data.deepResearchResult.trendReport) {
        lines.push("### トレンドレポート", "");
        lines.push(data.deepResearchResult.trendReport, "");
      }

      if (data.deepResearchResult.marketAnalysis) {
        lines.push("### 市場分析", "");
        lines.push(data.deepResearchResult.marketAnalysis, "");
      }

      if (data.deepResearchResult.psychologyInsights) {
        lines.push("### 心理学的インサイト", "");
        lines.push(data.deepResearchResult.psychologyInsights, "");
      }

      if (data.deepResearchResult.recommendations?.length) {
        lines.push("### 推奨事項", "");
        data.deepResearchResult.recommendations.forEach((rec, i) => {
          lines.push(`${i + 1}. ${rec}`);
        });
        lines.push("");
      }

      if (data.deepResearchResult.citations?.length) {
        lines.push("### 参考URL", "");
        data.deepResearchResult.citations.forEach((c) => {
          lines.push(`- [${c.title}](${c.url})`);
          if (c.snippet) lines.push(`  > ${c.snippet}`);
        });
        lines.push("");
      }
    }

    // コンセプト
    if (data.concepts.length > 0) {
      lines.push("## 💡 生成されたコンセプト", "");
      data.concepts.forEach((c, i) => {
        lines.push(`### コンセプト ${i + 1}`);
        lines.push(`**${c.headline}**`);
        lines.push("");
        if (c.headlineLong) lines.push(`*${c.headlineLong}*`);
        lines.push("");
        if (c.targetPain) lines.push(`- **狙う痛み**: ${c.targetPain}`);
        if (c.benefit) lines.push(`- **ベネフィット**: ${c.benefit}`);
        if (c.benefitConcrete) lines.push(`- **具体的表現**: ${c.benefitConcrete}`);
        lines.push("");
      });
    }

    // 進行ログ
    if (logs.length > 0) {
      lines.push("## 📝 進行ログ", "");
      logs.forEach((log) => {
        const time = log.timestamp.toLocaleTimeString("ja-JP");
        const icon = log.type === "success" ? "✅" : log.type === "error" ? "❌" : log.type === "url" ? "🔗" : "ℹ️";
        let line = `- \`${time}\` ${icon} ${log.message}`;
        if (log.data?.url) line += ` - [${log.data.url}](${log.data.url})`;
        lines.push(line);
      });
    }

    return lines.join("\n");
  }, [data, logs]);

  // エクスポート
  const handleExport = (format: "json" | "yaml" | "markdown") => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "markdown") {
      content = generateMarkdown();
      filename = `research_${Date.now()}.md`;
      mimeType = "text/markdown";
    } else if (format === "json") {
      const exportData = {
        context: data.context,
        competitors: data.competitors,
        painPoints: data.painPoints,
        keywords: data.keywords,
        concepts: data.concepts,
        exportedAt: new Date().toISOString(),
      };
      content = JSON.stringify(exportData, null, 2);
      filename = `research_${Date.now()}.json`;
      mimeType = "application/json";
    } else {
      const exportData = {
        context: data.context,
        competitors: data.competitors,
        painPoints: data.painPoints,
        keywords: data.keywords,
        concepts: data.concepts,
        exportedAt: new Date().toISOString(),
      };
      content = JSON.stringify(exportData, null, 2); // 簡易版
      filename = `research_${Date.now()}.yaml`;
      mimeType = "text/yaml";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // コピー
  const handleCopy = async () => {
    const exportData = {
      context: data.context,
      competitors: data.competitors,
      painPoints: data.painPoints,
      concepts: data.concepts,
    };
    await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // ステップコンテンツをレンダリング
  const renderStepContent = () => {
    switch (wizard.currentStep) {
      case "init":
        return renderInitStep();
      case "infotop_analysis":
        return renderInfotopStep();
      case "pain_collection":
        return renderPainCollectionStep();
      case "competitor_search":
      case "competitor_analysis":
        return renderCompetitorStep();
      case "pain_classification":
        return renderPainStep();
      case "keyword_ranking":
        return renderKeywordStep();
      case "deep_research":
        return renderDeepResearchStep();
      case "concept_generation":
        return renderConceptStep();
      case "complete":
        return renderCompleteStep();
      default:
        return null;
    }
  };

  // Infotop分析ステップUI
  const renderInfotopStep = () => (
    <div className="space-y-4">
      <ResearchProgressLog
        logs={logs}
        isRunning={isRunning}
        onExportMarkdown={() => handleExport("markdown")}
      />

      {data.infotopProducts.length > 0 ? (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {data.infotopProducts.length}件の商品を発見しました
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.infotopProducts.map((product, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                          #{product.rank}
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          ¥{product.price?.toLocaleString() || "?"}
                        </span>
                      </div>
                      <h4 className="font-medium text-sm line-clamp-2">{product.productName}</h4>
                      {product.concept && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {product.concept}
                        </p>
                      )}
                    </div>
                    {product.lpUrl && (
                      <a
                        href={product.lpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>「実行」をクリックしてInfotop分析を開始します</p>
        </div>
      )}
    </div>
  );

  // 悩み収集ステップUI
  const renderPainCollectionStep = () => (
    <div className="space-y-4">
      <ResearchProgressLog
        logs={logs}
        isRunning={isRunning}
        onExportMarkdown={() => handleExport("markdown")}
      />

      {/* Yahoo知恵袋結果 */}
      {data.chiebukuroResults && data.chiebukuroResults.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💬</span>
              <h3 className="font-medium">Yahoo知恵袋から収集した悩み</h3>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                {data.chiebukuroResults.length}件
              </span>
            </div>
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {data.chiebukuroResults.map((q, i) => (
                <li key={i} className="p-2 bg-muted/50 rounded text-sm">
                  <div className="font-medium">{q.title}</div>
                  {(q.depthScore || q.urgencyScore) && (
                    <div className="text-xs text-muted-foreground mt-1">
                      深刻度: {q.depthScore || "-"}/5 | 緊急度: {q.urgencyScore || "-"}/5
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Amazon書籍結果 */}
      {data.amazonBooksResults && data.amazonBooksResults.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📚</span>
              <h3 className="font-medium">Amazon書籍から抽出したキーワード</h3>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                {data.amazonBooksResults.length}件
              </span>
            </div>
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {data.amazonBooksResults.map((book, i) => (
                <li key={i} className="p-2 bg-muted/50 rounded text-sm">
                  <div className="font-medium">{book.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {book.author && <span>{book.author} | </span>}
                    {book.rating && <span>⭐ {book.rating}</span>}
                    {book.reviewCount && <span> | {book.reviewCount}件のレビュー</span>}
                  </div>
                  {book.extractedKeywords && book.extractedKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {book.extractedKeywords.slice(0, 5).map((kw, j) => (
                        <span key={j} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 収集した悩み一覧 */}
      {data.collectedPains.length > 0 ? (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📋</span>
              <h3 className="font-medium">収集した悩み・キーワード</h3>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                {data.collectedPains.length}件
              </span>
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {data.collectedPains.slice(0, 50).map((pain, i) => (
                <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
                  {pain}
                </span>
              ))}
              {data.collectedPains.length > 50 && (
                <span className="text-xs text-muted-foreground">
                  ...他{data.collectedPains.length - 50}件
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        !data.chiebukuroResults?.length && !data.amazonBooksResults?.length && (
          <div className="text-center py-8 text-muted-foreground">
            <p>「実行」をクリックして悩みを収集します</p>
          </div>
        )
      )}
    </div>
  );

  // Deep ResearchステップUI（PRO機能）
  const renderDeepResearchStep = () => (
    <div className="space-y-6">
      {/* 進捗表示 */}
      {deepResearchProgress.status !== "idle" && deepResearchProgress.status !== "completed" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <div className="flex-1">
                  <div className="font-medium">{deepResearchProgress.message}</div>
                  <div className="text-sm text-muted-foreground">
                    残り約{Math.ceil(deepResearchProgress.estimatedTimeRemaining / 60)}分
                  </div>
                </div>
              </div>
              {/* プログレスバー */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-1000"
                  style={{
                    width: `${Math.min(100, (deepResearchProgress.attempt / deepResearchProgress.maxAttempts) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                ※ Google Deep Research Agentがリアルタイムで市場調査を実行しています。
                詳細な分析には3〜5分かかる場合があります。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 進行ログ */}
      <ResearchProgressLog
        logs={logs}
        isRunning={isRunning}
        onExportMarkdown={() => handleExport("markdown")}
      />

      {/* 結果表示 */}
      {data.deepResearchResult && (
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Deep Research 結果</h3>
              <p className="text-sm text-muted-foreground">
                Google検索とAI分析による詳細レポート
              </p>
            </div>
          </div>

          {/* トレンドレポート */}
          {data.deepResearchResult.trendReport && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <h4 className="font-semibold">トレンドレポート</h4>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm">
                    {data.deepResearchResult.trendReport}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 市場分析 */}
          {data.deepResearchResult.marketAnalysis && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-green-500" />
                  <h4 className="font-semibold">市場分析</h4>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm">
                    {data.deepResearchResult.marketAnalysis}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 心理学的インサイト */}
          {data.deepResearchResult.psychologyInsights && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <h4 className="font-semibold">心理学的インサイト</h4>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm">
                    {data.deepResearchResult.psychologyInsights}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 推奨事項 */}
          {data.deepResearchResult.recommendations && data.deepResearchResult.recommendations.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  <h4 className="font-semibold">推奨事項</h4>
                </div>
                <ul className="space-y-2">
                  {data.deepResearchResult.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="font-bold text-primary">{i + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* 信念移転 */}
          {data.deepResearchResult.beliefTransfer && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-indigo-500" />
                  <h4 className="font-semibold">信念移転設計</h4>
                </div>
                <div className="space-y-3">
                  {data.deepResearchResult.beliefTransfer.currentBeliefs.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">現状の信念</div>
                      <ul className="text-sm space-y-1">
                        {data.deepResearchResult.beliefTransfer.currentBeliefs.map((belief, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{belief}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.deepResearchResult.beliefTransfer.desiredBeliefs.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">望ましい信念</div>
                      <ul className="text-sm space-y-1">
                        {data.deepResearchResult.beliefTransfer.desiredBeliefs.map((belief, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-primary">→</span>
                            <span>{belief}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.deepResearchResult.beliefTransfer.bridgeLogic.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">橋渡しロジック</div>
                      <ul className="text-sm space-y-1">
                        {data.deepResearchResult.beliefTransfer.bridgeLogic.map((logic, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-green-600">✓</span>
                            <span>{logic}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 損失回避バイアス */}
          {data.deepResearchResult.lossAversion && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-red-500" />
                  <h4 className="font-semibold">損失回避訴求</h4>
                </div>
                <div className="space-y-3">
                  {data.deepResearchResult.lossAversion.doNothingRisks.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">行動しないリスク</div>
                      <ul className="text-sm space-y-1">
                        {data.deepResearchResult.lossAversion.doNothingRisks.map((risk, i) => (
                          <li key={i} className="flex gap-2 text-red-600 dark:text-red-400">
                            <span>⚠</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.deepResearchResult.lossAversion.opportunityCosts.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">機会損失</div>
                      <ul className="text-sm space-y-1">
                        {data.deepResearchResult.lossAversion.opportunityCosts.map((cost, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{cost}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AIDAインサイト */}
          {data.deepResearchResult.aidaInsights && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <h4 className="font-semibold">AIDA心理障壁分析</h4>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {data.deepResearchResult.aidaInsights.attention.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-blue-600 mb-2">Attention（注意）</div>
                      <ul className="text-sm space-y-1">
                        {data.deepResearchResult.aidaInsights.attention.map((item, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.deepResearchResult.aidaInsights.interest.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-green-600 mb-2">Interest（関心）</div>
                      <ul className="text-sm space-y-1">
                        {data.deepResearchResult.aidaInsights.interest.map((item, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.deepResearchResult.aidaInsights.desire.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-yellow-600 mb-2">Desire（欲求）</div>
                      <ul className="text-sm space-y-1">
                        {data.deepResearchResult.aidaInsights.desire.map((item, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.deepResearchResult.aidaInsights.action.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-purple-600 mb-2">Action（行動）</div>
                      <ul className="text-sm space-y-1">
                        {data.deepResearchResult.aidaInsights.action.map((item, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 競合分析（拡張版） */}
          {data.deepResearchResult.competitorAnalysis && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-orange-500" />
                  <h4 className="font-semibold">競合分析・業界の闇</h4>
                </div>
                <div className="space-y-4">
                  {data.deepResearchResult.competitorAnalysis.industryDarkness.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-red-600 mb-2">業界の闇・不都合な真実</div>
                      <ul className="text-sm space-y-1">
                        {data.deepResearchResult.competitorAnalysis.industryDarkness.map((dark, i) => (
                          <li key={i} className="flex gap-2 text-red-600 dark:text-red-400">
                            <span>⚠</span>
                            <span>{dark}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.deepResearchResult.competitorAnalysis.commonEnemyCandidates.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">共通の敵候補</div>
                      <ul className="text-sm space-y-1">
                        {data.deepResearchResult.competitorAnalysis.commonEnemyCandidates.map((enemy, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{enemy}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.deepResearchResult.competitorAnalysis.headlinePatterns.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">ヘッドラインパターン</div>
                      <ul className="text-sm space-y-1">
                        {data.deepResearchResult.competitorAnalysis.headlinePatterns.map((pattern, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{pattern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* N1ペルソナ */}
          {data.deepResearchResult.persona && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-pink-500" />
                  <h4 className="font-semibold">N1ペルソナ</h4>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{data.deepResearchResult.persona.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {data.deepResearchResult.persona.age}歳 / {data.deepResearchResult.persona.occupation}
                      </div>
                    </div>
                  </div>
                  {data.deepResearchResult.persona.context && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">背景・状況</div>
                      <p className="text-sm">{data.deepResearchResult.persona.context}</p>
                    </div>
                  )}
                  {data.deepResearchResult.persona.painQuotes.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-red-600 mb-2">痛みの言葉</div>
                      <ul className="text-sm space-y-1">
                        {data.deepResearchResult.persona.painQuotes.map((quote, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-red-500">&quot;</span>
                            <span className="italic">{quote}</span>
                            <span className="text-red-500">&quot;</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.deepResearchResult.persona.desireQuotes.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-green-600 mb-2">欲求の言葉</div>
                      <ul className="text-sm space-y-1">
                        {data.deepResearchResult.persona.desireQuotes.map((quote, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-green-500">&quot;</span>
                            <span className="italic">{quote}</span>
                            <span className="text-green-500">&quot;</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.deepResearchResult.persona.attractiveCharacter && (
                    <div className="border-t pt-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">アトラクティブキャラクター</div>
                      <div className="space-y-2 text-sm">
                        {data.deepResearchResult.persona.attractiveCharacter.backstory && (
                          <div>
                            <span className="font-medium">バックストーリー: </span>
                            <span>{data.deepResearchResult.persona.attractiveCharacter.backstory}</span>
                          </div>
                        )}
                        {data.deepResearchResult.persona.attractiveCharacter.parable && (
                          <div>
                            <span className="font-medium">寓話・比喩: </span>
                            <span>{data.deepResearchResult.persona.attractiveCharacter.parable}</span>
                          </div>
                        )}
                        {data.deepResearchResult.persona.attractiveCharacter.flaw && (
                          <div>
                            <span className="font-medium">欠点: </span>
                            <span>{data.deepResearchResult.persona.attractiveCharacter.flaw}</span>
                          </div>
                        )}
                        {data.deepResearchResult.persona.attractiveCharacter.polarity && (
                          <div>
                            <span className="font-medium">極性・立場: </span>
                            <span>{data.deepResearchResult.persona.attractiveCharacter.polarity}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 参考URL（引用） */}
          {data.deepResearchResult.citations && data.deepResearchResult.citations.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <LinkIcon className="w-5 h-5 text-cyan-500" />
                  <h4 className="font-semibold">参考URL</h4>
                </div>
                <ul className="space-y-3">
                  {data.deepResearchResult.citations.map((citation, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span className="text-xs text-muted-foreground pt-1">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          {citation.title}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {citation.snippet && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {citation.snippet}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 未実行時 */}
      {!data.deepResearchResult && deepResearchProgress.status === "idle" && (
        <div className="text-center py-8 space-y-4">
          <div className="p-4 rounded-full bg-primary/10 w-20 h-20 mx-auto flex items-center justify-center">
            <Brain className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Deep Research（PRO機能）</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Google Deep Research Agentによる詳細な市場分析・トレンド調査
            </p>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• リアルタイムのGoogle検索による最新情報収集</p>
            <p>• ターゲット心理・購買行動の詳細分析</p>
            <p>• 競合戦略・市場トレンドのレポート生成</p>
            <p className="text-yellow-600 dark:text-yellow-400">
              ※ 処理に3〜5分かかります
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSkipStep("deep_research")}
              className="flex items-center gap-1"
            >
              <SkipForward className="w-4 h-4" />
              スキップ
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // 初期設定ステップ
  const renderInitStep = () => (
    <div className="space-y-6">
      {/* お任せモード切替 */}
      <Card className={`border-2 transition-colors ${isAutoMode ? "border-primary bg-primary/5" : "border-input"}`}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isAutoMode ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">お任せモード</h3>
                <p className="text-sm text-muted-foreground">
                  最小限の設定でAIがリサーチ。悩み・課題は自動発見
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAutoMode(!isAutoMode)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isAutoMode ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  isAutoMode ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ===== リサーチソース選択（プリセット＆カスタム） ===== */}
      <ResearchSourceSelector
        selectedSources={selectedSources}
        onSourcesChange={setSelectedSources}
        selectedPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
      />

      {/* ===== 基本設定（必須） ===== */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          基本設定
        </h3>

        {/* ジャンル */}
        <div className="space-y-2">
          <label className="text-sm font-medium">ジャンル</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(GENRE_LABELS) as Genre[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenre(g)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  genre === g
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input hover:bg-muted"
                }`}
              >
                {GENRE_LABELS[g]}
              </button>
            ))}
          </div>
          <Input
            value={subGenre}
            onChange={(e) => setSubGenre(e.target.value)}
            placeholder="サブジャンル（例：エイジングケア、ダイエット）"
            className="mt-2"
          />
        </div>

        {/* ターゲット（デモグラフィック） */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">年齢層</label>
            <CheckboxGroup
              options={["20s", "30s", "40s", "50s", "60plus"] as AgeGroup[]}
              labels={{
                "20s": "20代",
                "30s": "30代",
                "40s": "40代",
                "50s": "50代",
                "60plus": "60代以上",
              }}
              selected={ageGroups}
              onChange={setAgeGroups}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">性別</label>
            <div className="flex gap-2">
              {(["female", "male", "both"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    gender === g
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-input hover:bg-muted"
                  }`}
                >
                  {g === "female" ? "女性" : g === "male" ? "男性" : "両方"}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ===== 詳細設定（任意・折りたたみ） ===== */}
      {!isAutoMode && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            詳細設定（任意）
            <span className="text-xs font-normal normal-case">
              N1やインサイトが既に分かっている場合
            </span>
          </button>

          {showAdvanced && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              {/* N1情報入力 */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  N1情報（任意）
                </label>
                <Textarea
                  value={n1Profile}
                  onChange={(e) => setN1Profile(e.target.value)}
                  placeholder="既にN1（理想の1人の顧客像）が分かっている場合に入力&#10;例：35歳女性、2児の母、時短勤務で育児と仕事の両立に悩んでいる..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  ※ 入力しなくてもOK。リサーチ結果からAIが提案します
                </p>
              </div>

              {/* 悩み・理想（任意） */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">悩み・課題（任意）</label>
                  <Textarea
                    value={problems}
                    onChange={(e) => setProblems(e.target.value)}
                    placeholder="仮説として分かっている悩みがあれば"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">理想の状態（任意）</label>
                  <Textarea
                    value={desires}
                    onChange={(e) => setDesires(e.target.value)}
                    placeholder="仮説として分かっている理想があれば"
                    rows={2}
                  />
                </div>
              </div>

              {/* LF8選択 */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  LF8 - 根源的欲求（任意）
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  ターゲットの根源的な欲求がわかっていれば選択
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {LF8_OPTIONS.map((option) => {
                    const isSelected = selectedLF8.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedLF8(selectedLF8.filter((id) => id !== option.id));
                          } else {
                            setSelectedLF8([...selectedLF8, option.id]);
                          }
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary"
                            : "bg-background border-input hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-lg">{option.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium ${isSelected ? "text-primary" : ""}`}>
                            {option.label}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {option.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 参考URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium">参考URL（任意）</label>
        <Textarea
          value={referenceUrls}
          onChange={(e) => setReferenceUrls(e.target.value)}
          placeholder="参考にしたいLPのURLを1行に1つずつ入力"
          rows={2}
        />
      </div>

      {/* 開始ボタン */}
      <Button 
        onClick={handleInitComplete} 
        className="w-full" 
        size="lg"
        disabled={selectedSources.length === 0}
      >
        リサーチ開始
      </Button>
    </div>
  );

  // 競合分析ステップ
  const renderCompetitorStep = () => (
    <div className="space-y-4">
      {/* 進行ログ */}
      <ResearchProgressLog
        logs={logs}
        isRunning={isRunning}
        onExportMarkdown={() => handleExport("markdown")}
      />
      
      {data.competitors.length > 0 ? (
        <>
          {/* 発見したURL一覧 */}
          <DiscoveredUrls urls={discoveredUrls} />
          
          <CompetitorSummary competitors={data.competitors} />
          <CompetitorList competitors={data.competitors} />
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>「実行」をクリックして競合LPを分析します</p>
        </div>
      )}
    </div>
  );

  // 悩み分類ステップ
  const renderPainStep = () => (
    <div className="space-y-4">
      {data.painPoints.length > 0 ? (
        <PainPointMatrix painPoints={data.painPoints} />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>「実行」をクリックして悩みを分類します</p>
        </div>
      )}
    </div>
  );

  // キーワードランキングステップ
  const renderKeywordStep = () => (
    <div className="space-y-4">
      {data.keywords ? (
        <KeywordBank result={data.keywords} />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>「実行」をクリックしてキーワードをランキングします</p>
        </div>
      )}
    </div>
  );

  // コンセプト生成ステップ
  const renderConceptStep = () => (
    <div className="space-y-4">
      {/* ストーリー型情報 */}
      {data.recommendedStoryType && (
        <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">推奨ストーリー型</span>
          </div>
          <div className="text-sm font-semibold text-primary">
            {data.storyTypeLabel || data.recommendedStoryType}
          </div>
          {data.storyTypeDescription && (
            <div className="text-xs text-muted-foreground mt-1">
              {data.storyTypeDescription}
            </div>
          )}
        </div>
      )}

      {data.concepts.length > 0 ? (
        <ConceptList
          concepts={data.concepts}
          selectedId={selectedConcept || undefined}
          onSelect={(c) => setSelectedConcept(c.id)}
        />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>「実行」をクリックしてコンセプトを生成します</p>
        </div>
      )}
    </div>
  );

  // 完了ステップ
  const renderCompleteStep = () => (
    <div className="space-y-6">
      <div className="text-center py-4">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold">リサーチ完了</h3>
        <p className="text-muted-foreground">
          すべてのステップが完了しました
        </p>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{data.competitors.length}</div>
            <div className="text-sm text-muted-foreground">競合LP</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{data.painPoints.length}</div>
            <div className="text-sm text-muted-foreground">悩み分類</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">
              {data.keywords?.rankedKeywords.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">キーワード</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{data.concepts.length}</div>
            <div className="text-sm text-muted-foreground">コンセプト</div>
          </CardContent>
        </Card>
      </div>

      {/* コスト削減効果 */}
      {costStats && costStats.totalQueries > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
                  <Coins className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-700 dark:text-green-300">
                    CAG+RAGによるコスト削減
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ナレッジキャッシュで効率化
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${costStats.estimatedCostSaved.toFixed(4)}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  削減額
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 pt-3 border-t border-green-200 dark:border-green-800">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-lg font-semibold text-green-700 dark:text-green-300">
                  <TrendingUp className="w-4 h-4" />
                  {costStats.cacheHitRate}%
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">キャッシュヒット率</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-700 dark:text-green-300">
                  {costStats.totalTokensSaved.toLocaleString()}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">節約トークン</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-700 dark:text-green-300">
                  {costStats.totalQueries}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">総クエリ数</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 結果タブ */}
      <Tabs defaultValue="concepts">
        <TabsList className={`grid w-full ${data.deepResearchResult ? "grid-cols-5" : "grid-cols-4"}`}>
          <TabsTrigger value="concepts">コンセプト</TabsTrigger>
          <TabsTrigger value="competitors">競合</TabsTrigger>
          <TabsTrigger value="pain">悩み</TabsTrigger>
          <TabsTrigger value="keywords">キーワード</TabsTrigger>
          {data.deepResearchResult && (
            <TabsTrigger value="deep_research">Deep Research</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="concepts" className="mt-4">
          {data.concepts.length > 0 && (
            <ConceptList
              concepts={data.concepts}
              selectedId={selectedConcept || undefined}
              onSelect={(c) => setSelectedConcept(c.id)}
            />
          )}
        </TabsContent>

        <TabsContent value="competitors" className="mt-4">
          {data.competitors.length > 0 && (
            <CompetitorList competitors={data.competitors} />
          )}
        </TabsContent>

        <TabsContent value="pain" className="mt-4">
          {data.painPoints.length > 0 && (
            <PainPointMatrix painPoints={data.painPoints} />
          )}
        </TabsContent>

        <TabsContent value="keywords" className="mt-4">
          {data.keywords && <KeywordBank result={data.keywords} />}
        </TabsContent>

        {data.deepResearchResult && (
          <TabsContent value="deep_research" className="mt-4 space-y-4">
            {/* Deep Research サマリー */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-6 h-6 text-primary" />
                  <h3 className="font-semibold">Deep Research 結果</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {data.deepResearchResult.recommendations?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">推奨事項</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {data.deepResearchResult.citations?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">参考URL</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">✓</div>
                    <div className="text-sm text-muted-foreground">完了</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 各セクション */}
            {data.deepResearchResult.trendReport && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <h4 className="font-semibold">トレンドレポート</h4>
                  </div>
                  <div className="whitespace-pre-wrap text-sm">{data.deepResearchResult.trendReport}</div>
                </CardContent>
              </Card>
            )}

            {data.deepResearchResult.marketAnalysis && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-green-500" />
                    <h4 className="font-semibold">市場分析</h4>
                  </div>
                  <div className="whitespace-pre-wrap text-sm">{data.deepResearchResult.marketAnalysis}</div>
                </CardContent>
              </Card>
            )}

            {data.deepResearchResult.psychologyInsights && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5 text-purple-500" />
                    <h4 className="font-semibold">心理学的インサイト</h4>
                  </div>
                  <div className="whitespace-pre-wrap text-sm">{data.deepResearchResult.psychologyInsights}</div>
                </CardContent>
              </Card>
            )}

            {data.deepResearchResult.recommendations && data.deepResearchResult.recommendations.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    <h4 className="font-semibold">推奨事項</h4>
                  </div>
                  <ul className="space-y-2">
                    {data.deepResearchResult.recommendations.map((rec, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="font-bold text-primary">{i + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {data.deepResearchResult.citations && data.deepResearchResult.citations.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <LinkIcon className="w-5 h-5 text-cyan-500" />
                    <h4 className="font-semibold">参考URL</h4>
                  </div>
                  <ul className="space-y-2">
                    {data.deepResearchResult.citations.map((citation, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="text-xs text-muted-foreground pt-1">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                          >
                            {citation.title}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          {citation.snippet && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{citation.snippet}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* 発見したURL一覧 */}
      {discoveredUrls.length > 0 && (
        <DiscoveredUrls urls={discoveredUrls} />
      )}

      {/* エクスポート */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="default" onClick={() => handleExport("markdown")}>
          <FileText className="w-4 h-4 mr-2" />
          Markdown
        </Button>
        <Button variant="outline" onClick={() => handleExport("json")}>
          <Download className="w-4 h-4 mr-2" />
          JSON
        </Button>
        <Button variant="outline" onClick={handleCopy}>
          {copySuccess ? (
            <CheckCircle2 className="w-4 h-4 mr-2" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          {copySuccess ? "コピーしました" : "コピー"}
        </Button>
        <Button variant="outline" onClick={wizard.reset}>
          新規リサーチ
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">リサーチエージェント</h1>
            <p className="text-sm text-muted-foreground">
              たけるん式6ステップでコンセプトを生成
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dev">
              <Button variant="outline" size="sm">
                開発メニュー
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                ホーム
              </Button>
            </Link>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive">{error}</div>
            </CardContent>
          </Card>
        )}

        {/* ウィザード */}
        <ResearchWizard
          currentStep={wizard.currentStep}
          stepStatuses={wizard.stepStatuses}
          onRunStep={handleRunStep}
          onSkipStep={handleSkipStep}
          onPrevStep={wizard.prevStep}
          onNextStep={wizard.nextStep}
          isRunning={wizard.isRunning}
        >
          {renderStepContent()}
        </ResearchWizard>

        {/* フッター */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>※ 各ステップは1〜2分程度かかります。</p>
          <p>※ 使用するAPIは選択したリサーチソースにより異なります。</p>
        </div>
      </div>
    </div>
  );
}

