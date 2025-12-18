/**
 * Google Sheets フォーマッター
 *
 * リサーチ結果を綺麗にフォーマットしてGoogle Sheetsに出力
 */

import type { EnhancedResearchResult } from "@/lib/research/orchestrator";

// ============================================================
// 型定義
// ============================================================

export interface FormattedSheetData {
  title: string;
  sheets: SheetData[];
}

export interface SheetData {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
  formatting?: SheetFormatting;
}

export interface SheetFormatting {
  headerColor: RGB;
  alternateRowColor?: RGB;
  columnWidths?: number[];
  freezeRows?: number;
  freezeColumns?: number;
}

interface RGB {
  red: number;
  green: number;
  blue: number;
}

// ============================================================
// プリセットカラー
// ============================================================

const COLORS = {
  primary: { red: 0.2, green: 0.4, blue: 0.8 },      // 青
  secondary: { red: 0.3, green: 0.7, blue: 0.4 },    // 緑
  warning: { red: 0.9, green: 0.6, blue: 0.2 },      // オレンジ
  danger: { red: 0.8, green: 0.2, blue: 0.2 },       // 赤
  info: { red: 0.4, green: 0.6, blue: 0.8 },         // 水色
  light: { red: 0.95, green: 0.95, blue: 0.95 },     // 薄いグレー
};

// ============================================================
// リサーチ結果をフォーマット
// ============================================================

/**
 * EnhancedResearchResultをGoogle Sheets用フォーマットに変換
 */
export function formatResearchForSheets(
  result: EnhancedResearchResult,
  options?: { projectName?: string }
): FormattedSheetData {
  const projectName = options?.projectName || result.context?.projectName || "リサーチ";
  const date = new Date().toISOString().slice(0, 10);

  return {
    title: `リサーチレポート_${projectName}_${date}`,
    sheets: [
      // 1. 概要シート
      createOverviewSheet(result, projectName),
      // 2. 競合LP一覧シート
      createCompetitorSheet(result),
      // 3. キーワードランキングシート
      createKeywordSheet(result),
      // 4. 悩み分析シート
      createPainPointSheet(result),
      // 5. 広告分析シート
      createAdsSheet(result),
      // 6. SNS分析シート
      createSnsSheet(result),
      // 7. 提案シート
      createProposalSheet(result),
    ].filter((sheet) => sheet.rows.length > 0), // 空のシートは除外
  };
}

// ============================================================
// 各シート生成関数
// ============================================================

function createOverviewSheet(result: EnhancedResearchResult, projectName: string): SheetData {
  const synthesis = result.synthesis;
  const proposals = result.proposals;

  const rows: (string | number | null)[][] = [
    ["プロジェクト名", projectName],
    ["ジャンル", result.context?.genre || "-"],
    ["サブジャンル", result.context?.subGenre || "-"],
    ["実行日時", result.completedAt || new Date().toISOString()],
    ["所要時間（秒）", result.elapsedMs ? Math.round(result.elapsedMs / 1000) : "-"],
    ["", ""], // 空行
    ["■ 統合インサイト", ""],
    ...(synthesis?.keyInsights?.map((insight, i) => [`${i + 1}`, insight]) || [["なし", "-"]]),
    ["", ""], // 空行
    ["■ トップヘッドライン", ""],
    ...(synthesis?.topHeadlines?.slice(0, 10).map((h, i) => [`${i + 1}`, h]) || [["なし", "-"]]),
    ["", ""], // 空行
    ["■ トップCTA", ""],
    ...(synthesis?.topCTAs?.slice(0, 5).map((cta, i) => [`${i + 1}`, cta]) || [["なし", "-"]]),
    ["", ""], // 空行
    ["■ 差別化ポイント", ""],
    ...(synthesis?.differentiationPoints?.map((d, i) => [`${i + 1}`, d]) || [["なし", "-"]]),
    ["", ""], // 空行
    ["■ 推奨カラーパレット", ""],
    ["プライマリ", proposals?.design?.colorPalette?.primary || "-"],
    ["セカンダリ", proposals?.design?.colorPalette?.secondary || "-"],
    ["アクセント", proposals?.design?.colorPalette?.accent || "-"],
    ["背景", proposals?.design?.colorPalette?.background || "-"],
  ];

  return {
    name: "概要",
    headers: ["項目", "内容"],
    rows,
    formatting: {
      headerColor: COLORS.primary,
      columnWidths: [200, 600],
      freezeRows: 1,
    },
  };
}

