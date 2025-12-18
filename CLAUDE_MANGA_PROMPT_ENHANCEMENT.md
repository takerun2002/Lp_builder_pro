# 漫画生成：デフォルトプロンプトの年齢制御強化

## 問題
- ユーザーが抽象度の高い指示（例：「子供と大人が会話している」）を出しても、年齢が適切に区別されない
- デフォルトで組み込まれるプロンプトが年齢制御に弱い
- 「子供も一緒に老けた」という問題が発生

## 解決方針
**デフォルトプロンプトに、年齢制御を強力に組み込む**
- ユーザーのプロンプトから年齢キーワードを自動検出
- 検出した場合も、しなくても、常に「年齢を適切に区別する」という強力な指示を組み込む
- 抽象度の高い指示でも、AIが適切に年齢を推測・維持できるようにする

---

## 修正内容

### ファイル: `src/app/api/generate/manga/route.ts`

### 1) 年齢キーワード検出関数を追加（行75あたり、validateRefImage関数の後）

```typescript
/**
 * プロンプトから年齢関連キーワードを検出し、年齢制御の指示を生成
 * 抽象度の高い指示でも、年齢を適切に区別できるようにする
 */
function buildAgeControlInstruction(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  // 年齢キーワードパターン
  const childKeywords = ["子供", "子ども", "こども", "幼児", "小学生", "少年", "少女", "男の子", "女の子", "kid", "child", "children", "boy", "girl"];
  const teenKeywords = ["中学生", "中高生", "ティーン", "teen", "teenager"];
  const adultKeywords = ["大人", "成人", "女性", "男性", "お母さん", "お父さん", "母親", "父親", "adult", "woman", "man", "mother", "father", "mom", "dad"];
  const elderlyKeywords = ["おばあちゃん", "おじいちゃん", "高齢", "elderly", "grandmother", "grandfather", "grandma", "grandpa"];
  
  // キーワード検出
  const hasChild = childKeywords.some(k => lowerPrompt.includes(k.toLowerCase()) || prompt.includes(k));
  const hasTeen = teenKeywords.some(k => lowerPrompt.includes(k.toLowerCase()) || prompt.includes(k));
  const hasAdult = adultKeywords.some(k => lowerPrompt.includes(k.toLowerCase()) || prompt.includes(k));
  const hasElderly = elderlyKeywords.some(k => lowerPrompt.includes(k.toLowerCase()) || prompt.includes(k));
  
  // 検出された年齢層をリスト化
  const detectedAges: string[] = [];
  if (hasChild) detectedAges.push("子供（5-12歳）");
  if (hasTeen) detectedAges.push("中高生（13-17歳）");
  if (hasAdult) detectedAges.push("大人（25-45歳）");
  if (hasElderly) detectedAges.push("高齢者（60-80歳）");
  
  // 年齢制御指示を構築
  let instruction = `【キャラクター年齢の厳密な制御（最重要）】

`;
  
  if (detectedAges.length > 0) {
    instruction += `【検出された年齢層】
${detectedAges.map((age, i) => `- ${age}`).join("\n")}

【年齢制御の絶対ルール】
1. **年齢の混同は絶対に禁止** - 子供は子供らしく、大人は大人らしく描く
2. **顔立ちの違い**:
   - 子供（5-12歳）: 丸顔、大きな目、短い鼻、柔らかい輪郭、身長は大人の半分〜2/3程度
   - 中高生（13-17歳）: やや大人寄りだが、まだ幼さが残る、身長は大人の3/4〜9/10程度
   - 大人（25-45歳）: しっかりした輪郭、大人らしい顔立ち、標準的な身長
   - 高齢者（60-80歳）: しわ、白髪、やや縮んだ身長
3. **体の大きさ・プロポーション**:
   - 子供と大人が同じシーンにいる場合、身長差を明確に（子供は大人の腰〜胸の高さ程度）
   - 頭身比: 子供は3-4頭身、大人は6-7頭身
4. **表情・仕草**:
   - 子供: 無邪気、活発、表情が豊か
   - 大人: 落ち着いた表情、大人らしい仕草
5. **同じシーン内での年齢差**:
   - 複数の年齢層が登場する場合、年齢差が一目で分かるように描く
   - 子供が老けて見える、大人が幼く見える、ということは絶対に避ける

`;
  } else {
    // 年齢キーワードが検出されない場合でも、年齢制御の重要性を強調
    instruction += `【年齢制御の基本原則】
ユーザーのプロンプトに年齢に関する記述がある場合、その年齢を厳密に守ってください。
年齢が明示されていない場合でも、文脈から適切な年齢を推測し、一貫性を保ってください。

