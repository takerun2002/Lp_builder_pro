# Claude Code: リサーチUI/UX大幅改善

## 概要
リサーチ画面のUI/UXを改善し、各ステップの結果を可視化する。

## 問題点

1. **悩み収集結果が表示されない** - Yahoo知恵袋・Amazon書籍の結果がログにしか出ない
2. **各ステップの結果が見づらい** - ステップリストはあるが、結果表示パネルがない
3. **プログレス表示が不十分** - 全体進捗%・残り時間が表示されない
4. **Deep Research結果が埋もれる** - 詳細データがあるのに見つけにくい

## 修正タスク

### P0: 必須修正

#### 1. 悩み収集結果パネルの追加
**ファイル**: `src/app/dev/research/page.tsx`

`renderPainCollectionStep`関数を追加:
```tsx
const renderPainCollectionStep = () => (
  <div className="space-y-4">
    <ResearchProgressLog logs={logs} isRunning={isRunning} />
    
    {/* Yahoo知恵袋結果 */}
    {data.chiebukuroResults && data.chiebukuroResults.length > 0 && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Yahoo知恵袋から収集した悩み
            <Badge variant="secondary">{data.chiebukuroResults.length}件</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {data.chiebukuroResults.map((q, i) => (
              <li key={i} className="p-2 bg-muted/50 rounded text-sm">
                <div className="font-medium">{q.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  深刻度: {q.depthScore}/5 | 緊急度: {q.urgencyScore}/5
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )}
    
    {/* Amazon書籍結果 */}
    {data.amazonBooksResults && data.amazonBooksResults.length > 0 && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Book className="w-4 h-4" />
            Amazon書籍から抽出したキーワード
            <Badge variant="secondary">{data.amazonBooksResults.length}件</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {data.amazonBooksResults.map((book, i) => (
              <li key={i} className="p-2 bg-muted/50 rounded text-sm">
                <div className="font-medium">{book.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  ⭐ {book.rating} | {book.reviewCount}件のレビュー
                </div>
                {book.extractedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {book.extractedKeywords.map((kw, j) => (
                      <Badge key={j} variant="outline" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )}
    
    {/* 収集した悩み一覧 */}
    {data.collectedPains.length > 0 && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            収集した悩み・キーワード
            <Badge variant="secondary" className="ml-2">{data.collectedPains.length}件</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.collectedPains.slice(0, 50).map((pain, i) => (
              <Badge key={i} variant="outline">{pain}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
    
    {data.collectedPains.length === 0 && !isRunning && (
      <div className="text-center py-8 text-muted-foreground">
        <p>「実行」をクリックして悩みを収集します</p>
      </div>
    )}
  </div>
);
```

#### 2. ResearchDataに結果保存用フィールド追加
```tsx
interface ResearchData {
  // ... 既存フィールド
  chiebukuroResults?: ChiebukuroResult[];  // 追加
  amazonBooksResults?: AmazonBookResult[];  // 追加
}
```

#### 3. runPainCollectionStepで結果を保存
悩み収集ステップで、収集した結果を`data`に保存する処理を追加。

### P1: プログレス表示改善

#### 新コンポーネント作成
**ファイル**: `src/components/research/ResearchStepper.tsx`

```tsx
interface ResearchStepperProps {
  steps: {
    id: string;
    label: string;
    description: string;
    status: "pending" | "running" | "completed" | "error" | "skipped";
    estimatedTime?: string;
    actualTime?: number;
    resultCount?: number;
  }[];
  currentStepIndex: number;
}

export function ResearchStepper({ steps, currentStepIndex }: ResearchStepperProps) {
  const completedCount = steps.filter(s => s.status === "completed").length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  
  return (
    <div className="space-y-4">
      {/* 全体プログレスバー */}
      <div className="flex items-center gap-4">
        <Progress value={progressPercent} className="flex-1" />
        <span className="text-sm font-medium">{progressPercent}%</span>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{steps.length} 完了
        </span>
      </div>
      
      {/* ステップリスト */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              index === currentStepIndex && "border-primary bg-primary/5",
              step.status === "completed" && "border-green-500/50 bg-green-50/50",
              step.status === "error" && "border-red-500/50 bg-red-50/50"
            )}
          >
            {/* ステータスアイコン */}
            <div className="shrink-0">
              {step.status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {step.status === "running" && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
              {step.status === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
              {step.status === "pending" && <Circle className="w-5 h-5 text-muted-foreground" />}
              {step.status === "skipped" && <SkipForward className="w-5 h-5 text-muted-foreground" />}
            </div>
            
            {/* ステップ情報 */}
            <div className="flex-1 min-w-0">
              <div className="font-medium">{step.label}</div>
              <div className="text-xs text-muted-foreground truncate">{step.description}</div>
            </div>
            
            {/* 結果カウント・時間 */}
            <div className="shrink-0 text-right">
              {step.resultCount !== undefined && (
                <Badge variant="secondary">{step.resultCount}件</Badge>
              )}
              {step.status === "running" && step.estimatedTime && (
                <div className="text-xs text-muted-foreground">〜{step.estimatedTime}</div>
              )}
              {step.actualTime && (
                <div className="text-xs text-muted-foreground">{Math.round(step.actualTime / 1000)}s</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### P2: タブで結果切り替え

各ステップの結果を**タブ**で切り替えられるようにする:

```tsx
<Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
  <TabsList className="grid grid-cols-6">
    <TabsTrigger value="infotop">Infotop</TabsTrigger>
    <TabsTrigger value="pain_collection">悩み収集</TabsTrigger>
    <TabsTrigger value="pain_classification">悩み分類</TabsTrigger>
    <TabsTrigger value="keywords">キーワード</TabsTrigger>
    <TabsTrigger value="deep_research">Deep Research</TabsTrigger>
    <TabsTrigger value="concepts">コンセプト</TabsTrigger>
  </TabsList>
  
  <TabsContent value="infotop">
    {renderInfotopStep()}
  </TabsContent>
  <TabsContent value="pain_collection">
    {renderPainCollectionStep()}
  </TabsContent>
  {/* ... 他のタブ */}
</Tabs>
```

## Deep Research API確認

現在のAPIは`gemini-2.5-pro` + `googleSearch`グラウンディングを使用。
Interactions APIへの移行は別タスクで検討。

### 動作確認ポイント
1. `/api/research/deep`のエンドポイントが正常にレスポンスを返すか
2. `GOOGLE_API_KEY`が設定されているか
3. Gemini 2.5 Proへのアクセス権限があるか

## 完了条件

- [ ] 悩み収集結果（Yahoo知恵袋・Amazon書籍）がUIに表示される
- [ ] 各ステップの進捗が%表示される
- [ ] 完了したステップの結果がタブで閲覧可能
- [ ] Deep Research結果が正しく表示される
- [ ] サーバーログでエラーがないことを確認

## 参考ファイル

- `src/app/dev/research/page.tsx` - メインUI
- `src/lib/research/scrapers/yahoo-chiebukuro.ts` - 知恵袋スクレイパー
- `src/lib/research/scrapers/amazon-books.ts` - Amazon書籍スクレイパー
- `src/components/research/ResearchProgressLog.tsx` - 進行ログ
- `src/app/api/research/deep/route.ts` - Deep Research API
