# Claude Code 指示書: リサーチエージェント フロントエンドUI改善

## 📋 概要

LP Builder Proのリサーチエージェント機能において、ユーザーが**視覚的に情報を確認できる**UIを実装してください。

## 🎯 改善目標

1. **進行状況の可視化** - 何が起きているかリアルタイムで見える
2. **発見したLPの一覧表示** - URLをコピー・確認できる
3. **リサーチ結果のエクスポート** - Markdown/JSON形式で残せる
4. **お任せモード** - 最小限の入力で開始できる

---

## 📁 対象ファイル

```
src/
├── app/dev/research/page.tsx          # メインページ（実装済み）
├── components/research/
│   ├── ResearchProgressLog.tsx        # 進行ログ（実装済み）
│   ├── ResearchWizard.tsx             # ウィザードUI
│   ├── CompetitorCard.tsx             # 競合LP表示カード
│   ├── PainPointMatrix.tsx            # 悩み分類マトリクス
│   ├── KeywordBank.tsx                # キーワードバンク
│   └── ConceptCard.tsx                # コンセプトカード
└── lib/research/
    ├── types.ts                       # 型定義
    └── orchestrator.ts                # リサーチオーケストレーター
```

---

## 🔧 実装タスク

### タスク1: 進行状況ログの強化

**目的**: リサーチ中に何が起きているかをリアルタイムで表示

**ファイル**: `src/components/research/ResearchProgressLog.tsx`

```typescript
// 必要な機能
interface LogEntry {
  id: string;
  timestamp: Date;
  type: "info" | "success" | "warning" | "error" | "url" | "progress";
  message: string;
  data?: {
    url?: string;       // 発見したURL
    title?: string;     // ページタイトル
    count?: number;     // 件数
    details?: string;   // 詳細情報
  };
}

// UI要件
// 1. ログはリアルタイムで追加される
// 2. 自動スクロールで最新ログが見える
// 3. URLはクリックで新しいタブで開ける
// 4. Markdownでコピー/ダウンロード可能
// 5. 折りたたみ可能
```

**表示例**:
```
┌─────────────────────────────────────────────────────────┐
│ 📝 進行ログ                              ⏳ 実行中    │
│                                    [コピー] [ダウンロード]│
├─────────────────────────────────────────────────────────┤
│ [10:30:15] ℹ️ 🔍 競合LP検索を開始します...              │
│ [10:30:20] ℹ️ Google検索で競合LPを収集中...            │
│ [10:30:35] ✅ 8件の競合LPを発見しました                 │
│ [10:30:36] 🔗 LP 1: ダイエットサプリ完全ガイド         │
│            → https://example1.com/diet-supplement       │
│ [10:30:36] 🔗 LP 2: 美容液の効果を徹底検証             │
│            → https://example2.com/beauty-serum          │
│ [10:30:37] 🔗 LP 3: 健康食品専門店                     │
│            → https://example3.com/health-food           │
│ ...                                                     │
│ [10:31:00] ✅ 競合分析ステップ完了                      │
└─────────────────────────────────────────────────────────┘
```

### タスク2: 発見したLP一覧パネル

**目的**: 発見した競合LPのURLを一覧で確認・コピーできる

**ファイル**: `src/components/research/ResearchProgressLog.tsx` 内の `DiscoveredUrls` コンポーネント

```typescript
interface DiscoveredUrlsProps {
  urls: {
    url: string;
    title?: string;
    domain?: string;
  }[];
  onOpenUrl?: (url: string) => void;
}

// UI要件
// 1. 発見件数をバッジで表示
// 2. 各URLに「開く」ボタン
// 3. 「URLのみコピー」ボタン（1行1URL形式）
// 4. 「Markdownでコピー」ボタン（リンク形式）
// 5. スクロール可能（多い場合）
```

