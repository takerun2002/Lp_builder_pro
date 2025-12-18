# LP Builder Pro - Claude Code 実装指示書（2025年12月版）

## 📋 概要

このドキュメントは、LP Builder Proの新機能を実装するためのClaude Codeへの指示書です。
**コスパ最適化**と**動的リサーチ強化**を中心に、以下の機能を実装してください。

---

## 🎯 実装優先順位

### Sprint 1: 基盤機能（最優先）

1. **動的モデル選択システム（コスパ最適化版）** ⭐⭐⭐
2. **高度な動的スクレイピング統合（Crawlee/Crawljax）** ⭐⭐⭐
3. **リサーチ言語化支援（マルチエージェント壁打ち）** ⭐⭐⭐
4. **バナーエディター（Novasphere型）** ⭐⭐
5. **デザインプロンプトジェネレーター（YouTubeサムネイル心理学統合）** ⭐⭐

### Sprint 2: ボーナス機能

6. **リサーチプロンプト・スキル提供機能** ⭐⭐

---

## 📝 実装タスク詳細

### Task 1: 動的モデル選択システム（コスパ最適化版）

**優先度**: ⭐⭐⭐ コスト削減

#### 概要
用途に応じてAIモデルを柔軟に切り替えられる動的モデル選択システムを実装してください。
**ユーザーが手動でモデルを選択できる**UIを提供し、コスパ最適化の推奨も表示します。
OpenRouter経由でGlockfastなども利用可能にします。

#### 作成ファイル
- `src/lib/ai/models.json` - モデル定義（Gemini + OpenRouter）
- `src/lib/ai/model-selector.ts` - モデル選択ロジック（推奨表示）
- `src/lib/ai/openrouter.ts` - OpenRouter API統合
- `src/components/ui/model-dropdown.tsx` - モデル選択UIコンポーネント
- `src/components/ui/model-recommendation.tsx` - コスパ推奨表示コンポーネント
- `src/app/dev/settings/page.tsx` - APIキー設定画面（更新）

#### コア要件

1. **Glockfast優先戦略**
   - OpenRouter APIキーが設定されている場合、基本機能では**Glockfastを最優先**で使用
   - モデルID: `glockfast/glockfast`
   - 超安価で優秀なモデルのため、基本機能全般で推奨

2. **モデル選択UI**
   - 各機能画面にモデル選択ドロップダウンを配置
   - コスパ推奨を表示（強制しない）
   - ユーザーが最終決定

3. **APIキー管理**
   - OpenRouter API Key（最優先推奨）
   - Gemini API Key（必須推奨）
   - Anthropic API Key（Claude用、オプション）
   - OpenAI API Key（オプション）

4. **コスト予測機能**
   - 実行前にコストを表示
   - 推定入力トークン、出力トークンからコスト計算

#### 実装例

