# Easy Banana — Chrome Extension (v2.7.0)

This repository contains an MV3 Chrome extension that opens a dedicated tab for quick image generation with Gemini, OpenRouter, or FAL, plus convenient reference‑image tools and a built‑in paint editor.

日本語の説明は下に続きます。

---

## English

- Name: Easy Banana
- Version: 2.7.0
- Type: Chrome Extension (Manifest V3) with a full-tab workspace

### Overview
Generate images with Gemini, OpenRouter, or FAL from a focused tab, and orchestrate FAL video jobs in the Story Board workspace. You can:
- Enter a prompt (Cmd/Ctrl+Enter to run)
- Use up to 10 custom prompt presets (title + body)
- Add reference images by drag & drop, paste, URL import, or from a built‑in library
- Add a white canvas (“キャンバスを追加”) with width/height and ratio presets (1:1 / 4:3 / 3:4 / 16:9 / 9:16 / 1:1.4 / 1.4:1)
- View generated images in a popup viewer; Save or Copy to clipboard (Story Board cards now embed Preview / Download / Copy controls)
- Edit reference images via the ✎ button in a popup paint editor (brush/eraser, color, size, undo/redo, zoom/pan). Save as replace or add.
- Open **Story Board** from the header button to queue FAL Seedance video generations: pick a JSON-defined model schema, drop/paste reference images, duplicate or reorder jobs, and review unified result cards (video / image / audio controls + inline logs, per card downloads or ZIP). Video cards now delay-load the final MP4, provide a **Reload Video** action for manual refetching if needed, default downloads to consistent filenames such as `job_1_video.mp4`, and text inputs with `maxLength` show live counters (`123/800`) while blocking generation beyond the limit.
- Ship with curated OpenAI Sora 2 presets (text-to-video, image-to-video, and Pro tiers) including numeric duration handling and updated usage guidance pulled from the fal.ai references.

### Requirements
- Google Chrome (Manifest V3)
- A Gemini, OpenRouter, or FAL API key

### Install
1) Open `chrome://extensions` and enable Developer mode
2) Click “Load unpacked” and select this folder

### Setup
- Click the header button “設定 (Open Settings)”
- Choose a provider (Gemini / OpenRouter / FAL), paste the corresponding API key, and click “Save Settings”
- Optionally create up to 10 custom prompts (enable the ones you want)

### Usage
- Type your prompt or click a custom prompt button (which replaces the prompt field)
- Add reference images: drag & drop, paste, URL import, or from Library
- Optionally add white canvas with presets
- Click Generate
- Click any generated image to open it in a large popup viewer; Save or Copy it (Story Board image cards now include Preview / Download / Copy buttons)
- Click ✎ on a reference image to paint; save as replace or add
- Open Story Board to schedule FAL Seedance video jobs: drop or paste reference images, duplicate/add/reorder rows, cancel, and work with unified result cards (video / image / audio controls + inline logs, with per-card or ZIP downloads).

### Permissions (Why)
- `storage`: save API key, custom prompts, library assets, and session data
- `windows`: open Settings, Library, Viewer, and Editor windows
- `host_permissions`:
  - `https://generativelanguage.googleapis.com/*` (Gemini API)
  - `https://openrouter.ai/*` (OpenRouter API)
  - `https://api.fal.ai/*`, `https://queue.fal.run/*` (FAL API)
  - `<all_urls>` (fetch dropped image URLs from the web)

### Security & Privacy
- API keys are stored via `chrome.storage.local` (not encrypted)
- Requests are sent to the selected provider’s endpoint (Google/OpenRouter/FAL)

### Troubleshooting
- Inline script CSP warnings: expected; all scripts are external
- Viewer/editor windows use `chrome.storage.session` for large data; reload the extension if a popup shows blank
- Drag & drop from some sites may include placeholders; the app filters tiny/0×0 data and deduplicates
- Image size cap: ~8 MB per image

### Known Limits
- Some sites block hotlinking; `blob:` URLs from other tabs generally can’t be fetched
- Story Board currently targets the FAL Seedance models defined in `models_sb.json` and requires a valid FAL API key.

### Project Layout
- `manifest.json` — MV3 manifest (v2.7.0)
- `background.js` — service worker (handles toolbar action → tab workflow)
- `sidepanel.html` / `sidepanel.js` — main UI and logic (runs as a full tab)
- `key.html` / `key.js` — Settings (API key + Custom Prompts)
- `library.html` / `library.js` — Image Library (persisted via storage)
- `viewer.html` / `viewer.js` — Full‑screen image viewer popup
- `editor.html` / `editor.js` — Built‑in paint editor (popup)
- `storyboard.html` / `storyboard.js` — Story Board workspace for FAL video generation/jobs
- `models_sb.json` — Story Board model/field schema definitions

---

## 日本語 (Japanese)

- 名称: Easy Banana
- バージョン: 2.7.0
- 種別: Chrome 拡張 (Manifest V3) — タブ型ワークスペース