**表示例**:
```
┌─────────────────────────────────────────────────────────┐
│ 🔗 発見したLP一覧                              [8件]   │
│                              [URLのみコピー] [Markdown]│
├─────────────────────────────────────────────────────────┤
│ 1. ダイエットサプリ完全ガイド           [🔗 開く]     │
│    example1.com                                         │
│ 2. 美容液の効果を徹底検証               [🔗 開く]     │
│    example2.com                                         │
│ 3. 健康食品専門店                       [🔗 開く]     │
│    example3.com                                         │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

### タスク3: Markdownエクスポート機能

**目的**: リサーチ結果を一元的にドキュメント化

**ファイル**: `src/app/dev/research/page.tsx`

```typescript
// Markdown生成関数
const generateMarkdown = (): string => {
  const lines: string[] = [];
  
  // ヘッダー
  lines.push("# リサーチ結果レポート");
  lines.push(`生成日時: ${new Date().toLocaleString("ja-JP")}`);
  lines.push("---");
  
  // 設定情報
  lines.push("## 📋 リサーチ設定");
  lines.push(`- **ジャンル**: ${data.context.genre}`);
  lines.push(`- **ターゲット**: ${data.context.target.ageGroups.join(", ")}`);
  
  // 発見したLP一覧
  lines.push("## 🔗 発見した競合LP一覧");
  data.competitors.forEach((c, i) => {
    lines.push(`### ${i + 1}. ${c.concept || "コンセプト未検出"}`);
    lines.push(`- **URL**: ${c.url}`);
    lines.push(`- **ターゲットの痛み**: ${c.targetPain}`);
    lines.push(`- **パワーワード**: ${c.powerWords.join(", ")}`);
  });
  
  // 悩み分類
  lines.push("## 😢 悩み・課題の分類");
  // ...
  
  // キーワード
  lines.push("## 🔑 キーワードランキング");
  lines.push("| 順位 | キーワード | スコア |");
  lines.push("|------|------------|--------|");
  // ...
  
  // コンセプト
  lines.push("## 💡 生成されたコンセプト");
  // ...
  
  // 進行ログ
  lines.push("## 📝 進行ログ");
  // ...
  
  return lines.join("\n");
};
```

**出力例（Markdown）**:
```markdown
# リサーチ結果レポート

生成日時: 2024/12/14 10:30:00

---

## 📋 リサーチ設定
- **ジャンル**: 美容・コスメ
- **サブジャンル**: ダイエット
- **ターゲット年齢**: 30代, 40代
- **性別**: 女性

## 🔗 発見した競合LP一覧

### 1. 話題のダイエットサプリ
- **URL**: https://example.com/diet
- **ターゲットの痛み**: 何をしても痩せない悩み
- **ベネフィット**: 1ヶ月で-5kg
- **パワーワード**: 驚異の, 今だけ, 限定, 話題沸騰

### 2. 美容液販売ページ
...

## 😢 悩み・課題の分類

### 1. 体型への不満
- **深刻度**: 9/10
- **頻度**: 8/10
- **キーワード**: 痩せたい, ダイエット, 体重

## 🔑 キーワードランキング
| 順位 | キーワード | スコア |
|------|------------|--------|
| 1 | 驚異の | 95.5 |
| 2 | 今だけ | 92.3 |
| 3 | 限定 | 89.1 |

## 💡 生成されたコンセプト

### コンセプト 1
**たった30日で理想のボディラインを手に入れる**

*無理な食事制限なし、運動なしで-5kg*

- **狙う痛み**: 何をしても痩せない
- **独自価値**: 科学的根拠に基づいた成分配合
```

### タスク4: お任せモードUI

**目的**: 最小限の入力でリサーチを開始できる

**ファイル**: `src/app/dev/research/page.tsx`

```typescript
// 状態管理
const [isAutoMode, setIsAutoMode] = useState(true);  // デフォルトON
const [showAdvanced, setShowAdvanced] = useState(false);

