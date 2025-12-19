# LP Builder Pro コピーライティング実装設計

参照:
- docs/LP_COPYWRITING_FRAMEWORK.md
- docs/CODEX_LP_COPYWRITING_IMPLEMENTATION.md

目的:
1) Deep Research APIプロンプトの最終版設計
2) concept-generator 統合設計（ムーブメント7要素 / ストーリー7型）
3) copy-diagnosis 機能設計（50点評価 / ディテール強化）

---

## 1. Deep Research APIプロンプトの最終版

### 1.1 buildPrompt 最終版（日本市場特化 / JSON専用）

設計方針:
- 日本市場の文脈（価格帯、商習慣、購買心理）を明示
- 出力はJSONのみ（Markdown禁止）
- 引用は日本語ソース中心（.jpや日本語ページ優先）
- 既存 DeepResearchResult と整合しつつ拡張可能なJSON

```text
あなたはLP（ランディングページ）とセールスコピーの専門家です。
日本市場向けにWeb調査を行い、必ずJSONのみで出力してください。Markdownは禁止です。

【案件情報】
ジャンル: {{genreLabel}}
サブジャンル: {{subGenre}}
ターゲット: {{targetSummary}}
悩み: {{problems}}
理想: {{desires}}
トンマナ: {{moods}}
追加情報: {{freeText}}

【必須テーマ】
1) ターゲット心理分析
  - 信念移転（現状の信念→望ましい信念）
  - 損失回避バイアス（行動しない損失）
  - AIDAごとの心理障壁
2) 競合LP分析
  - 共通構成 / コピー型
  - 業界の闇・不都合な真実
  - 共通の敵の候補
3) N1ペルソナ生成
  - アトラクティブキャラクター4要素（バックストーリー/パラブル/欠点/ポラリティ）

【日本市場条件】
- 価格帯・相場は日本円を基準に推定
- 引用は日本語ソース中心（.jp優先）
- 可能なら日本の事例や市場データを優先

【出力形式(JSONのみ)】
{
  "trendReport": "string",
  "marketAnalysis": "string",
  "psychologyInsights": "string",
  "recommendations": ["string"],
  "citations": [
    {"title": "string", "url": "https://...", "snippet": "string"}
  ],
  "beliefTransfer": {
    "currentBeliefs": ["string"],
    "desiredBeliefs": ["string"],
    "bridgeLogic": ["string"]
  },
  "lossAversion": {
    "doNothingRisks": ["string"],
    "timeLossExamples": ["string"],
    "opportunityCosts": ["string"]
  },
  "aidaInsights": {
    "attention": ["string"],
    "interest": ["string"],
    "desire": ["string"],
    "action": ["string"]
  },
  "competitorAnalysis": {
    "commonStructure": ["string"],
    "headlinePatterns": ["string"],
    "ctaPatterns": ["string"],
    "industryDarkness": ["string"],
    "commonEnemyCandidates": ["string"]
  },
  "persona": {
    "name": "string",
    "age": 0,
    "occupation": "string",
    "context": "string",
    "painQuotes": ["string"],
    "desireQuotes": ["string"],
    "triggers": ["string"],
    "hesitations": ["string"],
    "attractiveCharacter": {
      "backstory": "string",
      "parable": "string",
      "flaw": "string",
      "polarity": "string"
    }
  }
}

【必須ルール】
- JSON以外は出力しない
- 未確定な項目は空文字 / 空配列で返す
- citationsはhttps URLのみ
```

### 1.2 buildPrompt の置換ロジック

変数の組み立て:
- genreLabel: `GENRE_LABELS[context.genre]`
- targetSummary: `ageGroups + gender + occupation`
- moods: `toneManner.moods` の日本語ラベル化
- problems/desires が空なら「未指定（調査で発見）」

### 1.3 エラーハンドリング設計

- JSONパース失敗時は fenced json 抽出 → trim → parse
- `citations` が空の場合は grounding metadata を補完
- 追加フィールドは optional 扱いにして既存UIを壊さない

---

## 2. concept-generator 統合設計

### 2.1 型定義の拡張

```ts
export type StoryType =
  | "hero_journey"
  | "last_piece"
  | "future_prediction"
  | "origin_return"
  | "industry_darkness"
  | "mystery_solving"
  | "evangelist";

export interface ConceptGeneratorInput {
  // 既存フィールド...

  movement?: {
    vision?: string;
    manifesto?: string;
    commonEnemy?: string;
    slogan?: string;
    attractiveCharacter?: {
      backstory?: string;
      parable?: string;
      flaw?: string;
      polarity?: string;
    };
    story?: string; // movement 7要素の「ストーリー」
  };

  storyType?: StoryType;          // ユーザー指定
  recommendedStoryType?: StoryType; // 自動推薦
}
```

### 2.2 ストーリー7型の自動推薦ロジック