### 概要
Gemini / OpenRouter / FAL を使った画像生成を専用タブで手早く行えます。さらに **Story Board** ワークスペースで FAL Seedance の動画ジョブをまとめて管理できます。以下に対応：
- プロンプト入力（⌘/Ctrl+Enter で実行）
- 最大 30 件のカスタムプロンプト（タイトル + 本文）
- 参考画像の追加（ドラッグ&ドロップ／ペースト／URL 取り込み／ライブラリから選択）
- 「キャンバスを追加」から白キャンバスを作成（幅/高さ + 比率プリセット: 1:1 / 4:3 / 3:4 / 16:9 / 9:16 / 1:1.4 / 1.4:1）
- 生成画像の拡大表示（ポップアップ）／保存／クリップボードへコピー（Story Board のカードから Preview / Download / Copy 操作が可能）
- 参考画像の「✎」からペイントエディタ起動（ブラシ/消しゴム、色、太さ、Undo/Redo、ズーム/パン）。保存は置換/新規追加を選択
- ヘッダーの **Story Board** ボタンから動画ジョブ画面を開き、モデル選択・パラメータ入力・画像ドロップ＆クリップボード貼り付け・ジョブ複製／追加／並べ替え・ZIP 一括ダウンロードが可能

### 前提
- Google Chrome（Manifest V3）
- Gemini / OpenRouter / FAL の API キー

### インストール
1) `chrome://extensions` を開き、デベロッパーモードを有効化
2) 「パッケージ化されていない拡張機能を読み込む」からこのフォルダを選択

### 初期設定
- 画面右上の「設定」をクリック
- プロバイダ（Gemini / OpenRouter / FAL）を選択し、対応する API キーを入力して「Save Settings」をクリック
- 必要に応じてカスタムプロンプト（最大 30 件）を作成・有効化

### 使い方
- プロンプトを入力、またはカスタムプロンプトのボタンをクリック（入力欄が置き換わります）
- 参考画像の追加：
  - Web ページからのドラッグ&ドロップ（URL 取り込み対応）
  - クリップボードからの貼り付け
  - 「ライブラリから選ぶ」から選択
- 「キャンバスを追加」から白キャンバスを作成（幅/高さ + 比率プリセット）
- Generate をクリック
- 生成画像をクリックで拡大、保存／クリップボードにコピー可能
- 参考画像の「✎」からペイントエディタ起動（ブラシ/消しゴム、色、太さ、Undo/Redo、ズーム/パン）。保存は置換/新規追加を選択
- Story Board で動画モデルを選択し、複数ジョブを追加・複製・並べ替えしながら生成結果をカードで確認。動画／画像／音声カードに操作とログを集約し、個別保存または ZIP 一括保存が可能。動画カードは最終的な MP4 を自動で待ち受け、必要に応じて **動画をリロード** ボタンで手動再取得でき、ダウンロード時は `job_1_video.mp4` のような一貫したファイル名になります。さらに `maxLength` を設定したテキスト入力にはリアルタイムの文字数カウンター（例: `123/800`）を表示し、上限を超えている間は生成ボタンを押せません。
- OpenAI Sora 2（テキスト→動画／画像→動画の通常版と Pro 版）プリセットを追加し、fal.ai のリファレンスに基づく数値 duration と利用ガイドを Story Board に組み込みました。

### 権限（理由）
- `storage`: API キー・カスタムプロンプト・ライブラリ・セッションデータの保存
- `windows`: 設定／ライブラリ／ビューア／エディタのウィンドウを開くため
- `host_permissions`:
  - `https://generativelanguage.googleapis.com/*`（Gemini API）
  - `https://openrouter.ai/*`（OpenRouter API）
  - `https://api.fal.ai/*`, `https://queue.fal.run/*`（FAL API）
  - `<all_urls>`（Web 上の画像 URL を取得するため）

### セキュリティ／プライバシー
- API キーは `chrome.storage.local` に保存され、暗号化されません
- リクエストは選択したプロバイダのエンドポイント（Google / OpenRouter / FAL）に送信されます

### トラブルシューティング
- インラインスクリプトの CSP 警告: 仕様どおり（スクリプトは外部ファイル）
- ビューア／エディタが真っ黒: URL 長制限回避のため `chrome.storage.session` を使用。改善しない場合は拡張を再読み込み
- X.com などからのD&Dで画像が2枚: プレースホルダ除外＆重複排除を実装
- 画像サイズ: 1 枚あたりおおよそ 8 MB まで
- Story Board は `models_sb.json` に定義された FAL Seedance モデルを対象とし、FAL API キーが必要です

### 構成
- `manifest.json` — MV3 マニフェスト（v2.6.0）
- `background.js` — サービスワーカー（アクション→タブワークスペース）
- `sidepanel.html` / `sidepanel.js` — メイン UI（タブ表示）
- `key.html` / `key.js` — 設定（API キー + カスタムプロンプト）
- `library.html` / `library.js` — 画像ライブラリ
- `viewer.html` / `viewer.js` — 画像ビューア
- `editor.html` / `editor.js` — ペイントエディタ（ポップアップ）
- `storyboard.html` / `storyboard.js` — Story Board（動画ジョブ管理）
- `models_sb.json` — Story Board 用のモデル／入力定義