function createCompetitorSheet(result: EnhancedResearchResult): SheetData {
  const competitors = result.competitorResults || [];

  const rows: (string | number | null)[][] = competitors.map((c, i) => [
    i + 1,
    c.url,
    c.title,
    c.copyElements?.headline || "-",
    c.copyElements?.keyPhrases?.slice(0, 5).join(", ") || "-",
    c.designElements?.primaryColor || "-",
    c.designElements?.layoutType || "-",
    c.similarityScore ? `${Math.round(c.similarityScore * 100)}%` : "-",
    c.screenshotUrl || "-",
  ]);

  return {
    name: "競合LP一覧",
    headers: [
      "No",
      "URL",
      "タイトル",
      "ヘッドライン",
      "キーフレーズ",
      "メインカラー",
      "レイアウト",
      "類似度",
      "スクリーンショット",
    ],
    rows,
    formatting: {
      headerColor: COLORS.secondary,
      alternateRowColor: COLORS.light,
      columnWidths: [50, 300, 200, 250, 300, 100, 100, 80, 200],
      freezeRows: 1,
    },
  };
}

function createKeywordSheet(result: EnhancedResearchResult): SheetData {
  const patterns = result.synthesis?.topPatterns || [];
  const headlines = result.synthesis?.topHeadlines || [];
  const ctas = result.synthesis?.topCTAs || [];

  const rows: (string | number | null)[][] = [];

  // パターン
  rows.push(["■ LPパターン", "", "", ""]);
  patterns.forEach((p, i) => {
    rows.push([
      `${i + 1}`,
      p.name,
      p.sections?.join(" → ") || "-",
      p.usageRate ? `${Math.round(p.usageRate * 100)}%` : "-",
    ]);
  });

  rows.push(["", "", "", ""]); // 空行

  // ヘッドライン
  rows.push(["■ トップヘッドライン", "", "", ""]);
  headlines.slice(0, 20).forEach((h, i) => {
    rows.push([`${i + 1}`, h, "", ""]);
  });

  rows.push(["", "", "", ""]); // 空行

  // CTA
  rows.push(["■ トップCTA", "", "", ""]);
  ctas.slice(0, 10).forEach((cta, i) => {
    rows.push([`${i + 1}`, cta, "", ""]);
  });

  return {
    name: "キーワード・パターン",
    headers: ["No", "内容", "詳細", "スコア"],
    rows,
    formatting: {
      headerColor: COLORS.info,
      columnWidths: [50, 400, 300, 100],
      freezeRows: 1,
    },
  };
}

function createPainPointSheet(result: EnhancedResearchResult): SheetData {
  const chiebukuro = result.chiebukuroAnalysis;

  if (!chiebukuro?.questions || chiebukuro.questions.length === 0) {
    return {
      name: "悩み分析",
      headers: [],
      rows: [],
    };
  }

  const rows: (string | number | null)[][] = chiebukuro.questions.map((q, i) => [
    i + 1,
    q.title,
    q.content?.slice(0, 200) || "-",
    q.bestAnswer?.slice(0, 200) || "-",
    q.views || 0,
    q.answers || 0,
    q.category || "-",
    q.url || "-",
  ]);

  // 上位キーワードを追加
  if (chiebukuro.painPointStats?.topSeverityKeywords) {
    rows.push(["", "", "", "", "", "", "", ""]);
    rows.push(["■ 深刻度キーワード", "", "", "", "", "", "", ""]);
    chiebukuro.painPointStats.topSeverityKeywords.forEach((kw, i) => {
      rows.push([`${i + 1}`, kw, "", "", "", "", "", ""]);
    });
  }

  return {
    name: "悩み分析（知恵袋）",
    headers: [
      "No",
      "質問タイトル",
      "質問内容",
      "ベストアンサー",
      "閲覧数",
      "回答数",
      "カテゴリ",
      "URL",
    ],
    rows,
    formatting: {
      headerColor: COLORS.warning,
      alternateRowColor: COLORS.light,
      columnWidths: [50, 300, 300, 300, 80, 80, 100, 200],
      freezeRows: 1,
    },
  };
}

