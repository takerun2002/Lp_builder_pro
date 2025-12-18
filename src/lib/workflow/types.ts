/**
 * ワークフロー管理 型定義
 *
 * ガイドモード/エキスパートモードに対応した柔軟なワークフロー
 */

// ============================================================
// ユーザーモード
// ============================================================

export type UserMode = "guided" | "expert";

export const USER_MODE_LABELS: Record<UserMode, { name: string; description: string }> = {
  guided: {
    name: "ガイドモード",
    description: "ステップバイステップで進める初心者向けモード",
  },
  expert: {
    name: "エキスパートモード",
    description: "全機能にアクセス可能、自由に操作できる上級者向けモード",
  },
};

// ============================================================
// ワークフローステップ
// ============================================================

export type WorkflowStepId =
  | "research"      // リサーチ
  | "manuscript"    // 原稿作成
  | "structure"     // 構成作成
  | "wireframe"     // ワイヤーフレーム
  | "prompts"       // プロンプト編集
  | "design";       // デザイン生成

export interface WorkflowStep {
  id: WorkflowStepId;
  name: string;
  description: string;
  icon: string;

  // 入力ソース（複数選択可能）
  inputSources: InputSource[];

  // このステップはスキップ可能か
  skippable: boolean;

  // 前提条件（これがないと開始できない）
  prerequisites: WorkflowStepId[];

  // 出力オプション
  outputOptions: {
    toNextStep: boolean;
    toExport: boolean;
    saveAsTemplate: boolean;
  };
}

export type InputSource =
  | "previous_step"   // 前のステップから
  | "import"          // 外部インポート
  | "scratch"         // ゼロから作成
  | "template"        // テンプレートから
  | "swipe_file";     // スワイプファイルから

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "research",
    name: "リサーチ",
    description: "ターゲット・競合を調査して情報を収集",
    icon: "🔍",
    inputSources: ["scratch", "import"],
    skippable: true,
    prerequisites: [],
    outputOptions: { toNextStep: true, toExport: true, saveAsTemplate: false },
  },
  {
    id: "manuscript",
    name: "原稿作成",
    description: "LPに載せるテキストコンテンツを作成",
    icon: "📝",
    inputSources: ["previous_step", "import", "scratch", "template"],
    skippable: true,
    prerequisites: [],
    outputOptions: { toNextStep: true, toExport: true, saveAsTemplate: true },
  },
  {
    id: "structure",
    name: "構成作成",
    description: "LPのセクション構成と要素を設計",
    icon: "📐",
    inputSources: ["previous_step", "import", "scratch", "template", "swipe_file"],
    skippable: true,
    prerequisites: [],
    outputOptions: { toNextStep: true, toExport: true, saveAsTemplate: true },
  },
  {
    id: "wireframe",
    name: "ワイヤーフレーム",
    description: "レイアウトを視覚的にプレビュー・編集",
    icon: "🖼️",
    inputSources: ["previous_step", "import", "scratch"],
    skippable: true,
    prerequisites: [],
    outputOptions: { toNextStep: true, toExport: true, saveAsTemplate: false },
  },
  {
    id: "prompts",
    name: "プロンプト編集",
    description: "画像生成用プロンプトを作成・編集",
    icon: "✏️",
    inputSources: ["previous_step", "import", "scratch", "template"],
    skippable: false,
    prerequisites: [],
    outputOptions: { toNextStep: true, toExport: true, saveAsTemplate: true },
  },
  {
    id: "design",
    name: "デザイン生成",
    description: "AIで画像を生成してLPを完成",
    icon: "🎨",
    inputSources: ["previous_step"],
    skippable: false,
    prerequisites: ["prompts"],
    outputOptions: { toNextStep: false, toExport: true, saveAsTemplate: false },
  },
];

// ============================================================
// エントリーポイント
// ============================================================

export interface EntryPoint {
  id: string;
  name: string;
  description: string;
  icon: string;
  startStep: WorkflowStepId;
  quickAction?: boolean;
}

export const ENTRY_POINTS: EntryPoint[] = [
  {
    id: "from_research",
    name: "リサーチから",
    description: "ゼロから調査したい",
    icon: "🔍",
    startStep: "research",
  },
  {
    id: "from_manuscript",
    name: "原稿から",
    description: "クライアントから原稿をもらった",
    icon: "📝",
    startStep: "manuscript",
  },
  {
    id: "from_structure",
    name: "構成から",
    description: "構成・構想がすでにある",
    icon: "📐",
    startStep: "structure",
  },
  {
    id: "from_wireframe",
    name: "ワイヤーから",
    description: "ラフ・参考がすでにある",
    icon: "🖼️",
    startStep: "wireframe",
  },
  {
    id: "from_prompt",
    name: "プロンプトから",
    description: "プロンプトを直接書く",
    icon: "✏️",
    startStep: "prompts",
  },
  {
    id: "free_edit",
    name: "自由編集",
    description: "ワークスペースで直接作業",
    icon: "🎨",
    startStep: "design",
  },
];