// お任せモード時の必須項目
// 1. ジャンル選択
// 2. 年齢層選択
// 3. 性別選択
// 4. トンマナ選択

// 詳細設定（任意・折りたたみ）
// - N1情報
// - 悩み・課題（仮説）
// - 理想の状態（仮説）
// - LF8選択
```

**UI構成**:
```
┌─────────────────────────────────────────────────────────┐
│ ✨ お任せモード                              [ON/OFF] │
│ 最小限の設定でAIがリサーチ。悩み・課題は自動発見      │
└─────────────────────────────────────────────────────────┘

■ 基本設定
┌─────────────────────────────────────────────────────────┐
│ ジャンル: [美容] [健康] [教育] [ビジネス] ...          │
│ サブジャンル: [____________]                           │
│                                                         │
│ ターゲット年齢: ☑️20代 ☑️30代 ☑️40代 □50代 □60代+    │
│ 性別: ○女性 ○男性 ○両方                              │
│                                                         │
│ トンマナ: ☑️信頼感 ☑️プロフェッショナル □親しみ ...   │
└─────────────────────────────────────────────────────────┘

▼ 詳細設定（任意）N1やインサイトが既に分かっている場合
┌─────────────────────────────────────────────────────────┐
│ 👤 N1情報（任意）                                      │
│ [既にN1がわかっている場合に入力...]                    │
│                                                         │
│ 悩み・課題（任意）        理想の状態（任意）           │
│ [仮説として...]           [仮説として...]               │
│                                                         │
│ ⚡ LF8 - 根源的欲求（任意）                            │
│ [❤️生存] [🍽️食] [🛡️恐怖] [💕性的] [🏠快適] ...        │
└─────────────────────────────────────────────────────────┘

[リサーチ開始]
```

### タスク5: 競合LP分析結果の視覚化強化

**目的**: 競合LPの分析結果を見やすく表示

**ファイル**: `src/components/research/CompetitorCard.tsx`

**改善ポイント**:
```typescript
// 1. サムネイル表示（可能であれば）
// 2. コンセプトを大きく表示
// 3. パワーワードをタグ形式で表示（クリックでコピー）
// 4. URLをドメイン名で表示 + 外部リンクボタン
// 5. 詳細は折りたたみ式

