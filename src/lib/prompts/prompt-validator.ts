/**
 * プロンプト検証
 *
 * プロンプト構造の検証、必須フィールドチェック、エラーメッセージ生成
 */

import type { PromptFormat } from "@/lib/workflow/types";
import type {
  GeneratedPrompt,
  PromptValidationResult,
  PromptValidationError,
  PromptValidationWarning,
} from "./types";
import { parseYaml, parseJson } from "./prompt-converter";

// ============================================================
// 検証ルール定義
// ============================================================

const VALID_ELEMENT_TYPES = [
  "headline",
  "subheadline",
  "body",
  "cta",
  "image",
  "logo",
  "badge",
  "list",
  "testimonial",
  "number",
  "icon",
  "divider",
  "spacer",
  "faq",
  "price",
  "guarantee",
  "bonus",
  "countdown",
];

// ============================================================
// メイン検証関数
// ============================================================

/**
 * プロンプトを検証
 */
export function validatePrompt(prompt: GeneratedPrompt): PromptValidationResult {
  const errors: PromptValidationError[] = [];
  const warnings: PromptValidationWarning[] = [];

  // セクション名チェック
  if (!prompt.sectionName || prompt.sectionName.trim() === "") {
    errors.push({
      field: "sectionName",
      message: "セクション名は必須です",
    });
  }

  // 要素チェック
  if (!prompt.elements || prompt.elements.length === 0) {
    errors.push({
      field: "elements",
      message: "少なくとも1つの要素が必要です",
    });
  } else {
    // 各要素を検証
    prompt.elements.forEach((element, index) => {
      const elementErrors = validateElement(element, index);
      errors.push(...elementErrors.errors);
      warnings.push(...elementErrors.warnings);
    });
  }

  // コンテンツチェック
  if (!prompt.content || prompt.content.trim() === "") {
    warnings.push({
      field: "content",
      message: "生成されたコンテンツが空です",
      suggestion: "要素を追加してプロンプトを再生成してください",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 要素を検証
 */
function validateElement(
  element: GeneratedPrompt["elements"][0],
  index: number
): { errors: PromptValidationError[]; warnings: PromptValidationWarning[] } {
  const errors: PromptValidationError[] = [];
  const warnings: PromptValidationWarning[] = [];
  const prefix = `elements[${index}]`;

  // タイプチェック
  if (!element.type) {
    errors.push({
      field: `${prefix}.type`,
      message: `要素${index + 1}: タイプは必須です`,
    });
  } else if (!VALID_ELEMENT_TYPES.includes(element.type)) {
    warnings.push({
      field: `${prefix}.type`,
      message: `要素${index + 1}: 未知の要素タイプ "${element.type}"`,
      suggestion: `有効なタイプ: ${VALID_ELEMENT_TYPES.slice(0, 5).join(", ")}...`,
    });
  }

  // コンテンツチェック
  if (!element.content || element.content.trim() === "") {
    warnings.push({
      field: `${prefix}.content`,
      message: `要素${index + 1}: コンテンツが空です`,
      suggestion: "コンテンツを入力してください",
    });
  }

  // ラベルチェック
  if (!element.label || element.label.trim() === "") {
    warnings.push({
      field: `${prefix}.label`,
      message: `要素${index + 1}: ラベルが設定されていません`,
    });
  }

  return { errors, warnings };
}

// ============================================================
// 形式別検証
// ============================================================

/**
 * YAML形式のプロンプトを検証
 */
export function validateYaml(content: string): PromptValidationResult {
  const errors: PromptValidationError[] = [];
  const warnings: PromptValidationWarning[] = [];

  // パース試行
  const parsed = parseYaml(content);
  if (!parsed) {
    errors.push({
      field: "format",
      message: "YAML形式のパースに失敗しました",
    });
    return { isValid: false, errors, warnings };
  }

  // セクション名チェック
  if (!parsed.section || parsed.section.trim() === "") {
    errors.push({
      field: "section",
      message: "セクション名（section）は必須です",
    });
  }

  // ルールチェック
  if (!parsed.rules) {
    warnings.push({
      field: "rules",
      message: "ルールセクションがありません",
      suggestion: "rules: セクションを追加することを推奨します",
    });
  } else {
    if (!parsed.rules.aspect_ratio) {
      warnings.push({
        field: "rules.aspect_ratio",
        message: "アスペクト比が指定されていません",
        suggestion: 'aspect_ratio: "2:3" を追加してください',
      });
    }
  }

  // 要素チェック
  if (!parsed.elements || parsed.elements.length === 0) {
    errors.push({
      field: "elements",
      message: "少なくとも1つの要素が必要です",
    });
  } else {
    parsed.elements.forEach((el, index) => {
      if (!el.type) {
        errors.push({
          field: `elements[${index}].type`,
          message: `要素${index + 1}: typeは必須です`,
          line: findLineNumber(content, `- type:`),
        });
      }
      if (!el.content || el.content.trim() === "") {
        warnings.push({
          field: `elements[${index}].content`,
          message: `要素${index + 1}: contentが空です`,
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * JSON形式のプロンプトを検証
 */
export function validateJson(content: string): PromptValidationResult {
  const errors: PromptValidationError[] = [];
  const warnings: PromptValidationWarning[] = [];

  // JSON構文チェック
  try {
    JSON.parse(content);
  } catch (e) {
    const error = e as Error;
    errors.push({
      field: "format",
      message: `JSON構文エラー: ${error.message}`,
    });
    return { isValid: false, errors, warnings };
  }

  // パース
  const structure = parseJson(content);
  if (!structure) {
    errors.push({
      field: "format",
      message: "JSON構造が正しくありません",
    });
    return { isValid: false, errors, warnings };
  }

  // セクション名チェック
  if (!structure.section || structure.section.trim() === "") {
    errors.push({
      field: "section",
      message: '"section" フィールドは必須です',
    });
  }

  // 要素チェック
  if (!structure.elements || structure.elements.length === 0) {
    errors.push({
      field: "elements",
      message: '"elements" 配列は必須です（少なくとも1要素）',
    });
  } else {
    structure.elements.forEach((el, index) => {
      if (!el.type) {
        errors.push({
          field: `elements[${index}].type`,
          message: `要素${index + 1}: "type" は必須です`,
        });
      }
      if (!el.content) {
        warnings.push({
          field: `elements[${index}].content`,
          message: `要素${index + 1}: "content" が空です`,
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * テキスト形式のプロンプトを検証
 */
export function validateText(content: string): PromptValidationResult {
  const errors: PromptValidationError[] = [];
  const warnings: PromptValidationWarning[] = [];

  if (!content || content.trim() === "") {
    errors.push({
      field: "content",
      message: "プロンプトが空です",
    });
    return { isValid: false, errors, warnings };
  }

  // ルールセクションチェック
  if (!content.includes("【ルール】")) {
    warnings.push({
      field: "rules",
      message: "【ルール】セクションがありません",
      suggestion: "【ルール】セクションを追加することを推奨します",
    });
  }

  // 要素チェック（| で始まる行）
  const elementLines = content.split("\n").filter((line) => line.startsWith("| "));
  if (elementLines.length === 0) {
    warnings.push({
      field: "elements",
      message: "要素が見つかりません",
      suggestion: '| タイトル：内容 の形式で要素を追加してください',
    });
  }

  // 各要素の形式チェック
  elementLines.forEach((line, index) => {
    if (!line.includes("：")) {
      warnings.push({
        field: `line_${index + 1}`,
        message: `行${index + 1}: 「：」（全角コロン）で区切ってください`,
        suggestion: "| ラベル：内容 の形式にしてください",
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================
// 汎用検証関数
// ============================================================

/**
 * 形式を自動判定して検証
 */
export function validatePromptContent(
  content: string,
  format?: PromptFormat
): PromptValidationResult {
  // 形式が指定されていない場合は推測
  const detectedFormat = format || detectFormat(content);

  switch (detectedFormat) {
    case "yaml":
      return validateYaml(content);
    case "json":
      return validateJson(content);
    case "text":
      return validateText(content);
    default:
      return {
        isValid: false,
        errors: [{ field: "format", message: "不明な形式です" }],
        warnings: [],
      };
  }
}

/**
 * コンテンツから形式を推測
 */
export function detectFormat(content: string): PromptFormat {
  const trimmed = content.trim();

  // JSON判定
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // JSON形式ではない
    }
  }

  // YAML判定（キー: 値 形式が多い）
  const yamlPattern = /^[a-z_]+:\s*.+/m;
  if (yamlPattern.test(trimmed) && !trimmed.startsWith("【")) {
    return "yaml";
  }

  // テキスト形式
  return "text";
}

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * 特定のパターンが出現する行番号を取得
 */
function findLineNumber(content: string, pattern: string): number | undefined {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(pattern)) {
      return i + 1;
    }
  }
  return undefined;
}

/**
 * 検証結果をフォーマットして文字列に変換
 */
export function formatValidationResult(result: PromptValidationResult): string {
  const lines: string[] = [];

  if (result.isValid) {
    lines.push("✅ 検証成功");
  } else {
    lines.push("❌ 検証失敗");
  }

  if (result.errors.length > 0) {
    lines.push("\nエラー:");
    result.errors.forEach((err) => {
      let msg = `  - ${err.message}`;
      if (err.line) {
        msg += ` (行: ${err.line})`;
      }
      lines.push(msg);
    });
  }

  if (result.warnings.length > 0) {
    lines.push("\n警告:");
    result.warnings.forEach((warn) => {
      lines.push(`  - ${warn.message}`);
      if (warn.suggestion) {
        lines.push(`    → ${warn.suggestion}`);
      }
    });
  }

  return lines.join("\n");
}

/**
 * 検証エラーを日本語メッセージに変換
 */
export function getErrorMessage(error: PromptValidationError): string {
  return error.message;
}

/**
 * 必須フィールドが揃っているかチェック
 */
export function hasRequiredFields(prompt: Partial<GeneratedPrompt>): boolean {
  return !!(
    prompt.sectionId &&
    prompt.sectionName &&
    prompt.format &&
    prompt.elements &&
    prompt.elements.length > 0
  );
}