```typescript
// src/lib/ai/model-selector.ts

type TaskType = 
  | 'bulk_research_analysis'      // 大量リサーチデータ分析
  | 'long_content_generation'     // 長文コンテンツ生成（セールスレター等）
  | 'copywriting'                 // コピーライティング（ヘッドライン・コピー）
  | 'headline_generation'         // ヘッドライン生成
  | 'conversational_assistance'   // 壁打ち・対話型支援
  | 'deep_reasoning'              // 複雑な推論が必要な分析
  | 'complex_analysis'            // 複雑な分析
  | 'simple_summary'              // シンプルな要約
  | 'image_generation';            // 画像生成

interface ModelSelectionOptions {
  taskType: TaskType;
  contextLength: number;
  estimatedOutputTokens?: number;
  costLimit?: number;
  userPlan?: 'free' | 'premium';
  hasOpenRouterApiKey?: boolean;  // OpenRouter APIキーが設定されているか
}

export function selectOptimalModel(options: ModelSelectionOptions): {
  modelId: string;
  estimatedCost: number;
  reason: string;
} {
  const { taskType, contextLength, estimatedOutputTokens = 0, costLimit, userPlan = 'free', hasOpenRouterApiKey = false } = options;
  
  // Glockfast優先の選択ロジック
  switch (taskType) {
    case 'bulk_research_analysis':
    case 'long_content_generation':
      // OpenRouter APIキーがある場合はGlockfastを優先
      if (hasOpenRouterApiKey) {
        return {
          modelId: 'glockfast/glockfast',
          reason: '大量データ分析・長文生成にはGlockfastが最適（超安価で優秀）',
          estimatedCost: null, // OpenRouter経由のため動的
        };
      }
      return {
        modelId: 'gemini-2.0-flash',
        reason: '大量データ分析・長文生成には2.0 Flashが最適（$0.10/100万トークン）',
        estimatedCost: 0.10,
      };
    
    case 'copywriting':
    case 'headline_generation':
      // コピーライティングは推論能力が必要
      if (userPlan === 'premium' && hasOpenRouterApiKey) {
        return {
          modelId: 'anthropic/claude-sonnet-4-20250514',
          reason: 'コピーライティングには推論能力が必要なためClaude Sonnetを推奨',
          estimatedCost: null,
        };
      } else if (userPlan === 'premium') {
        return {
          modelId: 'gemini-2.5-pro',
          reason: 'コピーライティングには推論能力が必要なため2.5 Proを使用',
          estimatedCost: 1.25,
        };
      } else {
        return {
          modelId: 'gemini-2.5-flash',
          reason: '無料プランでは2.5 Flashを使用（有料プランでClaude Sonnet利用可能）',
          estimatedCost: 0.30,
        };
      }
    
    case 'conversational_assistance':
    case 'deep_reasoning':
      // 壁打ち・対話型はClaude Sonnet（有料プランのみ）
      if (userPlan === 'premium' && hasOpenRouterApiKey) {
        return {
          modelId: 'anthropic/claude-sonnet-4-20250514',
          reason: '対話型支援にはClaude Sonnetが最適（推論能力 + 共感力）',
          estimatedCost: null,
        };
      } else {
        return {
          modelId: 'gemini-2.0-flash',
          reason: '無料プランでは2.0 Flashを使用（有料プランでClaude Sonnet利用可能）',
          estimatedCost: 0.10,
        };
      }
    
    case 'simple_summary':
    default:
      // OpenRouter APIキーがある場合はGlockfastを優先
      if (hasOpenRouterApiKey) {
        return {
          modelId: 'glockfast/glockfast',
          reason: 'シンプルなタスクにはGlockfastが最適（超安価で優秀）',
          estimatedCost: null,
        };
      }
      return {
        modelId: 'gemini-2.0-flash',
        reason: 'シンプルなタスクには2.0 Flashが最適（$0.10/100万トークン）',
        estimatedCost: 0.10,
      };
  }
}
```

#### OpenRouter統合

```typescript
// src/lib/ai/openrouter.ts

export async function generateWithOpenRouter(
  modelId: string,
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || '',
      'X-Title': 'LP Builder Pro',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? 1.0,
      max_tokens: options?.maxTokens,
    }),
  });
  
  const data = await response.json();
  return data.choices[0]?.message?.content ?? '';
}

// Glockfast優先のヘルパー関数
export async function generateWithGlockfast(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  return generateWithOpenRouter('glockfast/glockfast', prompt, options);
}
```

#### UI実装

```typescript
// src/components/ui/model-dropdown.tsx

interface ModelDropdownProps {
  taskType: TaskType;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  hasOpenRouterApiKey?: boolean;
}

export function ModelDropdown({ taskType, selectedModel, onModelChange, hasOpenRouterApiKey }: ModelDropdownProps) {
  const recommendation = getRecommendedModel(taskType, 0, hasOpenRouterApiKey);
  
  return (
    <div className="space-y-2">
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hasOpenRouterApiKey && (
            <SelectItem value="glockfast/glockfast">
              Glockfast（推奨・超安価）⭐
            </SelectItem>
          )}
          <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
          <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
          <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
          {hasOpenRouterApiKey && (
            <>
              <SelectItem value="anthropic/claude-sonnet-4-20250514">
                Claude Sonnet（OpenRouter経由）
              </SelectItem>
              <SelectItem value="anthropic/claude-opus-4">
                Claude Opus（OpenRouter経由）
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
      
      {recommendation && (
        <div className="text-sm text-muted-foreground">
          💡 推奨: {recommendation.reason}
        </div>
      )}
    </div>
  );
}
```

#### 期待効果
- **Glockfast優先戦略**: OpenRouter経由で超安価なGlockfastを最優先使用
- **コスト削減**: 基本機能のコストを大幅削減
- **ユーザー選択の柔軟性**: 用途に応じて最適なモデルを選択可能

---

