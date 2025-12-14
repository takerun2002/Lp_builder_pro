/**
 * ナレッジローダー
 *
 * YAMLナレッジファイルを読み込み、Magic Penやコピー生成に活用
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as yaml from "yaml";

// ============================================
// 型定義
// ============================================

export interface KillerWord {
  word: string;
  effect: string;
  use_case: string;
}

export interface KillerWordCategory {
  name: string;
  description: string;
  keywords: KillerWord[];
}

export interface WritingTechnique {
  name: string;
  principle: string;
  why_it_works: string;
  ai_instruction: string;
  patterns?: Record<string, unknown>;
  examples?: unknown[];
}

export interface PsychologicalTrigger {
  id: string;
  name: string;
  theory?: string;
  description: string;
  stage_hint?: string[];
  lp_usage: string;
}

export interface FunnelStage {
  stage: string;
  goal_cognitive: string;
  key_questions: string[];
  dominant_emotions: string[];
  lp_section: string;
}

// ナレッジデータ構造
export interface KnowledgeData {
  killerWords: {
    categories: Record<string, KillerWordCategory>;
    allWords: KillerWord[];
  };
  writingTechniques: Record<string, WritingTechnique>;
  psychologicalTriggers: {
    highPriority: PsychologicalTrigger[];
    additional: PsychologicalTrigger[];
    all: PsychologicalTrigger[];
  };
  purchaseFunnel: FunnelStage[];
  checklist: { check: string; technique: number }[];
}

// キャッシュ
let cachedKnowledge: KnowledgeData | null = null;

// ============================================
// ローダー関数
// ============================================

/**
 * ナレッジを読み込む
 */
export function loadKnowledge(): KnowledgeData {
  if (cachedKnowledge) {
    return cachedKnowledge;
  }

  const knowledgePath = join(process.cwd(), "src/lib/knowledge");

  // キラーワード
  const killerWords = loadKillerWords(knowledgePath);

  // ライティングテクニック
  const writingTechniques = loadWritingTechniques(knowledgePath);

  // 心理トリガー & ファネル
  const consumerBehavior = loadConsumerBehavior(knowledgePath);

  cachedKnowledge = {
    killerWords,
    writingTechniques: writingTechniques.techniques,
    psychologicalTriggers: consumerBehavior.triggers,
    purchaseFunnel: consumerBehavior.funnel,
    checklist: writingTechniques.checklist,
  };

  return cachedKnowledge;
}

/**
 * キャッシュをクリア
 */
export function clearKnowledgeCache(): void {
  cachedKnowledge = null;
}

// ============================================
// 個別ローダー
// ============================================

function loadKillerWords(basePath: string): KnowledgeData["killerWords"] {
  const filePath = join(basePath, "killer_words.yaml");

  if (!existsSync(filePath)) {
    console.warn("[knowledge] killer_words.yaml not found");
    return { categories: {}, allWords: [] };
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = yaml.parse(content);

    const categories: Record<string, KillerWordCategory> = {};
    const allWords: KillerWord[] = [];

    if (parsed.categories) {
      for (const [key, value] of Object.entries(parsed.categories)) {
        const cat = value as {
          name: string;
          description: string;
          keywords: { word: string; effect: string; use_case: string }[];
        };
        categories[key] = {
          name: cat.name,
          description: cat.description,
          keywords: cat.keywords || [],
        };
        allWords.push(...(cat.keywords || []));
      }
    }

    return { categories, allWords };
  } catch (e) {
    console.error("[knowledge] Failed to load killer_words.yaml:", e);
    return { categories: {}, allWords: [] };
  }
}