function createAdsSheet(result: EnhancedResearchResult): SheetData {
  const metaAds = result.metaAdsAnalysis;
  const adResults = result.adResults || [];

  if (adResults.length === 0 && (!metaAds || metaAds.ads.length === 0)) {
    return {
      name: "広告分析",
      headers: [],
      rows: [],
    };
  }

  const rows: (string | number | null)[][] = [];

  // Meta広告
  if (metaAds?.ads) {
    rows.push(["■ Meta広告", "", "", "", "", ""]);
    metaAds.ads.forEach((ad, i) => {
      rows.push([
        i + 1,
        ad.pageName || "-",
        ad.adContent?.headline || "-",
        ad.adContent?.bodyText?.slice(0, 150) || "-",
        ad.adContent?.ctaText || "-",
        ad.mediaUrls?.[0] || "-",
      ]);
    });
  }

  // インサイト
  if (metaAds?.insights) {
    rows.push(["", "", "", "", "", ""]);
    rows.push(["■ 広告インサイト", "", "", "", "", ""]);
    rows.push(["よく使われるCTA", metaAds.insights.commonCtaTexts?.join(", ") || "-", "", "", "", ""]);
    rows.push(["感情トリガー", metaAds.insights.emotionalTriggers?.join(", ") || "-", "", "", "", ""]);
    rows.push(["コピーテクニック", metaAds.insights.copyTechniques?.join(", ") || "-", "", "", "", ""]);
  }

  return {
    name: "広告分析",
    headers: ["No", "広告主", "ヘッドライン", "本文", "CTA", "メディアURL"],
    rows,
    formatting: {
      headerColor: COLORS.danger,
      columnWidths: [50, 150, 200, 300, 100, 200],
      freezeRows: 1,
    },
  };
}

function createSnsSheet(result: EnhancedResearchResult): SheetData {
  const snsResults = result.snsResults;
  const xResult = result.snsXResult;
  const igResult = result.snsInstagramResult;
  const tiktokResult = result.snsTiktokResult;

  const rows: (string | number | null)[][] = [];

  // ハッシュタグ
  if (snsResults?.hashtags && snsResults.hashtags.length > 0) {
    rows.push(["■ トップハッシュタグ", "", ""]);
    snsResults.hashtags.slice(0, 20).forEach((h, i) => {
      rows.push([`${i + 1}`, h.tag, h.count || "-"]);
    });
    rows.push(["", "", ""]);
  }

  // X分析
  if (xResult?.analysis) {
    rows.push(["■ X (Twitter) 分析", "", ""]);
    rows.push(["トレンドキーワード", xResult.analysis.trendingKeywords?.join(", ") || "-", ""]);
    rows.push(["効果的パターン", xResult.analysis.effectivePatterns?.join(", ") || "-", ""]);
    rows.push(["", "", ""]);
  }

  // Instagram分析
  if (igResult?.analysis) {
    rows.push(["■ Instagram分析", "", ""]);
    rows.push(["トレンドキーワード", igResult.analysis.trendingKeywords?.join(", ") || "-", ""]);
    rows.push(["効果的パターン", igResult.analysis.effectivePatterns?.join(", ") || "-", ""]);
    rows.push(["", "", ""]);
  }

  // TikTok分析
  if (tiktokResult?.analysis || tiktokResult?.tiktokData) {
    rows.push(["■ TikTok分析", "", ""]);
    if (tiktokResult.tiktokData?.viralPatterns) {
      rows.push(["バイラルパターン", tiktokResult.tiktokData.viralPatterns.join(", "), ""]);
    }
    if (tiktokResult.tiktokData?.topSounds) {
      rows.push(["人気サウンド", tiktokResult.tiktokData.topSounds.join(", "), ""]);
    }
    rows.push(["", "", ""]);
  }

  // インフルエンサー
  if (snsResults?.influencers && snsResults.influencers.length > 0) {
    rows.push(["■ トップインフルエンサー", "", ""]);
    snsResults.influencers.slice(0, 10).forEach((inf, i) => {
      rows.push([`${i + 1}`, inf.name, inf.platform]);
    });
  }

  if (rows.length === 0) {
    return {
      name: "SNS分析",
      headers: [],
      rows: [],
    };
  }

  return {
    name: "SNS分析",
    headers: ["項目", "内容", "補足"],
    rows,
    formatting: {
      headerColor: COLORS.info,
      columnWidths: [200, 400, 200],
      freezeRows: 1,
    },
  };
}