### Task 2: 高度な動的スクレイピング統合（Crawlee/Crawljax）

**優先度**: ⭐⭐⭐ 動的リサーチ強化

#### 概要
GitHubで公開されているオープンソースの動的スクレイピングツールを統合して、
既存のPlaywrightベースのスクレイパーを強化してください。

#### 作成ファイル
- `src/lib/research/scrapers/crawlee-integration.ts` - Crawlee統合（最優先）
- `src/lib/research/scrapers/crawljax-integration.ts` - Crawljax統合（Ajax対応）
- `src/lib/research/scrapers/dynamic-scraper.ts` - 動的スクレイパー統合ラッパー
- `src/lib/research/manus-ai.ts` - Manus AI API統合（オプション）
- `src/components/research/DynamicResearchPanel.tsx` - 動的リサーチUI
- `src/app/api/research/dynamic/route.ts` - 動的リサーチAPI

#### インストール

```bash
npm install crawlee playwright
# CrawljaxはJavaベースのため、必要に応じて別途検討
```

#### Crawlee統合（最優先）

```typescript
// src/lib/research/scrapers/crawlee-integration.ts

import { PlaywrightCrawler, Dataset } from 'crawlee';

interface CrawleeScrapeOptions {
  urls: string[];
  selectors?: {
    title?: string;
    content?: string;
    links?: string;
  };
  waitForSelector?: string;
  maxConcurrency?: number;
}

export async function scrapeWithCrawlee(
  options: CrawleeScrapeOptions
): Promise<any[]> {
  const crawler = new PlaywrightCrawler({
    async requestHandler({ page, request, enqueueLinks }) {
      await page.waitForLoadState('networkidle');
      
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      }
      
      const data = await page.evaluate((selectors) => {
        return {
          url: window.location.href,
          title: selectors.title 
            ? document.querySelector(selectors.title)?.textContent?.trim()
            : document.title,
          content: selectors.content
            ? document.querySelector(selectors.content)?.textContent?.trim()
            : document.body.innerText,
          links: selectors.links
            ? Array.from(document.querySelectorAll(selectors.links))
                .map(el => (el as HTMLAnchorElement).href)
            : [],
        };
      }, options.selectors);
      
      await Dataset.pushData({
        ...data,
        scrapedAt: new Date().toISOString(),
      });
      
      await enqueueLinks({
        selector: 'a[href]',
        label: 'detail',
      });
    },
    
    launchContext: {
      launchOptions: {
        headless: true,
        args: ['--no-sandbox'],
      },
    },
    
    maxConcurrency: options.maxConcurrency || 5,
    maxRequestRetries: 3,
    requestHandlerTimeoutSecs: 60,
  });
  
  await crawler.addRequests(options.urls.map(url => ({ url })));
  await crawler.run();
  
  const dataset = await Dataset.open();
  return await dataset.getData();
}
```

#### 統一インターフェース

```typescript
// src/lib/research/scrapers/dynamic-scraper.ts

type ScraperType = 'crawlee' | 'crawljax' | 'manus-ai' | 'playwright';

interface DynamicScrapeOptions {
  type: ScraperType;
  urls: string[];
  selectors?: Record<string, string>;
  waitFor?: string;
  maxConcurrency?: number;
}

export async function scrapeDynamically(
  options: DynamicScrapeOptions
): Promise<any[]> {
  switch (options.type) {
    case 'crawlee':
      return scrapeWithCrawlee({
        urls: options.urls,
        selectors: options.selectors,
        waitForSelector: options.waitFor,
        maxConcurrency: options.maxConcurrency,
      });
    
    case 'crawljax':
      // Ajax対応が必要な場合（実装は後回し）
      throw new Error('Crawljax integration not yet implemented');
    
    case 'manus-ai':
      // Manus AI API経由（オプション）
      return scrapeWithManusAI(options);
    
    case 'playwright':
    default:
      // 既存のPlaywright実装
      return scrapeWithPlaywright(options);
  }
}

// フォールバック機能
export async function scrapeWithFallback(options: DynamicScrapeOptions) {
  const scrapers: ScraperType[] = ['crawlee', 'playwright'];
  
  for (const scraper of scrapers) {
    try {
      return await scrapeDynamically({ ...options, type: scraper });
    } catch (error) {
      console.warn(`[scraper] ${scraper} failed, trying next...`, error);
      continue;
    }
  }
  
  throw new Error('All scrapers failed');
}
```