function loadWritingTechniques(basePath: string): {
  techniques: Record<string, WritingTechnique>;
  checklist: { check: string; technique: number }[];
} {
  const filePath = join(basePath, "writing_techniques.yaml");

  if (!existsSync(filePath)) {
    console.warn("[knowledge] writing_techniques.yaml not found");
    return { techniques: {}, checklist: [] };
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = yaml.parse(content);

    const techniques: Record<string, WritingTechnique> = {};

    // technique_1 ~ technique_6 を読み込み
    for (let i = 1; i <= 6; i++) {
      const key = `technique_${i}_${getTechniqueKey(i)}`;
      if (parsed[key]) {
        techniques[`technique_${i}`] = parsed[key] as WritingTechnique;
      }
    }

    const checklist = parsed.checklist?.before_output || [];

    return { techniques, checklist };
  } catch (e) {
    console.error("[knowledge] Failed to load writing_techniques.yaml:", e);
    return { techniques: {}, checklist: [] };
  }
}

function getTechniqueKey(num: number): string {
  const keys = [
    "repetition",
    "why_answer",
    "numbers",
    "authority",
    "common_ground",
    "confidence",
  ];
  return keys[num - 1] || "";
}

function loadConsumerBehavior(basePath: string): {
  triggers: KnowledgeData["psychologicalTriggers"];
  funnel: FunnelStage[];
} {
  const filePath = join(basePath, "consumer_behavior.yaml");

  if (!existsSync(filePath)) {
    console.warn("[knowledge] consumer_behavior.yaml not found");
    return {
      triggers: { highPriority: [], additional: [], all: [] },
      funnel: [],
    };
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = yaml.parse(content);

    const highPriority = (parsed.psychological_triggers?.high_priority ||
      []) as PsychologicalTrigger[];
    const additional = (parsed.psychological_triggers?.additional ||
      []) as PsychologicalTrigger[];

    return {
      triggers: {
        highPriority,
        additional,
        all: [...highPriority, ...additional],
      },
      funnel: (parsed.purchase_funnel_map || []) as FunnelStage[],
    };
  } catch (e) {
    console.error("[knowledge] Failed to load consumer_behavior.yaml:", e);
    return {
      triggers: { highPriority: [], additional: [], all: [] },
      funnel: [],
    };
  }
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * LPセクションに適した心理トリガーを取得
 */
export function getTriggersForSection(
  sectionType: string
): PsychologicalTrigger[] {
  const knowledge = loadKnowledge();
  const sectionToStage: Record<string, string[]> = {
    hero: ["Awareness"],
    headline: ["Awareness"],
    problem: ["Interest"],
    story: ["Interest"],
    solution: ["Consideration"],
    features: ["Consideration"],
    benefits: ["Consideration"],
    testimonials: ["Interest", "Consideration"],
    pricing: ["Consideration", "Intent"],
    offer: ["Intent"],
    guarantee: ["Consideration", "Purchase"],
    faq: ["Consideration", "Purchase"],
    cta: ["Intent", "Purchase"],
  };

  const stages = sectionToStage[sectionType.toLowerCase()] || [];

  return knowledge.psychologicalTriggers.all.filter(
    (trigger) =>
      trigger.stage_hint?.some((s) => stages.includes(s)) ?? false
  );
}

/**
 * ランダムなキラーワードを取得
 */
export function getRandomKillerWords(
  count: number,
  category?: string
): KillerWord[] {
  const knowledge = loadKnowledge();

  let words = knowledge.killerWords.allWords;
  if (category && knowledge.killerWords.categories[category]) {
    words = knowledge.killerWords.categories[category].keywords;
  }

  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * ライティングチェックリストを取得
 */
export function getWritingChecklist(): string[] {
  const knowledge = loadKnowledge();
  return knowledge.checklist.map((item) => item.check);
}

/**
 * AI指示用のテクニック要約を生成
 */
export function getTechniqueInstructions(): string {
  const knowledge = loadKnowledge();
  const instructions: string[] = [];

  for (const [, technique] of Object.entries(knowledge.writingTechniques)) {
    if (technique.ai_instruction) {
      instructions.push(`### ${technique.name}\n${technique.ai_instruction}`);
    }
  }

  return instructions.join("\n\n");
}

/**
 * 心理トリガー一覧を取得（AI指示用）
 */
export function getTriggerSummary(): string {
  const knowledge = loadKnowledge();

  return knowledge.psychologicalTriggers.highPriority
    .map((t) => `- ${t.name}（${t.id}）: ${t.lp_usage}`)
    .join("\n");
}