// ============================================================
// クイックアクション
// ============================================================

export interface QuickAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  action: "paste_manuscript" | "import_reference" | "direct_prompt" | "from_swipe";
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "paste_manuscript",
    name: "原稿ペースト",
    description: "自動でセクション分割＆構成生成",
    icon: "📋",
    action: "paste_manuscript",
  },
  {
    id: "import_reference",
    name: "参考LP取り込み",
    description: "スタイル抽出＆構成テンプレート適用",
    icon: "🖼️",
    action: "import_reference",
  },
  {
    id: "direct_prompt",
    name: "プロンプト直接入力",
    description: "すぐに画像生成",
    icon: "✏️",
    action: "direct_prompt",
  },
  {
    id: "from_swipe",
    name: "スワイプから開始",
    description: "選んだスワイプのスタイルで開始",
    icon: "📁",
    action: "from_swipe",
  },
];

// ============================================================
// インポート機能
// ============================================================

export interface ImportCapability {
  manuscript: {
    formats: ("text" | "markdown" | "word" | "googleDocs")[];
    parsing: "auto" | "manual";
  };
  structure: {
    formats: ("json" | "yaml" | "notion" | "figma")[];
    mapping: boolean;
  };
  wireframe: {
    formats: ("image" | "figma" | "xd" | "sketch")[];
    aiAnalysis: boolean;
  };
  swipeFile: {
    selectSections: boolean;
    extractStyle: boolean;
  };
}

export const IMPORT_CAPABILITIES: ImportCapability = {
  manuscript: {
    formats: ["text", "markdown"],
    parsing: "auto",
  },
  structure: {
    formats: ["json", "yaml"],
    mapping: true,
  },
  wireframe: {
    formats: ["image"],
    aiAnalysis: true,
  },
  swipeFile: {
    selectSections: true,
    extractStyle: true,
  },
};

// ============================================================
// プロンプト形式
// ============================================================

export type PromptFormat = "text" | "yaml" | "json";

export interface PromptFormatOption {
  id: PromptFormat;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
  recommended: boolean;
}

export const PROMPT_FORMATS: PromptFormatOption[] = [
  {
    id: "text",
    label: "テキスト形式",
    description: "自然言語で記述するシンプルな形式",
    pros: ["直感的", "初心者向け", "すぐに使える"],
    cons: ["構造が曖昧になりやすい", "再現性が低い"],
    recommended: false,
  },
  {
    id: "yaml",
    label: "YAML形式",
    description: "構造化されたが読みやすい形式",
    pros: ["読みやすい", "コントロールしやすい", "バランス良い"],
    cons: ["インデントに注意が必要"],
    recommended: true,
  },
  {
    id: "json",
    label: "JSON形式",
    description: "完全に構造化された形式",
    pros: ["最も精密", "プログラムで処理しやすい", "再現性が高い"],
    cons: ["人間が読みにくい", "編集しにくい"],
    recommended: false,
  },
];

// ============================================================
// ワークフロー状態
// ============================================================

export interface WorkflowState {
  // 現在のモード
  mode: UserMode;

  // 現在のステップ
  currentStep: WorkflowStepId;

  // 完了済みステップ
  completedSteps: WorkflowStepId[];

  // スキップしたステップ
  skippedSteps: WorkflowStepId[];

  // 各ステップのデータ
  stepData: Partial<Record<WorkflowStepId, unknown>>;

  // プロンプト形式設定
  promptFormat: PromptFormat;

  // カスタマイズモード（テンプレート vs 自分でカスタマイズ）
  customizationMode: "template" | "custom";
}

export const DEFAULT_WORKFLOW_STATE: WorkflowState = {
  mode: "guided",
  currentStep: "research",
  completedSteps: [],
  skippedSteps: [],
  stepData: {},
  promptFormat: "yaml",
  customizationMode: "template",
};

// ============================================================
// ヘルパー関数
// ============================================================

export function getStepById(id: WorkflowStepId): WorkflowStep | undefined {
  return WORKFLOW_STEPS.find((step) => step.id === id);
}

export function getStepIndex(id: WorkflowStepId): number {
  return WORKFLOW_STEPS.findIndex((step) => step.id === id);
}

export function getNextStep(currentId: WorkflowStepId): WorkflowStepId | null {
  const index = getStepIndex(currentId);
  if (index === -1 || index >= WORKFLOW_STEPS.length - 1) return null;
  return WORKFLOW_STEPS[index + 1].id;
}

export function getPreviousStep(currentId: WorkflowStepId): WorkflowStepId | null {
  const index = getStepIndex(currentId);
  if (index <= 0) return null;
  return WORKFLOW_STEPS[index - 1].id;
}

export function canSkipStep(id: WorkflowStepId): boolean {
  return getStepById(id)?.skippable ?? false;
}
