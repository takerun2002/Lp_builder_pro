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
  type Mood,
  type AgeGroup,
  type DataSource,
  type ResearchPresetId,
  GENRE_LABELS,
  MOOD_LABELS,
  getDefaultSources,
} from "@/lib/research/types";
import type { CompetitorAnalysis } from "@/lib/research/analyzers/concept-extractor";
import type { ClassifiedPainPoint } from "@/lib/research/analyzers/pain-classifier";
import type { KeywordRankingResult } from "@/lib/research/analyzers/keyword-ranker";
import type { ConceptCandidate } from "@/lib/research/concept-generator";
import { Download, Copy, CheckCircle2, ChevronDown, ChevronUp, Sparkles, User, Zap, FileText, Coins, TrendingUp } from "lucide-react";
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

interface ResearchData {
  context: ResearchContext | null;
  infotopProducts: InfotopProduct[];  // 新: Infotop商品
  competitors: CompetitorAnalysis[];
  painPoints: ClassifiedPainPoint[];
  collectedPains: string[];            // 新: 収集した悩み（知恵袋+Amazon）
  keywords: KeywordRankingResult | null;
  concepts: ConceptCandidate[];
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
  
  // トンマナ・参考情報
  const [moods, setMoods] = useState<Mood[]>(["trust", "professional"]);
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
      toneManner: {
        moods,
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
  }, [genre, subGenre, ageGroups, gender, problems, desires, moods, referenceUrls, selectedSources, n1Profile]);

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

      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: data.context,
          sources: ["infotop"],
          step: "infotop",
        }),
      });
      const result = await res.json();

      if (!result.success) {
        addLog("error", `エラー: ${result.error}`);
        throw new Error(result.error);
      }

      const products = result.infotopResults || [];
      addLog("success", `${products.length}件の商品を発見しました`, { count: products.length });

      products.forEach((p: InfotopProduct, i: number) => {
        addLog("info", `${i + 1}. ${p.productName} (¥${p.price?.toLocaleString() || "?"})`, {
          url: p.lpUrl || undefined,
        });
      });

      setData((prev) => ({ ...prev, infotopProducts: products }));
      return products;
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
          const pains = chiebukuroResult.chiebukuroResults
            .map((r: { question?: string }) => r.question)
            .filter(Boolean);
          collectedPains.push(...pains);
          addLog("success", `Yahoo知恵袋から${pains.length}件の悩みを収集`);
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
          const titles = amazonResult.amazonResults
            .map((r: { title?: string }) => r.title)
            .filter(Boolean);
          addLog("success", `Amazon書籍から${titles.length}件のタイトルを収集`);
        }
      } catch {
        addLog("warning", "Amazon書籍の収集に失敗しました");
      }

      // ユーザー入力の悩みも追加
      if (data.context?.target.problems) {
        collectedPains.push(data.context.target.problems);
      }

      addLog("success", `合計${collectedPains.length}件の悩みを収集しました`);
      setData((prev) => ({ ...prev, collectedPains }));
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

  // コンセプト生成ステップ
  const runConceptGenerationStep = async () => {
    setIsRunning(true);
    addLog("progress", "💡 コンセプト生成を開始します...");
    
    await wizard.runStep("concept_generation", async () => {
      addLog("info", "AIがコンセプト案を生成中...");
      
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
      
      setData((prev) => ({ ...prev, concepts: result.concepts }));
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
      lines.push(`- **ターゲット年齢**: ${data.context.target.ageGroups.join(", ")}`);
      lines.push(`- **性別**: ${data.context.target.gender === "female" ? "女性" : data.context.target.gender === "male" ? "男性" : "両方"}`);
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
      case "competitor_search":
      case "competitor_analysis":
        return renderCompetitorStep();
      case "pain_classification":
        return renderPainStep();
      case "keyword_ranking":
        return renderKeywordStep();
      case "concept_generation":
        return renderConceptStep();
      case "complete":
        return renderCompleteStep();
      default:
        return null;
    }
  };

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

        {/* トンマナ */}
        <div className="space-y-2">
          <label className="text-sm font-medium">雰囲気・トンマナ</label>
          <CheckboxGroup
            options={Object.keys(MOOD_LABELS) as Mood[]}
            labels={MOOD_LABELS}
            selected={moods}
            onChange={setMoods}
          />
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="concepts">コンセプト</TabsTrigger>
          <TabsTrigger value="competitors">競合</TabsTrigger>
          <TabsTrigger value="pain">悩み</TabsTrigger>
          <TabsTrigger value="keywords">キーワード</TabsTrigger>
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

