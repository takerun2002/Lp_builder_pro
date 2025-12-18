# Claude Code 追加指示: RAG+CAG実装の修正

## 🚨 緊急修正

### 修正1: DocumentSource型エラー

**ファイル**: `src/lib/research/orchestrator.ts` 751行目

```typescript
// ❌ 現在（型エラー）
dynamicSources: ["research_result", "competitor_analysis"],

// ✅ 修正後
dynamicSources: ["research_result", "competitor_lp"],
```

**理由**: `DocumentSource` 型に `"competitor_analysis"` は存在しない。正しくは `"competitor_lp"`。

---

## 📋 追加統合タスク

### タスク1: `synthesizeResults()` にもhybridGenerateを統合

**ファイル**: `src/lib/research/orchestrator.ts`

`synthesizeResults()` 関数を見つけて、`hybridGenerate()` を使用するように修正。

```typescript
async function synthesizeResults(
  context: ResearchContext,
  result: EnhancedResearchResult
): Promise<ResearchSynthesis> {
  const prompt = buildSynthesisPrompt(context, result);

  // hybridGenerate()を使用
  const hybridResult = await hybridGenerate({
    prompt,
    projectId: result.id,
    useCache: true,
    dynamicSources: ["research_result", "competitor_lp"],
    includeN1: true,
    maxDynamicTokens: 3000,
  });

  const text = hybridResult.text || "";
  // ... JSONパース処理 ...
}
```

### タスク2: エラーハンドリング強化

`hybridGenerate()` が失敗した場合のフォールバックを追加：

```typescript
async function generateProposals(...) {
  try {
    // hybridGenerate()を使用
    const hybridResult = await hybridGenerate({...});
    // ...
  } catch (hybridError) {
    console.warn("[orchestrator] hybridGenerate failed, falling back to direct API:", hybridError);
    
    // フォールバック: Gemini APIを直接使用
    const client = getGeminiClient();
    const response = await client.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    // ...
  }
}
```

---

## ✅ チェックリスト

- [ ] `dynamicSources` の `"competitor_analysis"` を `"competitor_lp"` に修正
- [ ] `synthesizeResults()` に `hybridGenerate()` を統合
- [ ] エラーハンドリング（フォールバック）を追加
- [ ] TypeScriptビルドが通ることを確認 (`npm run build`)

---

## 🧪 動作確認

修正後、以下を確認：

1. リサーチ実行時にエラーが出ないこと
2. コンソールに `hybridGenerate completed:` ログが出ること
3. コスト削減効果がUIに表示されること

