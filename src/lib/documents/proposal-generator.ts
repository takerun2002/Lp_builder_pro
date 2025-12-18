/**
 * Proposal Generator
 * リサーチ結果から提案書を自動生成
 */

import { getGeminiClient, getDefaultGeminiTextModelId } from "@/lib/ai/gemini";
import type {
  ResearchResult,
  UchidaResearchResult,
  ResearchContext,
  CompetitorAnalysis,
  CollectedPainPoint,
} from "@/lib/research/types";

// =============================================================================
// Types
// =============================================================================

export type ProposalTemplate = "simple" | "detailed" | "presentation";

export interface ProposalSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface ProposalMetadata {
  projectName: string;
  createdAt: string;
  template: ProposalTemplate;
  pageCount: number;
  wordCount: number;
}

export interface GeneratedProposal {
  id: string;
  metadata: ProposalMetadata;
  sections: ProposalSection[];
  rawMarkdown: string;
  htmlContent: string;
}

export interface ProposalGeneratorOptions {
  template: ProposalTemplate;
  includeScreenshots?: boolean;
  includeCharts?: boolean;
  language?: "ja" | "en";
}

// =============================================================================
// Template Definitions
// =============================================================================

const TEMPLATE_SECTIONS: Record<ProposalTemplate, string[]> = {
  simple: [
    "executive_summary",
    "market_analysis",
    "competitor_overview",
    "concept_proposal",
    "next_steps",
  ],
  detailed: [
    "executive_summary",
    "project_background",
    "market_analysis",
    "competitor_analysis",
    "pain_point_analysis",
    "keyword_insights",
    "concept_proposals",
    "design_direction",
    "timeline",
    "appendix",
  ],
  presentation: [
    "title_slide",
    "problem_statement",
    "market_opportunity",
    "competitive_landscape",
    "target_audience",
    "proposed_concept",
    "key_messages",
    "visual_direction",
    "call_to_action",
  ],
};

const SECTION_TITLES: Record<string, string> = {
  executive_summary: "エグゼクティブサマリー",
  project_background: "プロジェクト背景",
  market_analysis: "市場分析",
  competitor_overview: "競合概要",
  competitor_analysis: "競合詳細分析",
  pain_point_analysis: "ターゲットペイン分析",
  keyword_insights: "キーワードインサイト",
  concept_proposal: "コンセプト提案",
  concept_proposals: "コンセプト候補一覧",
  design_direction: "デザイン方向性",
  timeline: "スケジュール",
  next_steps: "ネクストステップ",
  appendix: "付録",
  title_slide: "タイトル",
  problem_statement: "課題定義",
  market_opportunity: "市場機会",
  competitive_landscape: "競合環境",
  target_audience: "ターゲット像",
  proposed_concept: "提案コンセプト",
  key_messages: "キーメッセージ",
  visual_direction: "ビジュアル方向性",
  call_to_action: "ネクストアクション",
};

// =============================================================================
// Proposal Generator
// =============================================================================

/**
 * リサーチ結果から提案書を生成
 */
