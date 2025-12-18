# 漫画生成：年齢制御の強化指示

## 問題
- 「子供も一緒に老けた」という問題が発生
- プロンプトで年齢を明示的に制御していないため、AIがキャラクターの年齢を適切に区別できていない

## 解決方針
プロンプトに**年齢を明示的に指定するセクション**を追加し、キャラクターごとに年齢を厳密に制御する

---

## 修正内容

### ファイル: `src/app/api/generate/manga/route.ts`

### 1) 年齢検出・抽出関数を追加

```typescript
/**
 * プロンプトからキャラクターと年齢を検出・抽出
 * 例: "子供" → { character: "子供", ageRange: "5-12歳" }
 *     "女性" → { character: "女性", ageRange: "20-40歳" }
 */
function extractCharacterAges(prompt: string): Array<{ character: string; ageRange: string; keywords: string[] }> {
  const agePatterns: Array<{ keywords: string[]; ageRange: string }> = [
    { keywords: ["子供", "子ども", "こども", "幼児", "小学生", "少年", "少女", "男の子", "女の子", "kid", "child", "children"], ageRange: "5-12歳" },
    { keywords: ["中学生", "中高生", "ティーン", "teen", "teenager"], ageRange: "13-17歳" },
    { keywords: ["大人", "成人", "女性", "男性", "お母さん", "お父さん", "母親", "父親", "adult", "woman", "man", "mother", "father"], ageRange: "25-45歳" },
    { keywords: ["おばあちゃん", "おじいちゃん", "高齢", "elderly", "grandmother", "grandfather"], ageRange: "60-80歳" },
  ];

  const characters: Array<{ character: string; ageRange: string; keywords: string[] }> = [];
  const lowerPrompt = prompt.toLowerCase();

  for (const pattern of agePatterns) {
    for (const keyword of pattern.keywords) {
      if (lowerPrompt.includes(keyword.toLowerCase()) || prompt.includes(keyword)) {
        // 既に同じ年齢範囲のキャラクターが登録されていないか確認
        const existing = characters.find(c => c.ageRange === pattern.ageRange);
        if (!existing) {
          characters.push({
            character: keyword,
            ageRange: pattern.ageRange,
            keywords: pattern.keywords.filter(k => 
              lowerPrompt.includes(k.toLowerCase()) || prompt.includes(k)
            ),
          });
        }
        break; // 1つのパターンにマッチしたら次のパターンへ
      }
    }
  }

  return characters;
}
```

### 2) プロンプト構築部分を修正（行133-147あたり）

**変更前:**
```typescript
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
// キャラクターの年齢を検出
const detectedCharacters = extractCharacterAges(prompt);
const ageInstruction = detectedCharacters.length > 0
  ? `【キャラクター年齢の厳密な指定（必須）】
以下のキャラクターの年齢を厳密に守ってください。年齢の混同は絶対に禁止です。

${detectedCharacters.map((c, i) => 
  `- キャラクター${i + 1}（「${c.keywords.join("」「")}」などで言及）: ${c.ageRange}の年齢を維持してください。`
).join("\n")}

【年齢制御のルール】
1. 子供（5-12歳）は常に子供らしい顔立ち、体の大きさ、プロポーションで描いてください
2. 大人（25-45歳）は大人らしい顔立ち、体の大きさ、プロポーションで描いてください
3. 子供と大人が同じシーンにいる場合、年齢差が明確に見えるように描いてください
4. キャラクター参照画像がある場合、その画像の年齢を正確に再現してください
5. 年齢の混同（子供が老けて見える、大人が幼く見える）は絶対に避けてください`
  : `【キャラクター年齢の指定】
ユーザーのプロンプトに「子供」「大人」などの年齢に関する記述がある場合、その年齢を厳密に守ってください。
- 子供は子供らしい顔立ち・体の大きさで描く
- 大人は大人らしい顔立ち・体の大きさで描く
- 年齢の混同は絶対に避ける`;

const fullPrompt = `あなたは漫画・イラスト生成の専門家です。以下の指示に従って高品質な漫画イラストを生成してください。

${stylePrompt}

${colorInstruction}
${aspectInstruction}
${charRefInstruction}

${ageInstruction}

【ユーザーの指示】
${prompt}

【重要】
- 高品質な漫画/アニメスタイルで描画
- 日本の漫画の表現技法を活用
- **キャラクターの年齢を厳密に守る（最重要）**
- プロフェッショナルな仕上がり`;
```

### 3) キャラクター参照画像がある場合の追加指示

`charRefInstruction` の部分も修正（行129-131あたり）:

**変更前:**
```typescript
const charRefInstruction = validCharRefs.length > 0
  ? `【キャラクター参照】添付のキャラクター参照画像（${validCharRefs.length}枚）を元に、キャラクターの顔や特徴を忠実に再現してください。`
  : "";
```

**変更後:**
```typescript
const charRefInstruction = validCharRefs.length > 0
  ? `【キャラクター参照】添付のキャラクター参照画像（${validCharRefs.length}枚）を元に、キャラクターの顔や特徴を忠実に再現してください。
特に、参照画像の年齢を正確に維持してください。参照画像が子供なら子供として、大人なら大人として描いてください。`
  : "";
```

---

## 受け入れ基準

- [ ] プロンプトに「子供」と「大人」が含まれる場合、年齢が明示的に指定される
- [ ] 年齢制御のルールがプロンプトに含まれる
- [ ] キャラクター参照画像がある場合、その年齢を維持する指示が含まれる
- [ ] `npm run lint` エラー0
- [ ] 実際に生成した漫画で、子供と大人の年齢差が明確に見える

---

## 実装順序

1. `extractCharacterAges` 関数を追加
2. `ageInstruction` を構築するロジックを追加
3. `fullPrompt` に `ageInstruction` を挿入
4. `charRefInstruction` に年齢維持の指示を追加
5. テスト: 「子供と大人が会話している」というプロンプトで生成し、年齢差が明確か確認