function createProposalSheet(result: EnhancedResearchResult): SheetData {
  const proposals = result.proposals;

  if (!proposals) {
    return {
      name: "提案",
      headers: [],
      rows: [],
    };
  }

  const rows: (string | number | null)[][] = [];

  // 構成提案
  if (proposals.structure?.recommended) {
    rows.push(["■ 推奨LP構成", "", "", ""]);
    proposals.structure.recommended.forEach((section) => {
      rows.push([
        `${section.order}`,
        section.name,
        section.type,
        section.purpose,
      ]);
    });
    rows.push(["", "", "", ""]);
  }

  // コピー提案
  if (proposals.copy?.headlines) {
    rows.push(["■ ヘッドライン提案", "", "", ""]);
    proposals.copy.headlines.forEach((h, i) => {
      rows.push([
        `${i + 1}`,
        h.text,
        h.type,
        h.score ? `${h.score}点` : "-",
      ]);
    });
    rows.push(["", "", "", ""]);
  }

  // CTA提案
  if (proposals.copy?.ctaButtons) {
    rows.push(["■ CTAボタン提案", "", "", ""]);
    proposals.copy.ctaButtons.forEach((cta, i) => {
      rows.push([
        `${i + 1}`,
        cta.text,
        cta.urgency,
        cta.score ? `${cta.score}点` : "-",
      ]);
    });
    rows.push(["", "", "", ""]);
  }

  // 参考LP
  if (proposals.referenceLPs) {
    rows.push(["■ 参考LP", "", "", ""]);
    proposals.referenceLPs.forEach((lp, i) => {
      rows.push([
        `${i + 1}`,
        lp.title,
        lp.url,
        lp.strengths?.join(", ") || "-",
      ]);
    });
  }

  return {
    name: "提案",
    headers: ["No", "内容", "タイプ", "備考"],
    rows,
    formatting: {
      headerColor: COLORS.primary,
      columnWidths: [50, 400, 150, 300],
      freezeRows: 1,
    },
  };
}

// ============================================================
// Google Sheets APIリクエスト生成
// ============================================================

/**
 * Google Sheets API用のリクエストボディを生成
 */
export function generateSheetsApiRequests(data: FormattedSheetData): {
  spreadsheetProperties: { title: string };
  sheets: object[];
  valueRanges: { range: string; values: (string | number | null)[][] }[];
  formatRequests: object[];
} {
  const sheets: object[] = [];
  const valueRanges: { range: string; values: (string | number | null)[][] }[] = [];
  const formatRequests: object[] = [];

  data.sheets.forEach((sheet, sheetIndex) => {
    // シート定義
    sheets.push({
      properties: {
        sheetId: sheetIndex,
        title: sheet.name,
        gridProperties: {
          frozenRowCount: sheet.formatting?.freezeRows || 0,
          frozenColumnCount: sheet.formatting?.freezeColumns || 0,
        },
      },
    });

    // データ範囲
    const allRows = [sheet.headers, ...sheet.rows];
    valueRanges.push({
      range: `'${sheet.name}'!A1`,
      values: allRows,
    });

    // ヘッダーフォーマット
    if (sheet.formatting?.headerColor) {
      formatRequests.push({
        repeatCell: {
          range: {
            sheetId: sheetIndex,
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: sheet.formatting.headerColor,
              textFormat: {
                bold: true,
                foregroundColor: { red: 1, green: 1, blue: 1 },
              },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      });
    }

    // 列幅
    if (sheet.formatting?.columnWidths) {
      sheet.formatting.columnWidths.forEach((width, colIndex) => {
        formatRequests.push({
          updateDimensionProperties: {
            range: {
              sheetId: sheetIndex,
              dimension: "COLUMNS",
              startIndex: colIndex,
              endIndex: colIndex + 1,
            },
            properties: {
              pixelSize: width,
            },
            fields: "pixelSize",
          },
        });
      });
    }

    // 交互行カラー
    if (sheet.formatting?.alternateRowColor) {
      formatRequests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [
              {
                sheetId: sheetIndex,
                startRowIndex: 1,
              },
            ],
            booleanRule: {
              condition: {
                type: "CUSTOM_FORMULA",
                values: [{ userEnteredValue: "=MOD(ROW(),2)=0" }],
              },
              format: {
                backgroundColor: sheet.formatting.alternateRowColor,
              },
            },
          },
          index: 0,
        },
      });
    }
  });

  return {
    spreadsheetProperties: { title: data.title },
    sheets,
    valueRanges,
    formatRequests,
  };
}

// ============================================================
// CSV出力（ローカル用）
// ============================================================

/**
 * FormattedSheetDataをCSVに変換（複数ファイル）
 */
export function formatToCSV(data: FormattedSheetData): Map<string, string> {
  const csvFiles = new Map<string, string>();

  data.sheets.forEach((sheet) => {
    const rows = [sheet.headers, ...sheet.rows];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            if (cell === null || cell === undefined) return "";
            const str = String(cell);
            // カンマ、改行、ダブルクォートを含む場合はエスケープ
            if (str.includes(",") || str.includes("\n") || str.includes('"')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      )
      .join("\n");

    csvFiles.set(`${sheet.name}.csv`, csv);
  });

  return csvFiles;
}