export async function generateProposal(
  research: ResearchResult | UchidaResearchResult,
  options: ProposalGeneratorOptions
): Promise<GeneratedProposal> {
  const { template = "simple" } = options;
  const sectionIds = TEMPLATE_SECTIONS[template];

  // 各セクションを生成
  const sections: ProposalSection[] = [];
  for (let i = 0; i < sectionIds.length; i++) {
    const sectionId = sectionIds[i];
    const content = await generateSectionContent(sectionId, research, options);
    sections.push({
      id: sectionId,
      title: SECTION_TITLES[sectionId] || sectionId,
      content,
      order: i + 1,
    });
  }

  // Markdown生成
  const rawMarkdown = generateMarkdown(sections, research.context, template);
  const htmlContent = markdownToHtml(rawMarkdown);

  const wordCount = rawMarkdown.replace(/[#*\-\[\]()]/g, "").length;
  const pageCount = Math.ceil(wordCount / 1500); // 1ページ約1500文字

  return {
    id: `proposal_${Date.now()}`,
    metadata: {
      projectName: research.context.projectName,
      createdAt: new Date().toISOString(),
      template,
      pageCount,
      wordCount,
    },
    sections,
    rawMarkdown,
    htmlContent,
  };
}

// =============================================================================
// Section Content Generators
// =============================================================================

async function generateSectionContent(
  sectionId: string,
  research: ResearchResult | UchidaResearchResult,
  // Options reserved for future use (screenshots, charts, language)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: ProposalGeneratorOptions
): Promise<string> {
  const isUchida = "conceptCandidates" in research;

  switch (sectionId) {
    case "executive_summary":
    case "title_slide":
      return generateExecutiveSummary(research, isUchida);

    case "project_background":
    case "problem_statement":
      return generateProjectBackground(research.context);

    case "market_analysis":
    case "market_opportunity":
      return generateMarketAnalysis(research, isUchida);

    case "competitor_overview":
    case "competitive_landscape":
      return generateCompetitorOverview(research, isUchida);

    case "competitor_analysis":
      return generateCompetitorAnalysis(research, isUchida);

    case "pain_point_analysis":
    case "target_audience":
      return generatePainPointAnalysis(research, isUchida);

    case "keyword_insights":
    case "key_messages":
      return generateKeywordInsights(research, isUchida);

    case "concept_proposal":
    case "concept_proposals":
    case "proposed_concept":
      return generateConceptProposals(research, isUchida);

    case "design_direction":
    case "visual_direction":
      return generateDesignDirection(research);

    case "timeline":
      return generateTimeline();

    case "next_steps":
    case "call_to_action":
      return generateNextSteps();

    case "appendix":
      return generateAppendix(research, isUchida);

    default:
      return "";
  }
}

function generateExecutiveSummary(
  research: ResearchResult | UchidaResearchResult,
  isUchida: boolean
): string {
  const context = research.context;
  const competitorCount = isUchida
    ? (research as UchidaResearchResult).competitors?.length || 0
    : (research as ResearchResult).competitorResults?.length || 0;

  let conceptText = "";
  if (isUchida) {
    const uchida = research as UchidaResearchResult;
    if (uchida.recommendedConcept) {
      conceptText = `\n\n**推奨コンセプト**: ${uchida.recommendedConcept.headline}`;
    }
  } else {
    const normal = research as ResearchResult;
    if (normal.synthesis?.topHeadlines?.[0]) {
      conceptText = `\n\n**推奨ヘッドライン**: ${normal.synthesis.topHeadlines[0]}`;
    }
  }

  return `本提案書は「${context.projectName}」のLP制作に向けたリサーチ結果をまとめたものです。

**調査概要**
- ジャンル: ${context.genre}
- ターゲット: ${context.target.gender === "male" ? "男性" : context.target.gender === "female" ? "女性" : "両性"} / ${context.target.ageGroups.join(", ")}
- 競合分析数: ${competitorCount}社
${conceptText}

本リサーチを基に、ターゲットの心理に訴求する効果的なLPを制作いたします。`;
}

function generateProjectBackground(context: ResearchContext): string {
  return `## プロジェクト背景

### ターゲット情報
| 項目 | 内容 |
|------|------|
| 年齢層 | ${context.target.ageGroups.join(", ")} |
| 性別 | ${context.target.gender === "male" ? "男性" : context.target.gender === "female" ? "女性" : "両性"} |
| 悩み | ${context.target.problems || "（未設定）"} |
| 理想像 | ${context.target.desires || "（未設定）"} |
${context.target.occupation ? `| 職業 | ${context.target.occupation} |` : ""}

### トンマナ
- ムード: ${context.toneManner.moods.join(", ")}
${context.toneManner.fontStyle ? `- フォントスタイル: ${context.toneManner.fontStyle}` : ""}`;
}

function generateMarketAnalysis(
  research: ResearchResult | UchidaResearchResult,
  isUchida: boolean
): string {
  if (isUchida) {
    const uchida = research as UchidaResearchResult;
    if (uchida.market) {
      const keywords = uchida.market.keywords.slice(0, 5);
      const keywordTable = keywords
        .map((k) => `| ${k.term} | ${k.volume.toLocaleString()} | ${k.competition} |`)
        .join("\n");

      return `## 市場分析

### 検索ボリューム
| キーワード | 月間検索数 | 競合度 |
|-----------|-----------|--------|
${keywordTable}

**総検索ボリューム**: ${uchida.market.totalVolume.toLocaleString()}

**市場評価**: ${uchida.market.isViable ? "✅ 参入可能（2,000〜20,000の適正範囲）" : "⚠️ 要検討"}

${uchida.market.recommendation}`;
    }
  }

  return `## 市場分析

市場データの詳細分析は、追加調査により提供可能です。

**推定市場規模**: ${research.context.genre}市場は成長傾向にあり、ターゲット層への訴求機会が存在します。`;
}

function generateCompetitorOverview(
  research: ResearchResult | UchidaResearchResult,
  isUchida: boolean
): string {
  const competitors = isUchida
    ? (research as UchidaResearchResult).competitors || []
    : (research as ResearchResult).competitorResults?.map((c) => ({
        name: c.title,
        concept: c.copyElements.headline,
        targetPain: "",
        benefit: "",
      })) || [];

  if (competitors.length === 0) {
    return "## 競合概要\n\n競合データが収集されていません。";
  }

  const top3 = competitors.slice(0, 3);
  const table = top3
    .map((c, i) => {
      if (isUchida) {
        const comp = c as CompetitorAnalysis;
        return `| ${i + 1} | ${comp.name || "不明"} | ${comp.concept || "-"} |`;
      }
      return `| ${i + 1} | ${c.name || "不明"} | ${c.concept || "-"} |`;
    })
    .join("\n");

  return `## 競合概要

### 主要競合（上位${top3.length}社）
| 順位 | 競合名 | コンセプト |
|------|--------|----------|
${table}

**競合数**: ${competitors.length}社を分析`;
}

function generateCompetitorAnalysis(
  research: ResearchResult | UchidaResearchResult,
  isUchida: boolean
): string {
  if (!isUchida) {
    return generateCompetitorOverview(research, isUchida);
  }

  const uchida = research as UchidaResearchResult;
  const competitors = uchida.competitors || [];

  if (competitors.length === 0) {
    return "## 競合詳細分析\n\n競合データが収集されていません。";
  }

  const details = competitors.slice(0, 5).map((comp, i) => {
    return `### ${i + 1}. ${comp.name || comp.url}

- **コンセプト**: ${comp.concept || "（不明）"}
- **ターゲットペイン**: ${comp.targetPain || "（不明）"}
- **ベネフィット**: ${comp.benefit || "（不明）"}
- **パワーワード**: ${comp.powerWords?.slice(0, 5).join(", ") || "（なし）"}
- **CTA**: ${comp.ctaTexts?.join(", ") || "（なし）"}
${comp.pricePoint ? `- **価格帯**: ¥${comp.pricePoint.toLocaleString()}` : ""}`;
  });

  return `## 競合詳細分析

${details.join("\n\n")}`;
}

function generatePainPointAnalysis(
  research: ResearchResult | UchidaResearchResult,
  isUchida: boolean
): string {
  if (!isUchida) {
    return `## ターゲット分析

### 主な悩み
${research.context.target.problems || "（リサーチデータなし）"}

### 理想像
${research.context.target.desires || "（リサーチデータなし）"}`;
  }

  const uchida = research as UchidaResearchResult;
  const painPoints = uchida.painPoints || [];

  if (painPoints.length === 0) {
    return "## ペイン分析\n\n悩みデータが収集されていません。";
  }

  // クアドラント別に分類
  const priority = painPoints.filter((p) => p.quadrant === "priority").slice(0, 3);
  const important = painPoints.filter((p) => p.quadrant === "important").slice(0, 3);

  const formatPain = (p: CollectedPainPoint) =>
    `- ${p.content}（深度: ${p.depth}/5, 緊急度: ${p.urgency}/5）`;

  return `## ペイン分析

### 🔴 最優先ターゲット（深い × 緊急）
${priority.map(formatPain).join("\n") || "（該当なし）"}

### 🟡 重要ターゲット（深い × 非緊急）
${important.map(formatPain).join("\n") || "（該当なし）"}

**総悩み数**: ${painPoints.length}件
${uchida.painPointStats?.topSeverityKeywords ? `\n**深刻度キーワード**: ${uchida.painPointStats.topSeverityKeywords.join(", ")}` : ""}`;
}

function generateKeywordInsights(
  research: ResearchResult | UchidaResearchResult,
  isUchida: boolean
): string {
  if (!isUchida) {
    const normal = research as ResearchResult;
    const phrases = normal.synthesis?.keyInsights || [];
    if (phrases.length === 0) {
      return "## キーワードインサイト\n\n（データなし）";
    }
    return `## キーワードインサイト\n\n${phrases.map((p) => `- ${p}`).join("\n")}`;
  }

  const uchida = research as UchidaResearchResult;
  const keywords = uchida.keywords || [];

  if (keywords.length === 0) {
    return "## キーワードインサイト\n\nキーワードデータが収集されていません。";
  }

  // カテゴリ別に分類
  const powerWords = keywords.filter((k) => k.category === "power_word").slice(0, 5);
  const benefits = keywords.filter((k) => k.category === "benefit").slice(0, 5);
  const urgency = keywords.filter((k) => k.category === "urgency").slice(0, 5);

  return `## キーワードインサイト

### パワーワード
${powerWords.map((k) => `- **${k.word}** （出典: ${k.sourceTitle || k.source}）`).join("\n") || "（該当なし）"}

### ベネフィット表現
${benefits.map((k) => `- **${k.word}** （出典: ${k.sourceTitle || k.source}）`).join("\n") || "（該当なし）"}

### 緊急性表現
${urgency.map((k) => `- **${k.word}** （出典: ${k.sourceTitle || k.source}）`).join("\n") || "（該当なし）"}

**総キーワード数**: ${keywords.length}件`;
}

function generateConceptProposals(
  research: ResearchResult | UchidaResearchResult,
  isUchida: boolean
): string {
  if (!isUchida) {
    const normal = research as ResearchResult;
    const headlines = normal.synthesis?.topHeadlines || [];
    if (headlines.length === 0) {
      return "## コンセプト提案\n\n（提案データなし）";
    }
    return `## コンセプト提案

### 推奨ヘッドライン
${headlines.slice(0, 3).map((h, i) => `${i + 1}. ${h}`).join("\n")}`;
  }

  const uchida = research as UchidaResearchResult;
  const concepts = uchida.conceptCandidates || [];
  const recommended = uchida.recommendedConcept;

  if (concepts.length === 0 && !recommended) {
    return "## コンセプト提案\n\nコンセプトが生成されていません。";
  }

  let content = "## コンセプト提案\n\n";

  if (recommended) {
    content += `### ⭐ 推奨コンセプト

> **${recommended.headline}**

| 項目 | スコア |
|------|--------|
| ベネフィット明確度 | ${recommended.scores.benefitClarity}/100 |
| 具体性 | ${recommended.scores.specificity}/100 |
| インパクト | ${recommended.scores.impact}/100 |
| **総合** | **${recommended.scores.overall}/100** |

**提案理由**: ${recommended.rationale}

---

`;
  }

  if (concepts.length > 0) {
    const others = concepts.filter((c) => c.id !== recommended?.id).slice(0, 3);
    if (others.length > 0) {
      content += `### 代替案

${others.map((c, i) => `${i + 1}. **${c.headline}**（総合スコア: ${c.scores.overall}）\n   ${c.rationale}`).join("\n\n")}`;
    }
  }

  return content;
}

function generateDesignDirection(research: ResearchResult | UchidaResearchResult): string {
  const context = research.context;
  const moods = context.toneManner.moods;

  const moodDescriptions: Record<string, string> = {
    luxury: "高級感のある配色とエレガントなフォントを使用",
    casual: "明るく親しみやすいカラーとカジュアルなレイアウト",
    trust: "落ち着いた色調と信頼性を演出するデザイン",
    friendly: "温かみのある配色とアクセシブルなデザイン",
    professional: "シャープでモダンな印象のビジネスデザイン",
    emotional: "感情に訴える画像とストーリーテリングを重視",
  };

  const moodGuide = moods.map((m) => `- ${moodDescriptions[m] || m}`).join("\n");

  return `## デザイン方向性

### トンマナガイド
${moodGuide}

### 推奨カラー
ターゲット層と業界特性を考慮した配色を提案:
- プライマリ: ターゲットの信頼感を高める色
- アクセント: CTAボタンで視認性を確保

### フォント
- 見出し: ${context.toneManner.fontStyle === "formal" ? "明朝体系" : "ゴシック体系"}
- 本文: 可読性を重視したサンセリフ

### レイアウト
スクロールを促す縦長構成、セクションごとに明確な区切りを設置`;
}

function generateTimeline(): string {
  return `## スケジュール（参考）

| フェーズ | 内容 | 目安 |
|---------|------|------|
| Phase 1 | ワイヤーフレーム作成 | 1週目 |
| Phase 2 | デザインカンプ作成 | 2週目 |
| Phase 3 | コピーライティング | 2-3週目 |
| Phase 4 | コーディング | 3-4週目 |
| Phase 5 | テスト・修正 | 4週目 |
| Phase 6 | 公開・分析開始 | 5週目 |

※スケジュールは目安です。プロジェクト規模により調整します。`;
}

function generateNextSteps(): string {
  return `## ネクストステップ

### すぐに実施
1. コンセプトの最終決定
2. ワイヤーフレームのレビュー・承認
3. 素材（画像・動画）の準備

### 次回打ち合わせ議題
- デザインカンプの方向性確認
- コピーの詳細レビュー
- スケジュールの確定

### 必要な情報
- 商品/サービスの詳細資料
- お客様の声・実績データ
- ブランドガイドライン（あれば）

---

ご不明点がございましたら、お気軽にお問い合わせください。`;
}

function generateAppendix(
  research: ResearchResult | UchidaResearchResult,
  isUchida: boolean
): string {
  let content = "## 付録\n\n### リサーチデータ詳細\n\n";

  if (isUchida) {
    const uchida = research as UchidaResearchResult;
    content += `- 競合分析数: ${uchida.competitors?.length || 0}社\n`;
    content += `- 収集悩み数: ${uchida.painPoints?.length || 0}件\n`;
    content += `- キーワード数: ${uchida.keywords?.length || 0}件\n`;
    content += `- コンセプト候補: ${uchida.conceptCandidates?.length || 0}案\n`;
  } else {
    const normal = research as ResearchResult;
    content += `- 競合LP分析: ${normal.competitorResults?.length || 0}件\n`;
    content += `- 広告クリエイティブ: ${normal.adResults?.length || 0}件\n`;
  }

  content += `\n### 調査日時\n- 作成: ${research.createdAt}\n`;
  if (research.completedAt) {
    content += `- 完了: ${research.completedAt}\n`;
  }
  if (research.elapsedMs) {
    content += `- 所要時間: ${Math.round(research.elapsedMs / 1000)}秒\n`;
  }

  return content;
}

// =============================================================================
// Markdown & HTML Conversion
// =============================================================================

function generateMarkdown(
  sections: ProposalSection[],
  context: ResearchContext,
  template: ProposalTemplate
): string {
  const title =
    template === "presentation"
      ? `# ${context.projectName}\n## LP制作提案書\n\n---\n\n`
      : `# ${context.projectName} LP制作提案書\n\n`;

  const body = sections.map((s) => `${s.content}\n`).join("\n---\n\n");

  const footer = `\n\n---\n\n*本提案書は LP Builder Pro により自動生成されました*\n*生成日時: ${new Date().toLocaleString("ja-JP")}*`;

  return title + body + footer;
}

function markdownToHtml(markdown: string): string {
  // 簡易的なMarkdown→HTML変換
  let html = markdown
    // 見出し
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // 太字
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // 斜体
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // リスト
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // 引用
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    // 水平線
    .replace(/^---$/gm, "<hr>")
    // 改行
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  // テーブル変換（簡易）
  html = html.replace(
    /\|(.+)\|/g,
    (match) => {
      const cells = match.split("|").filter(Boolean);
      if (cells[0]?.includes("---")) {
        return ""; // ヘッダー区切り行を削除
      }
      const row = cells.map((c) => `<td>${c.trim()}</td>`).join("");
      return `<tr>${row}</tr>`;
    }
  );

  return `<div class="proposal">${html}</div>`;
}

// =============================================================================
// AI-Enhanced Generation
// =============================================================================

/**
 * AIを使って提案書の品質を向上
 */
export async function enhanceProposalWithAI(
  proposal: GeneratedProposal
): Promise<GeneratedProposal> {
  const ai = getGeminiClient();
  const model = getDefaultGeminiTextModelId();

  const prompt = `以下の提案書を、より説得力のある表現に改善してください。
専門用語は適度に使いつつ、クライアントにわかりやすい表現を心がけてください。

【提案書】
${proposal.rawMarkdown.slice(0, 5000)}

【出力】
改善後のMarkdownを出力してください。構造は維持し、表現のみ改善してください。`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const enhancedMarkdown = response.text || proposal.rawMarkdown;
    const enhancedHtml = markdownToHtml(enhancedMarkdown);

    return {
      ...proposal,
      rawMarkdown: enhancedMarkdown,
      htmlContent: enhancedHtml,
    };
  } catch (error) {
    console.error("[proposal-generator] AI enhancement failed:", error);
    return proposal;
  }
}
