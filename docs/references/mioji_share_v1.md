# 参考プロダクト調査: `mioji_share_v1`

対象: `/Users/okajima/Downloads/mioji_share_v1`

## 概要
Moji Booster（高速文字起こし＆OCRツール）の実装から、LP Builder Proの **LPスクレイピング/OCR** 周りで参考になる実装パターンを抽出する。

## 技術スタック（参考）
- **UI**: Gradio
- **スクリーンショット**: Playwright（Chromium）
- **OCR**: Google Gemini（`google-genai` / `google.genai`）
- **並列/ジョブ管理**: ThreadPoolExecutor + Semaphore
- **画像処理**: Pillow（結合/分割）

## 取り込み価値が高い実装パターン（LP Builder Pro向け）

### 1) 動的LP向けの「段階的プリレンダリング・スクロール」
LPの途中で遅延ロードされる要素（無限スクロール/アニメ）を **複数回スクロール→高さ再計測** で安定させてからキャプチャする。
- 重要: **高さが安定するまで数回リトライ**（`stable_count`）するのが実務的

### 2) フルページをタイル撮影して縦結合（メモリ/制限対策）
フルページを `tile_height - overlap` のステップで撮影し、縦方向に合成。
- **オーバーラップ**で継ぎ目が崩れにくい
- **最大ピクセル上限**（`max_output_pixels`）でOOM回避

### 3) CSS注入で安定化（アニメ停止 / fixed非表示 / 日本語フォント）
Playwrightで以下を行い、OCRの精度・安定性を上げている。
- アニメ/トランジション停止
- fixed要素の非表示（ヘッダー等の重複を防ぐ）
- `Noto Sans JP` を強制適用（文字化け/フォント未ロード対策）

### 4) OCRは高さで分割＋オーバーラップ
縦長画像を `max_height` で分割し、**オーバーラップ**を入れてOCR→最後に重複行をマージ。
- 分割後のサイズ上限（例: 20MB）をチェック
- **リトライ/指数バックオフ**が現実的（APIの一時失敗に強い）

### 5) 同時実行をSemaphoreで制御
PlaywrightキャプチャとGemini OCRそれぞれの同時実行数を **別々に制御** している。
- 例: `LP_CAPTURE_CONCURRENCY`, `GEMINI_CONCURRENCY`

## LP Builder Proへの適用（方針案）

### スクレイピング/OCRの基本方針
- **キャプチャ**: Playwright（タイル撮影 + CSS安定化 + 段階スクロール）
- **OCR**: デフォルト `gemini-2.5-flash`（速い/安い）で、失敗時に `gemini-2.5-pro` へフォールバックも検討
- **画像生成/編集**: `gemini-3-pro-image-preview`（2.5系の「Image Generation」名称混同を避ける）

### 環境変数（導入候補）
- `LP_CAPTURE_CONCURRENCY`
- `GEMINI_OCR_CONCURRENCY`
- `GEMINI_OCR_MAX_HEIGHT`
- `GEMINI_OCR_OVERLAP`
- `GEMINI_TEXT_MODEL`（テキストモデル選択）

## 参照ポイント（コード）
- `app/modules/lp_gemini.py`
  - `capture_fullpage_tiled()`（段階スクロール + タイル撮影 + 合成）
  - `gemini_ocr_image()`（リトライ/バックオフ）
  - `_split_image_with_overlap()`（分割 + overlap）