#### 既存スクレイパーの強化

既存の`yahoo-chiebukuro.ts`などを更新して、Crawleeを使用可能に：

```typescript
// src/lib/research/scrapers/yahoo-chiebukuro.ts に追加

import { scrapeWithCrawlee } from './crawlee-integration';

export async function scrapeYahooChiebukuroWithCrawlee(
  keyword: string,
  limit: number = 50
): Promise<ChiebukuroResult[]> {
  const searchUrl = `https://chiebukuro.yahoo.co.jp/search?q=${encodeURIComponent(keyword)}`;
  
  const results = await scrapeWithCrawlee({
    urls: [searchUrl],
    selectors: {
      title: '.qa-title',
      content: '.qa-content',
      links: '.qa-list-item a',
    },
    waitForSelector: '.qa-list-item',
    maxConcurrency: 3,
  });
  
  // 結果をChiebukuroResult形式に変換
  return results.slice(0, limit).map((item, index) => ({
    id: `chiebukuro-${index}`,
    title: item.title || '',
    content: item.content || '',
    url: item.url,
    views: 0, // Crawleeで取得
    answers: 0, // Crawleeで取得
    depthScore: 0,
    urgencyScore: 0,
    quadrant: 'consider' as PainPointQuadrant,
    severityKeywords: [],
    scrapedAt: new Date().toISOString(),
  }));
}
```

#### 期待効果
- **Crawlee統合**: 既存Playwrightコードとの互換性 + 動的コンテンツ対応
- **コスト削減**: オープンソースツールは無料（サーバーリソースのみ）
- **リサーチ精度向上**: 動的コンテンツの取得精度が大幅に向上

---

### Task 3: リサーチ言語化支援（マルチエージェント壁打ち）

**優先度**: ⭐⭐⭐ UX改善

#### 概要
リサーチ設定画面を見た瞬間「手が進まない」問題を解決するため、
最初から対話型で進められるUXを実装してください。
マルチエージェントと対話しながら、段階的にリサーチ設定を完成させます。

#### 作成ファイル
- `src/lib/research/language-assistant.ts` - 言語化支援ロジック
- `src/lib/research/multi-agent-chat.ts` - マルチエージェント対話
- `src/components/research/LanguageChat.tsx` - チャットUI
- `src/components/research/ConversationalSetup.tsx` - 対話型セットアップ
- `src/app/api/research/language-assist/route.ts` - APIエンドポイント

#### コア要件

1. **対話型モード（デフォルト）**
   - リサーチ設定画面を開いた瞬間、AIが挨拶して質問開始
   - 段階的に情報を集める（ジャンル → ターゲット → 悩み → 理想）
   - マルチエージェントが適切な質問を投げかける
   - 対話が完了したら設定を自動反映

2. **マルチエージェント構成**
   - **質問エージェント**: ユーザーに質問を投げかける
   - **整理エージェント**: ユーザーの回答を整理・構造化
   - **提案エージェント**: 具体的なキーワード・フレーズを提案
   - **検証エージェント**: 生成された言語が適切か検証

3. **モデル選択**
   - 対話型支援には**Claude Sonnet**を使用（推論能力 + 共感力）
   - 無料プランではGemini 2.5 Flashで妥協

#### 実装例

```typescript
// src/lib/research/multi-agent-chat.ts

interface AgentRole {
  name: string;
  systemPrompt: string;
  model: string; // Claude Sonnet推奨
}

const AGENTS: AgentRole[] = [
  {
    name: '質問エージェント',
    systemPrompt: `あなたはリサーチ設定の質問エージェントです。
ユーザーがリサーチ設定を進められるよう、段階的に質問を投げかけます。
1つずつ質問し、ユーザーの回答を待ってから次の質問に進んでください。`,
    model: 'anthropic/claude-sonnet-4-20250514',
  },
  {
    name: '整理エージェント',
    systemPrompt: `あなたはリサーチ設定の整理エージェントです。
ユーザーの回答を整理し、構造化されたデータに変換します。
曖昧な表現を具体的なキーワードに変換してください。`,
    model: 'anthropic/claude-sonnet-4-20250514',
  },
  // ... 他のエージェント
];