判定ルール（優先度順）:
1) 既に努力しているが結果が出ない → last_piece  
   - 指標: painPointsに「頑張っている」「試した」「努力した」系が多い
2) 時代変化や危機感が強い → future_prediction  
   - 指標: painPoints/keywordsに「今後」「時代」「淘汰」「AI」「将来」
3) 原点回帰が刺さる → origin_return  
   - 指標: 「本来」「自然」「伝統」「オーガニック」
4) 業界不信・不正への怒り → industry_darkness  
   - 指標: competitorAnalysis.industryDarkness, commonEnemyCandidates
5) 原因不明の混乱 → mystery_solving  
   - 指標: 「なぜ」「原因不明」「わからない」
6) 権威者の弟子・代弁 → evangelist  
   - 指標: 強い師匠/監修/権威が訴求軸
7) その他は hero_journey

擬似コード:
```ts
function recommendStoryType(input: ConceptGeneratorInput): StoryType {
  if (hasEffortNoResult(input)) return "last_piece";
  if (hasFutureAnxiety(input)) return "future_prediction";
  if (hasOriginReturnKeywords(input)) return "origin_return";
  if (hasIndustryDarkness(input)) return "industry_darkness";
  if (hasMysterySymptoms(input)) return "mystery_solving";
  if (hasAuthorityMentor(input)) return "evangelist";
  return "hero_journey";
}
```

### 2.3 buildConceptPrompt の拡張設計

- 既存のたけるん式6ステップに加え、ムーブメント7要素を埋め込む
- `storyType` を指定し、構成のストーリー型を固定
- `commonEnemy` と `slogan` をヘッドライン候補に反映

### 2.4 UI入力フィールド設計（提案）

配置案:
- 既存フォームに「コンセプト拡張」セクション追加

入力項目:
- ムーブメント7要素
  - ビジョン / マニフェスト / 共通の敵 / スローガン
  - アトラクティブキャラクター: バックストーリー / パラブル / 欠点 / ポラリティ
  - ストーリー（自由入力）
- ストーリー型
  - 「自動推薦」トグル
  - 推薦結果の表示（バッジ）
  - 手動選択ドロップダウン

---

## 3. copy-diagnosis 機能設計

### 3.1 50点満点評価の採点ロジック

評価項目（各0-10点）:
- 論理性
- 独自性
- 読みやすさ
- 感情インパクト
- 目的達成度

設計:
1) AIスコアリング（各項目0-10）
2) ルールベース微調整
   - 数字/根拠/CTAの欠如で減点
3) 合計 = 50点満点

ランク基準:
- S: 45-50
- A: 40-44
- B: 32-39
- C: 25-31
- D: 0-24

### 3.2 ディテール強化チェックリスト

```ts
export interface DetailEnhancementChecklist {
  hasNumbers: boolean;
  hasTargetClarity: boolean;
  hasBeliefBridge: boolean;
  hasLossAversion: boolean;
  hasCommonEnemy: boolean;
  hasN1Language: boolean;
  hasEvidence: boolean;
  hasCounterArgument: boolean;
  hasClearCTA: boolean;
  hasReducedAbstraction: boolean;
}
```

判定例（ルールベース）:
- hasNumbers: /\d+/.test(text)
- hasLossAversion: /損|失う|手遅れ|後悔/.test(text)
- hasClearCTA: /今すぐ|申し込む|無料|体験|登録/.test(text)
- hasEvidence: /実績|データ|研究|監修|満足度|保証/.test(text)

### 3.3 改善提案生成

アルゴリズム:
- checklistで false の項目に対して定型改善提案
- qualityScore が低い項目に対して AI改善提案を生成
- 改善案は「現状 → 修正案 → 例文」形式

改善提案テンプレ例:
- hasNumbers=false → 「具体的な数値を1つ挿入してください」
- hasCommonEnemy=false → 「共通の敵 or 共同目標を1つ設定してください」

---

## 4. 実装マッピング

### Deep Research
- 変更: `src/app/api/research/deep/route.ts`
  - buildPrompt を上記テンプレに差し替え
  - parseResult を拡張（beliefTransfer等の追加フィールドを許可）

### concept-generator
- 変更: `src/lib/research/concept-generator.ts`
  - ConceptGeneratorInput 拡張
  - recommendStoryType 実装
  - buildConceptPrompt の拡張
- 変更: `src/app/api/research/concept/route.ts`
  - 入力検証に movement/storyType を追加
- UI提案: `src/app/dev/research/page.tsx` に拡張フォーム

### copy-diagnosis
- 変更: `src/lib/copywriting/copy-diagnosis.ts`
  - qualityScore / detailEnhancement / improvementSuggestions を追加
- 変更: `src/app/api/copy-diagnosis/route.ts`
  - 新フィールドを返却