【年齢の区別ルール】
- 子供は子供らしい顔立ち・体の大きさで描く（丸顔、大きな目、短い鼻、身長は大人の半分〜2/3）
- 大人は大人らしい顔立ち・体の大きさで描く（しっかりした輪郭、標準的な身長）
- 子供と大人が同じシーンにいる場合、年齢差が明確に見えるように描く
- 年齢の混同（子供が老けて見える、大人が幼く見える）は絶対に避ける

`;
  }
  
  instruction += `【キャラクター参照画像がある場合】
- 参照画像の年齢を正確に維持してください
- 参照画像が子供なら子供として、大人なら大人として描いてください
- 参照画像の年齢と、プロンプトの年齢指定が矛盾する場合は、参照画像の年齢を優先してください

【最終確認】
生成前に、すべてのキャラクターの年齢が適切に区別されているか確認してください。
年齢の混同がないことを最優先で確認してください。`;

  return instruction;
}
```

### 2) プロンプト構築部分を修正（行121-147あたり）

**変更前:**
```typescript
const charRefInstruction = validCharRefs.length > 0
  ? `【キャラクター参照】添付のキャラクター参照画像（${validCharRefs.length}枚）を元に、キャラクターの顔や特徴を忠実に再現してください。`
  : "";

const fullPrompt = `あなたは漫画・イラスト生成の専門家です。以下の指示に従って高品質な漫画イラストを生成してください。

${stylePrompt}

${colorInstruction}
${aspectInstruction}
${charRefInstruction}

【ユーザーの指示】
${prompt}

【重要】
- 高品質な漫画/アニメスタイルで描画
- 日本の漫画の表現技法を活用
- プロフェッショナルな仕上がり`;
```

**変更後:**
```typescript
const charRefInstruction = validCharRefs.length > 0
  ? `【キャラクター参照】添付のキャラクター参照画像（${validCharRefs.length}枚）を元に、キャラクターの顔や特徴を忠実に再現してください。
特に、参照画像の年齢を正確に維持してください。参照画像が子供なら子供として、大人なら大人として描いてください。`
  : "";

// 年齢制御の強力な指示を構築（デフォルトで組み込む）
const ageControlInstruction = buildAgeControlInstruction(prompt);

const fullPrompt = `あなたは漫画・イラスト生成の専門家です。以下の指示に従って高品質な漫画イラストを生成してください。

${stylePrompt}

${colorInstruction}
${aspectInstruction}
${charRefInstruction}

${ageControlInstruction}

【ユーザーの指示】
${prompt}

【重要】
- 高品質な漫画/アニメスタイルで描画
- 日本の漫画の表現技法を活用
- **キャラクターの年齢を厳密に守る（最重要・最優先）**
- 年齢の混同は絶対に避ける
- プロフェッショナルな仕上がり`;
```

---

## 受け入れ基準

- [ ] デフォルトプロンプトに年齢制御の強力な指示が組み込まれている
- [ ] ユーザーのプロンプトに年齢キーワードがなくても、年齢制御の重要性が伝わる
- [ ] 年齢キーワードが検出された場合、具体的な年齢範囲と制御ルールが指定される
- [ ] 抽象度の高い指示（例：「会話している」）でも、年齢が適切に区別される
- [ ] キャラクター参照画像がある場合、その年齢を維持する指示が含まれる
- [ ] `npm run lint` エラー0
- [ ] 実際に生成した漫画で、子供と大人の年齢差が明確に見える

---

## 実装順序

1. `buildAgeControlInstruction` 関数を追加（validateRefImage関数の後、行75あたり）
2. `charRefInstruction` に年齢維持の指示を追加（行129-131）
3. `ageControlInstruction` を構築（charRefInstructionの後、行132あたり）
4. `fullPrompt` に `ageControlInstruction` を挿入（charRefInstructionの後、ユーザーの指示の前）
5. 【重要】セクションに年齢制御を最優先事項として追加

---

## 期待される動作

### ケース1: 年齢キーワードが検出される場合
**ユーザープロンプト**: 「子供と大人が会話している」

**生成される指示**:
- 検出された年齢層: 子供（5-12歳）、大人（25-45歳）
- 具体的な年齢制御ルール（顔立ち、体の大きさ、プロポーションなど）
- 年齢差を明確にする指示

### ケース2: 年齢キーワードが検出されない場合
**ユーザープロンプト**: 「2人が会話している」

**生成される指示**:
- 年齢制御の基本原則
- 文脈から適切な年齢を推測する指示
- 年齢の区別ルール（子供らしさ、大人らしさ）

### ケース3: キャラクター参照画像がある場合
**追加指示**:
- 参照画像の年齢を正確に維持
- 参照画像とプロンプトの年齢指定が矛盾する場合の優先順位