export async function chatWithAgent(
  agentName: string,
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const agent = AGENTS.find(a => a.name === agentName);
  if (!agent) throw new Error(`Agent ${agentName} not found`);
  
  // モデル選択（Claude Sonnet優先）
  const model = selectOptimalModel({
    taskType: 'conversational_assistance',
    contextLength: conversationHistory.length * 100, // 概算
    userPlan: 'premium',
    hasOpenRouterApiKey: true,
  });
  
  // AI API呼び出し
  // ...
}
```

#### 期待効果
- **「手が進まない」問題の根本解決**: 対話型で自然に進められる
- **リサーチ設定の精度向上**: マルチエージェントで言語化を支援

---

### Task 4: バナーエディター（Novasphere型）

**優先度**: ⭐⭐ Novasphere型微調整

#### 概要
Novasphereのようなバナーエディターを実装してください。
AI生成画像の「あと一歩」を埋めるための、テキスト編集・フォント・色・揃え・PNG出力機能です。

#### 作成ファイル
- `src/lib/editor/banner-editor.ts` - バナーエディターロジック
- `src/components/editor/BannerEditor.tsx` - エディターUI
- `src/lib/editor/text-layer.ts` - テキストレイヤー管理（既存、拡張）

#### コア要件

1. **Canvas編集機能**
   - HTML5 Canvas APIで画像編集
   - テキストレイヤーの追加・編集・削除
   - レイヤー管理（順序変更、表示/非表示）

2. **編集ツールパネル**
   - フォントサイズ調整
   - フォント色選択
   - テキスト揃え（左・中央・右）
   - 影・ストローク設定

3. **日本語フォント40+種**
   - Google Fontsから動的ロード
   - カテゴリ別選択（Gothic、Mincho、Rounded、Design、Handwriting）

4. **出力機能**
   - PNG/JPEGエクスポート
   - 品質設定

#### 実装例

```typescript
// src/lib/editor/banner-editor.ts

interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: 'left' | 'center' | 'right';
  shadow?: {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export function useBannerEditor() {
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  const addTextLayer = (text: string, x: number, y: number) => {
    const newLayer: TextLayer = {
      id: generateId(),
      text,
      x,
      y,
      fontSize: 24,
      fontFamily: 'Noto Sans JP',
      color: '#000000',
      align: 'left',
    };
    setLayers([...layers, newLayer]);
  };
  
  const exportAsImage = (format: 'png' | 'jpeg', quality?: number) => {
    // Canvas APIで画像生成
    // ...
  };
  
  return {
    layers,
    selectedLayerId,
    addTextLayer,
    updateLayer: (id: string, updates: Partial<TextLayer>) => {
      setLayers(layers.map(l => l.id === id ? { ...l, ...updates } : l));
    },
    deleteLayer: (id: string) => {
      setLayers(layers.filter(l => l.id !== id));
    },
    selectLayer: setSelectedLayerId,
    exportAsImage,
  };
}
```

#### 期待効果
- AI生成画像の「あと一歩」を埋める
- デザイナーでなくても完成品が作れる
- 外部ツール（Canva/Figma）への移動が不要に

---

### Task 5: デザインプロンプトジェネレーター（YouTubeサムネイル心理学統合）

**優先度**: ⭐⭐ デザイン支援

#### 概要
デザインプロンプトジェネレーターに、YouTubeサムネイル心理学フレームワークを統合してください。
「YouTubeサムネイル」を選択した場合、自動的にこのフレームワークを適用します。

#### 作成ファイル
- `src/lib/knowledge/youtube_thumbnail_psychology.yaml` - 心理学フレームワーク（既存）
- `src/lib/prompts/design-prompt-generator.ts` - デザインプロンプト生成（更新）

#### コア要件

1. **YouTubeサムネイルカテゴリ追加**
   - カテゴリ: `⭐YouTubeサムネイル（心理学フレームワーク付き）`
   - 選択時に自動的に心理学フレームワークを適用

2. **3つの条件チェックリスト**
   - 条件①: 予測を裏切れているか
   - 条件②: 生存回路を刺激できているか
   - 条件③: 自分ごとになっているか

3. **入力項目**
   - 動画タイトル
   - ターゲット
   - 生存トリガー（脅威・報酬・地位・性）

#### 実装例

```typescript
// src/lib/prompts/design-prompt-generator.ts

import youtubeThumbnailPsychology from '@/lib/knowledge/youtube_thumbnail_psychology.yaml';

export function generateDesignPrompt(
  category: string,
  inputs: Record<string, any>
): string {
  if (category === 'youtube-thumbnail') {
    // YouTubeサムネイル心理学フレームワークを適用
    return generateYouTubeThumbnailPrompt(inputs, youtubeThumbnailPsychology);
  }
  
  // 他のカテゴリの処理
  // ...
}

function generateYouTubeThumbnailPrompt(
  inputs: { title: string; target: string; survivalTrigger: string },
  psychology: typeof youtubeThumbnailPsychology
): string {
  return `
# YouTubeサムネイルデザインプロンプト

## 動画情報
- タイトル: ${inputs.title}
- ターゲット: ${inputs.target}
- 生存トリガー: ${inputs.survivalTrigger}

## 心理学フレームワーク（3つの条件）

### 条件①: 予測を裏切れているか
${psychology.conditions.predictionError.description}

### 条件②: 生存回路を刺激できているか
${psychology.conditions.survivalCircuit.description}
- 選択されたトリガー: ${inputs.survivalTrigger}
${psychology.survivalTriggers[inputs.survivalTrigger]?.examples.join('\n')}

### 条件③: 自分ごとになっているか
${psychology.conditions.selfRelevance.description}

## デザイン指示
上記の3つの条件を満たすサムネイルを生成してください。
特に「${inputs.survivalTrigger}」の生存回路を刺激するデザインにしてください。
`;
}
```

#### 期待効果
- YouTubeサムネイルの心理学フレームワークを自動適用
- 「なんか気になる」サムネイルを生成可能

---

### Task 6: リサーチプロンプト・スキル提供機能

**優先度**: ⭐⭐ ボーナスコンテンツ

#### 概要
リサーチ結果をCursorやClaudeで使える形式でエクスポートする機能を実装してください。

#### 作成ファイル
- `src/lib/research/prompt-generator.ts` - プロンプト生成ロジック
- `src/lib/research/skill-generator.ts` - Claude Skills生成
- `src/components/research/PromptExporter.tsx` - エクスポートUI
- `src/app/api/research/export-prompt/route.ts` - プロンプトエクスポートAPI
- `src/app/api/research/export-skill/route.ts` - スキルエクスポートAPI

#### コア要件

1. **Cursor用プロンプト生成**
   - リサーチ結果を構造化したプロンプト
   - `.md`形式でエクスポート

2. **Claude Skills生成**
   - `.claude/skills/`形式のスキルファイル
   - たけるん式リサーチメソッドスキル

3. **エクスポートUI**
   - リサーチ完了画面に「プロンプト・スキルをダウンロード」ボタン
   - 形式選択（Cursor用/Claude Skills/テンプレート集）

#### 期待効果
- リサーチ結果の活用率向上
- Cursor/Claudeでの作業効率化

---

## 🔧 実装時の注意事項

### 1. 既存コードとの互換性
- 既存のPlaywrightベーススクレイパーは維持
- Crawlee統合は段階的に移行
- 既存のAPIインターフェースを尊重

### 2. エラーハンドリング
- フォールバック機能を実装（失敗時に別のスクレイパー/モデルに切り替え）
- ユーザーフレンドリーなエラーメッセージ

### 3. パフォーマンス
- 大量データ処理時のメモリ管理
- 非同期処理の適切な実装

### 4. セキュリティ
- APIキーは環境変数で管理
- ユーザー入力のサニタイズ

---

## 📚 参考ドキュメント

- `CLAUDE_CODE_IMPLEMENTATION.md` - 詳細な機能仕様
- `docs/research_agent_uchida_spec.md` - たけるん式リサーチ仕様
- `src/lib/knowledge/youtube_thumbnail_psychology.yaml` - YouTubeサムネイル心理学
- `src/lib/research/scrapers/meta-ads.ts` - 既存スクレイパーの実装パターン

---

## ✅ 受け入れ基準

各タスクについて、以下を確認してください：

1. **機能動作**: 仕様通りに動作するか
2. **エラーハンドリング**: 適切なエラー処理が実装されているか
3. **UI/UX**: ユーザーフレンドリーなインターフェースか
4. **パフォーマンス**: レスポンスが適切か
5. **コード品質**: `npm run lint` エラー0
6. **型安全性**: TypeScriptの型エラーがない

---

**作成日**: 2025-12-15  
**バージョン**: 1.0  
**ステータス**: 実装待ち

