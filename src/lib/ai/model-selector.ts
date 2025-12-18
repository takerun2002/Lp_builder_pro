/**
 * Dynamic Model Selection System
 * 用途に応じてAIモデルを柔軟に切り替えるシステム
 */

import { getDb } from "@/lib/db";
import modelsConfig from "./models.json";

// =============================================================================
// Types
// =============================================================================

export type ModelProvider = "gemini" | "openrouter" | "fal";
export type ModelCategory = "llm" | "image" | "embedding" | "video";
export type CostTier = "low" | "medium" | "high";
export type TaskType =
  | "analysis"
  | "research"
  | "copywriting"
  | "summarization"
  | "translation"
  | "image_generation"
  | "image_editing"
  | "draft"
  | "test"
  | "rag_query"
  | "embedding"
  | "structure_creation"
  | "prompt_generation"
  | "wireframe_analysis"
  | "chat"
  | "ocr";

export interface ModelCapabilities {
  text_to_image?: boolean;
  image_to_image?: boolean;
  text_generation?: boolean;
  reasoning?: boolean;
  rag?: boolean;
  size?: boolean;
  multimodal?: boolean;
  agentic?: boolean;
}

export interface ModelConfig {
  id: string;
  label: string;
  provider: ModelProvider;
  model: string;
  endpoint: string;
  category: ModelCategory;
  capabilities: ModelCapabilities;
  timeoutSec: number;
  costTier: CostTier;
  default?: boolean;
  aspectRatios?: string[];
  defaultAspectRatio?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  systemPrompt?: string;
  description?: string;
}

export interface ModelPreset {
  research: string;
  copywriting: string;
  image: string;
  test: string;
  embedding: string;
}

export interface UserModelSettings {
  presets: ModelPreset;
  costLimit: CostTier | "unlimited";
  autoDowngrade: boolean;
  apiKeys: {
    gemini?: string;
    openrouter?: string;
    fal?: string;
  };
}

// =============================================================================
// Model Registry
// =============================================================================

class ModelRegistry {
  private models: Map<string, ModelConfig> = new Map();
  private presets: ModelPreset;
  private taskMapping: Record<string, string>;

  constructor() {
    // Load models from JSON
    for (const model of modelsConfig.models as ModelConfig[]) {
      this.models.set(model.id, model);
    }
    this.presets = modelsConfig.presets as ModelPreset;
    this.taskMapping = modelsConfig.taskMapping as Record<string, string>;
  }

  /**
   * Get all models
   */
  getAllModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  /**
   * Get model by ID
   */
  getModel(id: string): ModelConfig | undefined {
    return this.models.get(id);
  }

  /**
   * Get models by category
   */
  getModelsByCategory(category: ModelCategory): ModelConfig[] {
    return this.getAllModels().filter((m) => m.category === category);
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider: ModelProvider): ModelConfig[] {
    return this.getAllModels().filter((m) => m.provider === provider);
  }

  /**
   * Get models by cost tier
   */
  getModelsByCostTier(tier: CostTier): ModelConfig[] {
    return this.getAllModels().filter((m) => m.costTier === tier);
  }

  /**
   * Get default model for category
   */
  getDefaultModel(category: ModelCategory): ModelConfig | undefined {
    return this.getModelsByCategory(category).find((m) => m.default);
  }

  /**
   * Get recommended model for task
   */
  getModelForTask(task: TaskType): ModelConfig | undefined {
    const modelId = this.taskMapping[task];
    return modelId ? this.models.get(modelId) : undefined;
  }

  /**
   * Get presets
   */
  getPresets(): ModelPreset {
    return { ...this.presets };
  }
}

// Singleton instance
const registry = new ModelRegistry();

// =============================================================================
// Model Selector
// =============================================================================

export class ModelSelector {
  private userSettings: UserModelSettings | null = null;

  /**
   * Load user settings from database
   */
  async loadUserSettings(): Promise<UserModelSettings> {
    if (this.userSettings) {
      return this.userSettings;
    }

    const db = getDb();
    const row = db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get("model_settings") as { value: string } | undefined;

    if (row) {
      try {
        this.userSettings = JSON.parse(row.value);
        return this.userSettings!;
      } catch {
        // Fall through to defaults
      }
    }

    // Default settings
    this.userSettings = {
      presets: registry.getPresets(),
      costLimit: "unlimited",
      autoDowngrade: true,
      apiKeys: {},
    };

    return this.userSettings;
  }

  /**
   * Save user settings to database
   */
  async saveUserSettings(settings: Partial<UserModelSettings>): Promise<void> {
    const current = await this.loadUserSettings();
    this.userSettings = { ...current, ...settings };

    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run("model_settings", JSON.stringify(this.userSettings), now);
  }

