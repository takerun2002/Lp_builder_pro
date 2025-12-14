/**
 * 心理トリガー自動適用システム
 *
 * LP構成 × 心理トリガーのマッピングを管理し、
 * 各セクションに適切なトリガーを自動選択・適用
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as yaml from "yaml";

// ============================================
// 型定義
// ============================================

export type LpSectionType =
  | "headline"
  | "story"
  | "problem"
  | "agitation"
  | "proof"
  | "bullets"
  | "testimonial"
  | "offer"
  | "guarantee"
  | "faq"
  | "ps"
  | "cta";

export interface PsychologicalTrigger {
  id: string;
  name: string;
  theory?: string;
  description: string;
  stage_hint?: string[];
  lp_usage: string;
}

export interface SectionTriggerMapping {
  purpose: string;
  triggers: string[];
  checklist: string[];
}

export interface TriggerApplication {
  sectionType: LpSectionType;
  sectionLabel: string;
  recommendedTriggers: PsychologicalTrigger[];
  copyGuidelines: string[];
  checklist: string[];
  examples: string[];
}

export interface HookTemplate {
  template: string;
  best_stage: string[];
  recommended_triggers: string[];
  example: string;
}

export interface FunnelStage {
  stage: string;
  goal_cognitive: string;
  key_questions: string[];
  dominant_emotions: string[];
  lp_section: string;
}

// ============================================
// キャッシュ
// ============================================

interface ConsumerBehaviorData {
  purchase_funnel_map: FunnelStage[];
  psychological_triggers: {
    high_priority: PsychologicalTrigger[];
    additional: PsychologicalTrigger[];
  };
  lp_section_trigger_mapping: Record<string, SectionTriggerMapping>;
  hook_templates: HookTemplate[];
  emotions_and_needs_by_stage: Record<
    string,
    { emotions: string[]; needs: string[]; lp_approach: string }
  >;
}

let cachedData: ConsumerBehaviorData | null = null;

// ============================================
// ローダー
// ============================================

/**
 * consumer_behavior.yaml を読み込む
 */
function loadConsumerBehavior(): ConsumerBehaviorData {
  if (cachedData) {
    return cachedData;
  }

  const filePath = join(
    process.cwd(),
    "src/lib/knowledge/consumer_behavior.yaml"
  );

  if (!existsSync(filePath)) {
    throw new Error("consumer_behavior.yaml not found");
  }

  const content = readFileSync(filePath, "utf-8");
  cachedData = yaml.parse(content) as ConsumerBehaviorData;

  return cachedData;
}

/**
 * キャッシュをクリア
 */
export function clearTriggerCache(): void {
  cachedData = null;
}

// ============================================
// セクション定義
// ============================================

const SECTION_LABELS: Record<LpSectionType, string> = {
  headline: "ヘッドコピー",
  story: "ストーリー・問題提起",
  problem: "問題提起",
  agitation: "煽り立て・共感",
  proof: "主張と証拠",
  bullets: "ブレット",
  testimonial: "お客様の声",
  offer: "オファー・限定性",
  guarantee: "保証",
  faq: "Q&A",
  ps: "追伸",
  cta: "CTA（行動喚起）",
};

const SECTION_TO_YAML_KEY: Record<LpSectionType, string> = {
  headline: "ヘッドコピー",
  story: "ストーリー・問題提起",
  problem: "ストーリー・問題提起",
  agitation: "煽り立て・共感",
  proof: "主張と証拠",
  bullets: "ブレット",
  testimonial: "お客様の声",
  offer: "オファー・限定性",
  guarantee: "保証",
  faq: "Q&A",
  ps: "追伸",
  cta: "オファー・限定性",
};

// ============================================
// トリガー取得
// ============================================

/**
 * 全心理トリガー一覧を取得
 */
export function getAllTriggers(): PsychologicalTrigger[] {
  const data = loadConsumerBehavior();
  return [
    ...data.psychological_triggers.high_priority,
    ...data.psychological_triggers.additional,
  ];
}

/**
 * 高優先度トリガーを取得
 */
export function getHighPriorityTriggers(): PsychologicalTrigger[] {
  const data = loadConsumerBehavior();
  return data.psychological_triggers.high_priority;
}

/**
 * IDでトリガーを取得
 */
export function getTriggerById(id: string): PsychologicalTrigger | null {
  const allTriggers = getAllTriggers();
  return allTriggers.find((t) => t.id === id) || null;
}

/**
 * 複数のIDでトリガーを取得
 */