// カード表示例
<Card>
  <CardHeader>
    <div className="flex gap-4">
      {/* サムネイル */}
      <div className="w-24 h-16 bg-muted rounded overflow-hidden">
        <img src={thumbnail} alt="" />
      </div>
      
      {/* コンセプト */}
      <div>
        <CardTitle>話題のダイエットサプリ</CardTitle>
        <Badge variant="outline">example.com</Badge>
        <Button size="sm"><ExternalLink /></Button>
      </div>
    </div>
  </CardHeader>
  
  <CardContent>
    {/* ターゲットの痛み & ベネフィット */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>ターゲットの痛み</Label>
        <p>何をしても痩せない悩み</p>
      </div>
      <div>
        <Label>ベネフィット</Label>
        <p>1ヶ月で-5kg達成</p>
      </div>
    </div>
    
    {/* パワーワード */}
    <div className="flex flex-wrap gap-1">
      <Badge onClick={() => copy("驚異の")}>驚異の</Badge>
      <Badge onClick={() => copy("今だけ")}>今だけ</Badge>
      <Badge onClick={() => copy("限定")}>限定</Badge>
    </div>
    
    {/* 詳細（折りたたみ） */}
    <Collapsible>
      <CollapsibleTrigger>詳細を表示</CollapsibleTrigger>
      <CollapsibleContent>
        {/* 価格、保証、緊急性戦術など */}
      </CollapsibleContent>
    </Collapsible>
  </CardContent>
</Card>
```

---

## 🎨 デザインガイドライン

### カラー

```css
/* ログタイプ別カラー */
.log-info     { color: hsl(var(--muted-foreground)); }
.log-success  { color: hsl(142 76% 36%); }  /* green-600 */
.log-warning  { color: hsl(45 93% 47%);  }  /* yellow-600 */
.log-error    { color: hsl(0 84% 60%);   }  /* red-500 */
.log-url      { color: hsl(217 91% 60%); }  /* blue-500 */
.log-progress { color: hsl(271 91% 65%); }  /* purple-500 */
```

### アイコン

```typescript
// 使用するLucideアイコン
import {
  CheckCircle2,     // 成功
  AlertCircle,      // 警告/エラー
  Loader2,          // 読み込み中
  ExternalLink,     // 外部リンク
  Copy,             // コピー
  Download,         // ダウンロード
  FileText,         // Markdown
  ChevronDown,      // 折りたたみ
  ChevronUp,        // 展開
  Sparkles,         // お任せモード
  User,             // N1情報
  Zap,              // LF8
} from "lucide-react";
```

### コンポーネント

```typescript
// shadcn/ui コンポーネントを使用
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
```

---

## ✅ 実装チェックリスト

### フェーズ1: 進行状況可視化（優先度：高）
- [x] `ResearchProgressLog` コンポーネント作成
- [x] リアルタイムログ追加機能
- [x] 自動スクロール
- [x] ログのMarkdownコピー機能
- [x] 競合分析ステップにログ表示を追加

### フェーズ2: URL一覧表示（優先度：高）
- [x] `DiscoveredUrls` コンポーネント作成
- [x] URLコピー（プレーン形式）
- [x] URLコピー（Markdown形式）
- [x] 外部リンクボタン

### フェーズ3: エクスポート機能（優先度：高）
- [x] Markdown生成関数 `generateMarkdown()`
- [x] Markdownダウンロード機能
- [x] JSONエクスポート（既存）

### フェーズ4: お任せモード（優先度：中）
- [x] `isAutoMode` 状態管理
- [x] 基本設定/詳細設定の分離
- [x] 詳細設定の折りたたみUI
- [x] LF8選択UI

### フェーズ5: 競合LP表示強化（優先度：中）
- [ ] サムネイル表示（OGP画像取得）
- [x] パワーワードのクリックコピー
- [x] 詳細情報の折りたたみ

### フェーズ6: 追加改善（優先度：低）
- [ ] ダークモード対応確認
- [ ] モバイルレスポンシブ確認
- [ ] アニメーション追加（ログ追加時など）
- [ ] キーボードショートカット

---

## 🧪 テスト方法

```bash
# 開発サーバー起動
npm run dev

# リサーチページにアクセス
open http://localhost:3000/dev/research
```

### テストシナリオ

1. **お任せモードでリサーチ開始**
   - ジャンル・年齢・性別のみ設定
   - 「リサーチ開始」をクリック
   - 進行ログがリアルタイムで表示されることを確認

2. **発見したLP確認**
   - 競合分析完了後、URL一覧が表示されることを確認
   - 「URLのみコピー」でクリップボードに1行1URL形式でコピー
   - 「Markdown」でリンク形式でコピー

3. **Markdownエクスポート**
   - リサーチ完了後、「Markdown」ボタンをクリック
   - ダウンロードされたファイルを確認
   - 全セクション（設定、LP一覧、悩み、キーワード、コンセプト、ログ）が含まれていることを確認

---

## 📝 注意事項

1. **パフォーマンス**: ログが大量になる場合、仮想スクロールを検討
2. **エラーハンドリング**: 各APIコール失敗時にログにエラーを記録
3. **状態管理**: ログは`useState`で管理、必要に応じてZustandに移行
4. **アクセシビリティ**: スクリーンリーダー対応、キーボード操作対応

---

## 📚 参考ファイル

- 既存実装: `src/app/dev/research/page.tsx`
- ログコンポーネント: `src/components/research/ResearchProgressLog.tsx`
- 型定義: `src/lib/research/types.ts`
- デザインシステム: `src/components/ui/`