  /**
   * Select model for task with cost consideration
   */
  async selectModel(
    task: TaskType,
    options?: {
      preferredModel?: string;
      maxCost?: CostTier;
    }
  ): Promise<ModelConfig> {
    const settings = await this.loadUserSettings();

    // 1. If preferred model is specified, try to use it
    if (options?.preferredModel) {
      const preferred = registry.getModel(options.preferredModel);
      if (preferred && this.isWithinCostLimit(preferred, options?.maxCost || settings.costLimit)) {
        return preferred;
      }
    }

    // 2. Use task mapping
    let model = registry.getModelForTask(task);

    // 3. Check cost limit
    if (model && !this.isWithinCostLimit(model, options?.maxCost || settings.costLimit)) {
      if (settings.autoDowngrade) {
        model = this.findCheaperAlternative(model);
      }
    }

    // 4. Fallback to default
    if (!model) {
      const category = this.taskToCategory(task);
      model = registry.getDefaultModel(category);
    }

    if (!model) {
      throw new Error(`No suitable model found for task: ${task}`);
    }

    return model;
  }

  /**
   * Select model for image generation
   */
  async selectImageModel(options?: {
    preferT2I?: boolean;
    preferI2I?: boolean;
    maxCost?: CostTier;
  }): Promise<ModelConfig> {
    const settings = await this.loadUserSettings();
    const imageModels = registry.getModelsByCategory("image");

    // Filter by capability
    let candidates = imageModels;
    if (options?.preferT2I) {
      candidates = candidates.filter((m) => m.capabilities.text_to_image);
    }
    if (options?.preferI2I) {
      candidates = candidates.filter((m) => m.capabilities.image_to_image);
    }

    // Filter by cost
    const costLimit = options?.maxCost || settings.costLimit;
    if (costLimit !== "unlimited") {
      candidates = candidates.filter((m) => this.isWithinCostLimit(m, costLimit));
    }

    // Return default or first available
    const defaultModel = candidates.find((m) => m.default);
    return defaultModel || candidates[0] || registry.getDefaultModel("image")!;
  }

  /**
   * Get API key for provider
   */
  async getApiKey(provider: ModelProvider): Promise<string | undefined> {
    const settings = await this.loadUserSettings();

    // Check user settings first
    const settingsKey = settings.apiKeys[provider];
    if (settingsKey) {
      return settingsKey;
    }

    // Check environment variables
    switch (provider) {
      case "gemini":
        return process.env.GOOGLE_API_KEY;
      case "openrouter":
        return process.env.OPENROUTER_API_KEY;
      case "fal":
        return process.env.FAL_API_KEY;
    }
  }

  /**
   * Check if API key is configured for provider
   */
  async isProviderConfigured(provider: ModelProvider): Promise<boolean> {
    const apiKey = await this.getApiKey(provider);
    return !!apiKey;
  }

  /**
   * Get available providers (with API keys configured)
   */
  async getAvailableProviders(): Promise<ModelProvider[]> {
    const providers: ModelProvider[] = ["gemini", "openrouter", "fal"];
    const available: ModelProvider[] = [];

    for (const provider of providers) {
      if (await this.isProviderConfigured(provider)) {
        available.push(provider);
      }
    }

    return available;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private isWithinCostLimit(model: ModelConfig, limit: CostTier | "unlimited"): boolean {
    if (limit === "unlimited") return true;

    const tierOrder: Record<CostTier, number> = {
      low: 1,
      medium: 2,
      high: 3,
    };

    return tierOrder[model.costTier] <= tierOrder[limit];
  }

  private findCheaperAlternative(model: ModelConfig): ModelConfig | undefined {
    const sameCategory = registry.getModelsByCategory(model.category);
    const tierOrder: Record<CostTier, number> = {
      low: 1,
      medium: 2,
      high: 3,
    };

    // Find cheaper models with similar capabilities
    const cheaper = sameCategory
      .filter((m) => tierOrder[m.costTier] < tierOrder[model.costTier])
      .sort((a, b) => tierOrder[b.costTier] - tierOrder[a.costTier]); // Prefer higher tier among cheaper

    return cheaper[0];
  }

  private taskToCategory(task: TaskType): ModelCategory {
    switch (task) {
      case "image_generation":
      case "image_editing":
        return "image";
      case "embedding":
      case "rag_query":
        return "embedding";
      default:
        return "llm";
    }
  }
}

// =============================================================================
// Exports
// =============================================================================

// Export registry methods
export const getAllModels = () => registry.getAllModels();
export const getModel = (id: string) => registry.getModel(id);
export const getModelsByCategory = (category: ModelCategory) =>
  registry.getModelsByCategory(category);
export const getModelsByProvider = (provider: ModelProvider) =>
  registry.getModelsByProvider(provider);
export const getDefaultModel = (category: ModelCategory) => registry.getDefaultModel(category);
export const getModelForTask = (task: TaskType) => registry.getModelForTask(task);
export const getPresets = () => registry.getPresets();

// Singleton selector instance
let selectorInstance: ModelSelector | null = null;

export function getModelSelector(): ModelSelector {
  if (!selectorInstance) {
    selectorInstance = new ModelSelector();
  }
  return selectorInstance;
}

/**
 * Convenience function to select model for task
 */
export async function selectModelForTask(
  task: TaskType,
  options?: { preferredModel?: string; maxCost?: CostTier }
): Promise<ModelConfig> {
  const selector = getModelSelector();
  return selector.selectModel(task, options);
}

/**
 * Convenience function to get model ID for task
 */
export async function getModelIdForTask(task: TaskType): Promise<string> {
  const model = await selectModelForTask(task);
  return model.model;
}