export function getTriggersByIds(ids: string[]): PsychologicalTrigger[] {
  const allTriggers = getAllTriggers();
  return ids
    .map((id) => allTriggers.find((t) => t.id === id))
    .filter((t): t is PsychologicalTrigger => t !== undefined);
}

// ============================================
// セクション × トリガー マッピング
// ============================================

/**
 * LPセクション一覧を取得
 */
export function getLpSections(): Array<{ id: LpSectionType; label: string }> {
  return Object.entries(SECTION_LABELS).map(([id, label]) => ({
    id: id as LpSectionType,
    label,
  }));
}

/**
 * セクションに推奨されるトリガーを取得
 */
export function getTriggersForSection(
  sectionType: LpSectionType
): PsychologicalTrigger[] {
  const data = loadConsumerBehavior();
  const yamlKey = SECTION_TO_YAML_KEY[sectionType];
  const mapping = data.lp_section_trigger_mapping[yamlKey];

  if (!mapping) {
    return [];
  }

  return getTriggersByIds(mapping.triggers);
}

/**
 * セクションのマッピング情報を取得
 */
export function getSectionMapping(
  sectionType: LpSectionType
): SectionTriggerMapping | null {
  const data = loadConsumerBehavior();
  const yamlKey = SECTION_TO_YAML_KEY[sectionType];
  return data.lp_section_trigger_mapping[yamlKey] || null;
}

// ============================================
// トリガー適用
// ============================================

/**
 * セクションへのトリガー適用情報を生成
 */
export function applyTriggersToSection(
  sectionType: LpSectionType,
  customTriggerIds?: string[]
): TriggerApplication {
  const data = loadConsumerBehavior();
  const yamlKey = SECTION_TO_YAML_KEY[sectionType];
  const mapping = data.lp_section_trigger_mapping[yamlKey];

  // カスタムトリガーまたはデフォルトトリガーを使用
  const triggers = customTriggerIds
    ? getTriggersByIds(customTriggerIds)
    : getTriggersForSection(sectionType);

  // コピーガイドラインを生成
  const copyGuidelines = generateCopyGuidelines(sectionType, triggers);

  // 使用例を生成
  const examples = triggers.map((t) => t.lp_usage);

  return {
    sectionType,
    sectionLabel: SECTION_LABELS[sectionType],
    recommendedTriggers: triggers,
    copyGuidelines,
    checklist: mapping?.checklist || [],
    examples,
  };
}

/**
 * コピーガイドラインを生成
 */
function generateCopyGuidelines(
  sectionType: LpSectionType,
  triggers: PsychologicalTrigger[]
): string[] {
  const guidelines: string[] = [];

  // セクション固有のガイドライン
  const sectionGuidelines: Record<LpSectionType, string[]> = {
    headline: [
      "3秒で自分ごと化できる表現を使う",
      "続きを読みたくなる好奇心を刺激する",
      "具体的な数字やベネフィットを含める",
    ],
    story: [
      "ターゲットの悩みを言語化する",
      "共感できる「あるある」エピソードを入れる",
      "問題を認識させ、解決への期待を高める",
    ],
    problem: [
      "ターゲットが抱える問題を明確にする",
      "問題を放置するとどうなるかを示す",
      "読者に「これは自分のことだ」と思わせる",
    ],
    agitation: [
      "問題の深刻さを認識させる",
      "放置のリスクを具体的に伝える",
      "煽りすぎず、共感を優先する",
    ],
    proof: [
      "なぜ効果があるかを論理的に説明する",
      "実績・証拠・データを示す",
      "専門家の推薦や第三者評価を活用する",
    ],
    bullets: [
      "ベネフィット訴求を中心にする",
      "各項目が価格以上の価値に見えるようにする",
      "具体的な数字や成果を含める",
    ],
    testimonial: [
      "Before→Afterの変化を明確にする",
      "ターゲットと似た属性の声を選ぶ",
      "具体的なエピソードを含める",
    ],
    offer: [
      "価値を先に伝えてから価格を出す",
      "限定要素（数量・期間）を具体的にする",
      "比較対象を示してお得感を演出する",
    ],
    guarantee: [
      "リスクリバーサルを明確にする",
      "自信を示す表現を使う",
      "具体的な保証内容と条件を明示する",
    ],
    faq: [
      "購入を迷う理由を潰す",
      "よくある質問を網羅する",
      "不安を解消し、安心感を与える",
    ],
    ps: [
      "要点をまとめる",
      "力強いCTAを含める",
      "最後の一押しとなるメッセージを入れる",
    ],
    cta: [
      "行動を明確に指示する",
      "今すぐ行動する理由を示す",
      "ボタンテキストは行動を促す動詞で始める",
    ],
  };

  // セクション固有のガイドラインを追加
  guidelines.push(...(sectionGuidelines[sectionType] || []));

  // トリガーに基づくガイドラインを追加
  for (const trigger of triggers) {
    guidelines.push(`【${trigger.name}】${trigger.description}`);
  }

  return guidelines;
}

