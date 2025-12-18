# リサーチエージェント実装ガイド

## 🔄 最新アップデート: Interactions API統合

公式ドキュメント（[Interactions API](https://ai.google.dev/gemini-api/docs/interactions)）に基づいて、**Gemini Deep Researchエージェント**を正しく実装しました。

## 実装のポイント

### 1. Deep Researchエージェントの使用

```typescript
// バックグラウンド実行でDeep Researchを開始
const initialInteraction = await client.interactions.create({
  input: prompt,
  agent: "deep-research-pro-preview-12-2025",
  background: true,
});

// 結果をポーリング（10秒間隔、最大5分）
while (attempts < maxAttempts) {
  await new Promise((resolve) => setTimeout(resolve, 10000));
  const interaction = await client.interactions.get(initialInteraction.id);
  
  if (interaction.status === "completed") {
    const textOutput = interaction.outputs?.find((o) => o.type === "text");
    return textOutput?.text;
  }
}
```

### 2. 主な変更点

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| **API** | `client.models.generateContent()` | `client.interactions.create()` |
| **エージェント** | 通常のGeminiモデル | `deep-research-pro-preview-12-2025` |
| **実行方式** | 同期実行 | バックグラウンド実行 + ポーリング |
| **タイムアウト** | なし | 最大5分（30回 × 10秒） |

### 3. エラーハンドリング

- Deep Researchエージェントが失敗した場合、通常の`gemini-2.5-pro`モデルにフォールバック
- タイムアウト時も同様にフォールバック

## 使用方法

### 基本的な使い方

```typescript
import { runResearch } from "@/lib/research/orchestrator";

const context: ResearchContext = {
  projectName: "美容LP",
  genre: "beauty",
  target: {
    ageGroups: ["30s", "40s"],
    gender: "female",
    problems: "シミ・シワの悩み",
    desires: "若々しい肌",
  },
  toneManner: {
    moods: ["trust", "professional"],
  },
  searchConfig: {
    regions: ["japan"],
    period: "6months",
    sources: ["infotop", "competitor"],
  },
};

const result = await runResearch(context);
```

### 進捗監視

```typescript
const result = await runResearch(context, {
  onProgress: (progress) => {
    console.log(`進捗: ${progress.overallPercent}%`);
    console.log(`現在のステップ: ${progress.currentStep}`);
  },
});
```

## アーキテクチャ

```
ユーザー入力
    ↓
[オーケストレーター]
    ↓
[並列実行]
├─ Infotop分析（Firecrawl）
├─ 競合LP分析（Firecrawl）
└─ Deep Research（Gemini Interactions API）
    ├─ バックグラウンド実行開始
    ├─ ポーリング（10秒間隔）
    └─ 結果取得
    ↓
[結果統合 & 提案生成]
    ↓
構成・コピー・デザイン提案
```

## パフォーマンス

- **Deep Research**: 通常3-10分（バックグラウンド実行）
- **Infotop分析**: 2-5秒
- **競合LP分析**: 5-15秒
- **全体**: 約30秒〜10分（Deep Researchの完了を待つ）

## 注意事項

1. **APIキー**: `GOOGLE_API_KEY`環境変数が必要
2. **Firecrawl API**: `FIRECRAWL_API_KEY`があるとより精度の高いスクレイピングが可能（オプション）
3. **タイムアウト**: Deep Researchは最大5分待機します
4. **コスト**: Deep Researchは1レポートあたり約$0.20-$1.00

## トラブルシューティング

### Deep Researchがタイムアウトする場合

- プロンプトを短くする
- より具体的な質問にする
- フォールバックが自動的に動作します

### エラー: "Missing GOOGLE_API_KEY"

- `.env.local`に`GOOGLE_API_KEY`を設定
- または`/settings`ページでAPIキーを保存

### 結果が空の場合

- フォールバックが動作しているか確認
- プロンプトが適切か確認
- ログを確認（`[orchestrator]`プレフィックス）

## 参考リンク

- [Interactions API公式ドキュメント](https://ai.google.dev/gemini-api/docs/interactions)
- [Deep Researchガイド](https://ai.google.dev/gemini-api/docs/deep-research)
- [設計書](./research_agent_design.md)