// ============================================
// フックテンプレート
// ============================================

/**
 * 全フックテンプレートを取得
 */
export function getHookTemplates(): HookTemplate[] {
  const data = loadConsumerBehavior();
  return data.hook_templates || [];
}

/**
 * ステージに適したフックテンプレートを取得
 */
export function getHookTemplatesForStage(stage: string): HookTemplate[] {
  const templates = getHookTemplates();
  return templates.filter((t) => t.best_stage.includes(stage));
}

/**
 * トリガーに適したフックテンプレートを取得
 */
export function getHookTemplatesForTriggers(
  triggerIds: string[]
): HookTemplate[] {
  const templates = getHookTemplates();
  return templates.filter((t) =>
    t.recommended_triggers.some((tr) => triggerIds.includes(tr))
  );
}

// ============================================
// ファネル情報
// ============================================

/**
 * 購買ファネル情報を取得
 */
export function getPurchaseFunnel(): FunnelStage[] {
  const data = loadConsumerBehavior();
  return data.purchase_funnel_map || [];
}

/**
 * ステージの感情・ニーズ情報を取得
 */
export function getStageEmotionsAndNeeds(
  stage: string
): { emotions: string[]; needs: string[]; lp_approach: string } | null {
  const data = loadConsumerBehavior();
  return data.emotions_and_needs_by_stage[stage] || null;
}

// ============================================
// AI プロンプト生成
// ============================================

/**
 * セクション用のAIプロンプト指示を生成
 */
export function generateTriggerPromptInstructions(
  sectionType: LpSectionType,
  customTriggerIds?: string[]
): string {
  const application = applyTriggersToSection(sectionType, customTriggerIds);

  let prompt = `## ${application.sectionLabel}の作成指示\n\n`;

  // 目的
  const mapping = getSectionMapping(sectionType);
  if (mapping) {
    prompt += `### 目的\n${mapping.purpose}\n\n`;
  }

  // 適用する心理トリガー
  if (application.recommendedTriggers.length > 0) {
    prompt += `### 適用する心理トリガー\n`;
    for (const trigger of application.recommendedTriggers) {
      prompt += `- **${trigger.name}（${trigger.id}）**: ${trigger.description}\n`;
      prompt += `  使用例: ${trigger.lp_usage}\n`;
    }
    prompt += "\n";
  }

  // コピーガイドライン
  if (application.copyGuidelines.length > 0) {
    prompt += `### コピーガイドライン\n`;
    for (const guideline of application.copyGuidelines) {
      prompt += `- ${guideline}\n`;
    }
    prompt += "\n";
  }

  // チェックリスト
  if (application.checklist.length > 0) {
    prompt += `### チェックリスト\n`;
    for (const item of application.checklist) {
      prompt += `- [ ] ${item}\n`;
    }
    prompt += "\n";
  }

  return prompt;
}

/**
 * LP全体のAIプロンプト指示を生成
 */
export function generateFullLpTriggerInstructions(
  sections: LpSectionType[]
): string {
  let prompt = `# LP心理トリガー適用ガイド\n\n`;
  prompt += `以下の各セクションに適切な心理トリガーを適用してコピーを作成してください。\n\n`;

  for (const section of sections) {
    prompt += generateTriggerPromptInstructions(section);
    prompt += "---\n\n";
  }

  return prompt;
}

// ============================================
// ユーティリティ
// ============================================

/**
 * トリガーを検索
 */
export function searchTriggers(query: string): PsychologicalTrigger[] {
  const allTriggers = getAllTriggers();
  const lowerQuery = query.toLowerCase();

  return allTriggers.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.id.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * ステージに適したトリガーを取得
 */
export function getTriggersForStage(stage: string): PsychologicalTrigger[] {
  const highPriority = getHighPriorityTriggers();
  return highPriority.filter((t) => t.stage_hint?.includes(stage));
}

/**
 * トリガーの要約を取得（AI指示用）
 */
export function getTriggerSummary(): string {
  const triggers = getHighPriorityTriggers();
  return triggers.map((t) => `- ${t.name}（${t.id}）: ${t.lp_usage}`).join("\n");
}
