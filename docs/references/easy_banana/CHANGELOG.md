# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]
- TBD: minor UI refinements, paste-from-viewer actions, per-site DnD tweaks.

## [2.10.0] - 2025-12-04
### Added
- Added 6 new models to Story Board:
  - fal-ai/Seedream 4.5 edit (multi-image editing with up to 10 input images)
  - fal-ai/Seedream 4.5 t2i (text-to-image generation)
  - fal-ai/Kling v2.6 pro i2v (image-to-video with audio generation support)
  - fal-ai/Kling v2.6 pro t2v (text-to-video with audio generation support)
  - fal-ai/Pixverse v5.5 i2v (image-to-video with BGM/SFX/dialogue, multi-clip support)
  - fal-ai/Pixverse v5.5 t2v (text-to-video with BGM/SFX/dialogue, multi-clip support)

### Fixed
- Fixed Pixverse resolution parameter values (added "p" suffix: "720p", "1080p", etc.)
- Removed invalid "auto" option from Pixverse style parameter
- Fixed Kling v2.6 pro generate_audio default value (changed from false to true per API specification)

#### 日本語サマリー
##### 追加
- ストーリーボードに6つの新しいモデルを追加:
  - fal-ai/Seedream 4.5 edit（最大10枚の入力画像による複数画像編集）
  - fal-ai/Seedream 4.5 t2i（テキストから画像生成）
  - fal-ai/Kling v2.6 pro i2v（音声生成対応の画像から動画生成）
  - fal-ai/Kling v2.6 pro t2v（音声生成対応のテキストから動画生成）
  - fal-ai/Pixverse v5.5 i2v（BGM/効果音/対話音声、マルチクリップ対応の画像から動画生成）
  - fal-ai/Pixverse v5.5 t2v（BGM/効果音/対話音声、マルチクリップ対応のテキストから動画生成）

##### 修正
- Pixverseの解像度パラメータ値を修正（"p"サフィックスを追加: "720p", "1080p"など）
- Pixverseのスタイルパラメータから無効な"auto"オプションを削除
- Kling v2.6 proのgenerate_audioデフォルト値を修正（API仕様に従いfalseからtrueに変更）

## [2.9.0] - 2025-12-02
### Added
- Smart input preservation when switching models in Story Board mode
  - Prompts and images are now preserved across model switches
  - Single image fields ⟷ single image fields (automatic field mapping)
  - Multi-image fields ⟷ multi-image fields (automatic field mapping)
  - Multi-image → single image (preserves first image only)
  - Single image → multi-image (converts to array)

### Changed
- Detached tab window width changed from 230px to 600px for better usability

### Fixed
- HTTP 413 "Payload Too Large" errors in Kling Video O1 models
  - All videos and images now uploaded to FAL CDN before submission
  - Base64 encoding no longer used for media files in FAL API requests
- Reduced console error spam by ignoring HTTP 405 errors during FAL queue polling

#### 日本語サマリー
##### 追加
- ストーリーボードモードでモデル切り替え時の入力保持機能を追加
  - プロンプトと画像がモデル切り替え時に保持されるようになりました
  - 単一画像フィールド ⟷ 単一画像フィールド（自動マッピング）
  - 複数画像フィールド ⟷ 複数画像フィールド（自動マッピング）
  - 複数画像 → 単一画像（最初の1枚のみ保持）
  - 単一画像 → 複数画像（配列として変換）

##### 変更
- タブを独立した際のウィンドウ幅を230pxから600pxに変更し、使いやすさを向上

##### 修正
- Kling Video O1モデルでのHTTP 413「Payload Too Large」エラーを修正
  - すべての動画と画像を送信前にFAL CDNにアップロードするように変更
  - FAL APIリクエストでメディアファイルにBase64エンコードを使用しないように変更
- FALキューポーリング時のHTTP 405エラーを無視することで、コンソールエラーのスパムを削減

## [2.8.4] - 2025-12-02
### Changed
- Updated ZIP package to include installation guides (HOW_TO_INSTALL_AND_UPDATE.md and インストール方法・更新方法.md)

#### 日本語サマリー
##### 変更
- ZIPパッケージにインストールガイド（HOW_TO_INSTALL_AND_UPDATE.md と インストール方法・更新方法.md）を含めるように変更

## [2.8.3] - 2025-12-02
### Changed
- Version bump to sync with actual state (skipped 2.8.2 due to intermediate updates)

#### 日本語サマリー
##### 変更
- 中間アップデートにより2.8.2をスキップしてバージョン番号を同期

## [2.8.2] - 2025-12-02
### Added
- Added 4 Kling Video O1 models to Story Board (models_sb.json):
  - fal-ai/Kling O1 i2v: Generate video from start/end frame images with smooth transition
  - fal-ai/Kling O1 ref2v: Generate video from reference images and elements
  - fal-ai/Kling O1 v2v edit: Edit existing video based on prompt
  - fal-ai/Kling O1 v2v ref: Generate new video from reference video

#### 日本語サマリー
##### 追加
- ストーリーボードに4つのKling Video O1モデルを追加しました (models_sb.json):
  - fal-ai/Kling O1 i2v: スタート/エンド画像から滑らかに遷移する動画を生成
  - fal-ai/Kling O1 ref2v: 参照画像とエレメントから動画を生成
  - fal-ai/Kling O1 v2v edit: プロンプトに基づいて既存動画を編集
  - fal-ai/Kling O1 v2v ref: 参照動画から新しい動画を生成

## [2.8.1] - 2025-11-23
### Fixed
- Fixed API key warning display logic to properly show FAL-specific warning when FAL API key is missing, independent of other provider keys.
- Fixed reference to undefined `getApiKey` function in warning refresh logic by using direct storage access.

### Added
- Added FAL API key warning message that displays separately from general API key warning, ensuring users are prompted to enter FAL key even when other provider keys are present.
- Added debug console logging for API key warning system (temporary for troubleshooting).

#### 日本語サマリー
##### 修正
- FAL APIキーが未入力の場合に、他のプロバイダーのキーの有無に関わらず、FAL専用の警告を正しく表示するようにロジックを修正しました。
- 警告更新ロジックで未定義の `getApiKey` 関数を参照していた問題を、ストレージへの直接アクセスに変更して修正しました。

##### 追加
- FAL APIキー専用の警告メッセージを追加し、他のプロバイダーのキーが入力されている場合でもFALキーの入力を促すようにしました。
- APIキー警告システムのデバッグ用コンソールログを追加しました（トラブルシューティング用の一時的な対応）。

## [2.8.0] - 2025-11-22
### Changed
- Side panel reference images are now uploaded to FAL CDN instead of being sent as Base64 data URIs, improving reliability and reducing request payload size.
- Upload process includes automatic fallback to Base64 if FAL CDN upload fails, ensuring backward compatibility.
- Generate button displays "準備中..." (Preparing...) status during image upload phase.
- Library images are now automatically compressed when imported: maximum 500KB per image, 1536px max dimension, JPEG format with quality optimization.

### Added
- New `sidepanel.upload.js` module with `uploadFalImage()` function for uploading images to FAL CDN storage.
- Support for multi-endpoint fallback strategy (fal-cdn-v3, fal-cdn, legacy FormData endpoints) to maximize upload success rate.
- Library storage management: automatic image compression using binary search algorithm to optimize JPEG quality, storage usage meter showing current usage out of 9MB limit, and `unlimitedStorage` permission to increase quota from 5MB to 10MB.
- Toast notifications in Library when images are compressed or storage limits are reached.

#### 日本語サマリー
##### 変更
- サイドパネルの参照画像を Base64 data URI ではなく FAL CDN にアップロードするように変更し、安定性を向上させリクエストサイズを削減しました。
- FAL CDN へのアップロードが失敗した場合は自動的に Base64 にフォールバックし、後方互換性を確保しています。
- 画像アップロード中は生成ボタンに「準備中...」(Preparing...) と表示されるようになりました。
- ライブラリへのインポート時に画像を自動圧縮：1枚あたり最大500KB、最大1536px、JPEG形式で品質を最適化します。

##### 追加
- FAL CDN ストレージへの画像アップロード機能を持つ `sidepanel.upload.js` モジュールと `uploadFalImage()` 関数を新規追加しました。
- 複数エンドポイントへのフォールバック戦略 (fal-cdn-v3, fal-cdn, レガシー FormData エンドポイント) をサポートし、アップロード成功率を最大化しています。
- ライブラリのストレージ管理機能：バイナリサーチアルゴリズムによる JPEG 品質の自動最適化、9MB 上限に対する使用量メーター表示、容量を 5MB から 10MB に拡張する `unlimitedStorage` パーミッションを追加しました。
- ライブラリで画像圧縮時やストレージ上限到達時にトースト通知を表示するようにしました。

## [2.7.1] - 2025-11-21
### Fixed
- Fixed aspect ratio selection for nano-banana-pro models not being applied to API requests.
- Updated state management to properly save and restore `aspectRatio` property across all persistence layers.

### Added
- Added "独立" (Detach) button to open the side panel in a standalone narrow window (230px width) positioned to the right of the current window.

#### 日本語サマリー
##### 修正
- nano-banana-pro モデルのアスペクト比選択が API リクエストに反映されない問題を修正しました。
- `aspectRatio` プロパティを全ての永続化レイヤーで正しく保存・復元するように状態管理を更新しました。

##### 追加
- サイドパネルを幅230pxの独立ウィンドウとして開く「独立」ボタンを追加しました。ウィンドウは現在のウィンドウの右側に配置されます。

## [2.7.0] - 2025-11-21
### Added
- Story Board now includes **fal-ai/reve** models: text-to-image, edit, fast edit, remix, and fast remix, offering flexible image generation and editing workflows.
- Added **fal-ai/nano-banana-pro** (text-to-image) powered by Gemini 3 Pro Image with resolution options (1K/2K/4K) and ten aspect ratio presets.
- Added **fal-ai/nano-banana-pro/edit** for image-to-image editing with multi-image support, auto aspect ratio detection, and high-resolution output.
- All new models support configurable output formats (PNG/JPEG/WebP) and up to 4 images per generation.

### Changed
- Reve remix models accept 1-6 reference images with optional XML img tag syntax (`<img>0</img>`) for precise image referencing in prompts.
- Nano-banana-pro models default to 1:1 aspect ratio for text-to-image and auto aspect ratio for editing workflows.

#### 日本語サマリー
##### 追加
- Story Board に **fal-ai/reve** シリーズを追加：テキスト→画像、編集、高速編集、リミックス、高速リミックスの5モデルで柔軟な画像生成・編集が可能になりました。
- **fal-ai/nano-banana-pro** (テキスト→画像) を追加：Gemini 3 Pro Image を使用し、解像度 (1K/2K/4K) と10種類のアスペクト比プリセットを選択できます。
- **fal-ai/nano-banana-pro/edit** を追加：複数画像の編集に対応し、アスペクト比自動検出と高解像度出力をサポートします。
- すべての新モデルで出力形式 (PNG/JPEG/WebP) の選択と、1回あたり最大4枚の画像生成が可能です。

##### 変更
- Reve リミックスモデルは1-6枚の参照画像を受け付け、プロンプト内で XML img タグ (`<img>0</img>`) による画像指定もサポートします。
- Nano-banana-pro モデルは、テキスト→画像では 1:1、編集では auto をデフォルトのアスペクト比として設定しました。

## [2.6.0] - 2025-10-28
### Changed
- The toolbar action now always opens `sidepanel.html` as a dedicated browser tab, simplifying the UX across Chrome, Atlas, and other Chromium variants.
- Removed all side panel permissions/dependencies and stripped the "全画面" / "サイドバーに表示" header buttons to match the new tab-only workflow.
- Updated documentation and onboarding copy to describe the full-tab experience.

### Removed
- Side panel behavior, fallback timers, and error popups (the extension no longer attempts to register or return to the MV3 side panel surface).

#### 日本語サマリー
##### 変更
- ツールバーのアイコンは常に `sidepanel.html` を専用タブで開くようになり、Chrome / Atlas などすべての Chromium 系で同一の UI が提供されます。
- サイドパネル用の権限・依存コードを削除し、ヘッダーの「全画面」「サイドバーに表示」ボタンも廃止してタブ運用に統一しました。
- README などのドキュメントをタブ専用フローに合わせて更新しました。

##### 削除
- サイドパネル復帰処理やタイムアウト、エラーポップアップなど MV3 サイドパネル向けの実装をすべて撤去しました。

## [2.5.2] - 2025-10-21
### Added
- Story Board rows now show a “リクエストを直接確認” button that opens each model’s fal.ai request dashboard so users can verify jobs even when assets fail to return to Easy Banana.

### Changed
- Populated `request_page` URLs for every FAL Story Board preset to power the new fallback workflow and speed up manual troubleshooting.
- Tuned the new button’s styling so it stays legible in dark mode.

#### 日本語サマリー
##### 追加
- Story Board の各ジョブに「リクエストを直接確認」ボタンを追加し、生成物が受け取れない場合でも fal.ai のリクエスト一覧をすぐ開けるようにしました。

##### 変更
- すべての FAL モデル定義に `request_page` を追加し、新しいリカバリ導線から fal.ai 側のステータスを確認しやすくしました。
- ダークテーマ時でもボタンが読みやすいよう配色を調整しました。

## [2.5.1] - 2025-10-15
### Changed
- Internal maintenance updates to support the next round of UI refinements and keep background dependencies aligned.

#### 日本語サマリー
##### 変更
- 次期 UI 改修に備えて内部処理と依存関係をメンテナンスし、挙動はそのまま保っています。

## [2.5.0] - 2025-10-05
### Added
- Story Board ships with OpenAI Sora 2 presets (text-to-video, image-to-video, and Pro) including up-to-date usage guidance pulled from the fal.ai API docs.

### Changed
- Duration selectors for Sora models now emit numeric payloads and reference notes call out the allowed aspect ratios, resolutions, and image_url requirements.

#### 日本語サマリー
##### 追加
- Story Board に OpenAI Sora 2（テキスト→動画／画像→動画／各種 Pro）プリセットを追加し、fal.ai のリファレンスに基づく利用ガイドを同梱しました。

##### 変更
- Sora 系モデルの duration が数値として送信されるようにし、許容されるアスペクト比・解像度・image_url 必須条件などをリファレンスノートに明記しました。

## [2.4.0] - 2025-10-02
### Added
- Story Board media inputs now expose a **Pick from Output** button, letting users pull any generated video or audio back into new jobs without downloading.

### Changed
- Reimported media is normalized (filename, MIME, previews) so subsequent uploads to FAL storage work like freshly selected files.

#### 日本語サマリー
##### 追加
- Story Board の動画・音声入力に「出力ファイルから選ぶ」ボタンを追加し、生成済みメディアをワンクリックで再利用できるようにしました。

##### 変更
- 取り込んだメディアのファイル名・MIME・プレビューを自動調整し、FAL へのアップロードも通常のファイル選択と同じ手順で動作するようにしました。

## [2.3.1] - 2025-09-30
### Added
- ElevenLabs voice selector supports a Custom entry with a text field so bespoke voice_id values can be supplied.
- Minimax speech 2.5 HD voice picker also exposes a Custom option, enabling manual voice_id input beside the preset list.
- Added **fal-ai/pixverse lipsync** model with video/audio support. Local sources are uploaded via FAL's `/v1/storage/upload` endpoint (with fallback hosts) to avoid HTTP 413 responses, and the UI falls back to direct attachments if all uploads fail.
- Story Board now respects hidden field defaults when no user input is provided, ensuring model_id and similar values are sent to providers (fixes V3 tag handling).

### Fixed
- Voice Settings header remains legible in dark mode.

## [2.3.0] - 2025-09-30
### Added
- Story Board now supports FAL wan 2.5 preview text-to-video and image-to-video pipelines, enabling both prompt-only and reference-driven exports.

#### 日本語サマリー
##### 追加
- Story Board で FAL 経由の Wan 2.5 プレビュー (テキスト→動画 / 画像→動画) を利用できるようにしました。

## [2.2.0] - 2025-09-26
### Added
- Story Board video cards now include a **Reload Video** button to re-fetch the latest result from the queue endpoints when necessary.
- After a job completes, video players wait briefly before loading the MP4 to avoid racing the CDN when assets are still finalizing.
- Text inputs that declare `maxLength` now show a live character counter and prevent generation when the limit is exceeded.

### Changed
- Video result parsing now ignores queue/status URLs and only accepts actual video files (e.g. `.mp4`), ensuring Kling jobs attach the final media object.
- Job downloads default to consistent filenames such as `job_1_video.mp4` for easier organization.

### Fixed
- Resolved cases where queue URLs were bound directly to the `<video>` element, which triggered 401/405 errors and left Kling results blank despite completion.

#### 日本語サマリー
##### 追加
- Story Board の動画カードに **動画をリロード** ボタンを追加し、必要に応じてキューの最新結果を再取得できるようにしました。
- ジョブ完了後は MP4 の取得まで短時間待機し、CDN での生成完了前に読み込みを開始してしまう問題を回避しています。
- `maxLength` を指定したテキスト入力に文字数カウンターを追加し、上限を超えた場合は生成ボタンを押せないようにしました。

##### 変更
- 動画結果の解析でキュー／ステータス用 URL を除外し、`.mp4` など実際の動画ファイルだけを採用するようにしました。
- ダウンロードファイル名を `job_1_video.mp4` のように統一し、整理しやすくしました。

##### 修正
- キューの URL がそのまま `<video>` に設定されて 401/405 エラーが発生し、Kling の結果が表示できなかった問題を解消しました。

## [2.1.0] - 2025-09-24
### Added
- Unified Story Board result cards: video, image, and audio jobs now render inside the output column with per-card controls (preview/download/copy) and inline logs.
- Image cards launch the existing viewer popup directly from a Preview button, and each card exposes dedicated Download / Copy actions.

### Changed
- Video controls (download, frame stepping, copy) now live alongside the player inside the output column, with logs displayed directly beneath the current result.
- Updated README to reflect the refreshed Story Board workflow and per-card operations.

### Fixed
- Ensured clipboard copy converts non-PNG images to PNG before writing, preventing MIME errors when copying JPEG results.

#### 日本語サマリー
##### 追加
- Story Board の結果をカード単位で統一し、動画・画像・音声のそれぞれでプレビュー／ダウンロード／コピー操作とログを同一エリアにまとめました。
- 画像カードに Preview / Download / Copy ボタンを追加し、プレビューから viewer ウィンドウを直接開けるようにしました。

##### 変更
- 動画の操作ボタン（ダウンロード・フレーム移動・コピー）をプレーヤー横に配置し、ログも同じ出力枠内に表示するようにしました。
- README を更新し、新しい Story Board カード UX と個別操作を記載しました。

##### 修正
- JPEG など PNG 以外の画像をコピーする際に、PNG に変換してからクリップボードへ書き込むことでエラーが出ないようにしました。

## [2.0.1] - 2025-09-21
### Changed
- Simplified the default system prompt so it focuses on immediate image generation guidance without aspect-ratio rules.
- `models.json` now carries the updated system prompt per model (leaving GPT-5 blank), preparing for provider-specific overrides.
- Removed the beta qualifier across manifest and documentation to mark this as a stable 2.0.1 release.

#### 日本語サマリー
##### 変更
- 既定のシステムプロンプトを簡潔化し、サイズ指定に関する記述を削除しました。
- `models.json` にモデルごとの新システムプロンプトを設定（GPT-5 は空欄のまま）し、プロバイダ別の上書きに備えました。
- manifest とドキュメントから beta 表記を外し、正式版 2.0.1 として公開しました。

## [2.0.0-beta] - 2025-09-20
### Added
- **Story Board** workspace (side panel button) for FAL Seedance text/image/reference-to-video jobs: dynamic model schema loading, per-row controls, status logs, and inline video cards.
- New `models_sb.json` schema types (`singleImage`, `multiImages`, boolean toggles, select options with defaults) with drag & drop + clipboard paste support, automatic Base64 conversion, and size-conscious recompression.
- Job management tools: per-row duplicate/add/cancel, move up/down reordering, ZIP download for all finished videos, per-job filename normalization, and visual highlight animations after moves/adds/duplicates.

### Changed
- Job controls remain interactive during generation—rows can be duplicated, added, or reordered while a request is in flight.
- Form layout updated so labels sit left of inputs, select fields sized consistently, and Story Board toggles align with text for clearer scanning.
- README now documents the Story Board workflow and artifact locations; manifest bumped to 2.0.0.

### Fixed
- Prevented Story Board image uploads from exceeding FAL limits by recompressing oversized clipboard/file drops.
- Ensured camera-fixed toggle and other dynamic fields retain label/input ordering after the layout refactor.

#### 日本語サマリー
##### 追加
- サイドパネル左に **Story Board** を追加し、FAL Seedance の動画生成ジョブを複数管理できるようにしました（モデル選択、パラメータ入力、ログ表示、動画カードなど）。
- `models_sb.json` に新しいフィールド型（singleImage / multiImages / boolean など）を定義し、ドラッグ&ドロップやクリップボード貼り付け→Base64 変換→自動軽量化に対応しました。
- ジョブ操作を拡充（複製・追加・上下移動・ZIP 一括ダウンロード・完了動画のファイル名規則化・操作後のハイライト表示）。

##### 変更
- 生成中でもジョブの追加／複製／並べ替えが行えるようにし、UI ラベルと入力欄の配置を調整しました。
- README と manifest のバージョン表記を 2.0.0-beta に更新し、新しい Story Board の手順を追記しました。

##### 修正
- Story Board に貼り付けた大きな画像が FAL 制限で弾かれないよう、リサイズ＆再圧縮のフローを整備しました。
- Camera Fixed などのトグル項目が他フィールドと同じ左右配置になるようレイアウトを揃えました。

## [1.7.0] - 2025-09-13
### Added
- Custom prompts can now be exported and imported as JSON from Settings, with a confirmation dialog to prevent accidental overwrite.
- Tabs may run image generation in parallel; results stay scoped to their originating tab and completion toasts report which tab finished.
- Tab buttons display an in-progress indicator while generation is running.

### Changed
- Generation workflow is fully tab-aware: switching tabs during a run no longer blocks navigation, and UI state is restored when returning.
- Cancel operations now target only the active tab's jobs, keeping other tabs running uninterrupted.

### Fixed
- Prevented default button labels from drifting when locales change by capturing them at startup.

#### 日本語サマリー
##### 追加
- 設定画面からカスタムプロンプトを JSON 形式でエクスポート/インポートできるようにし、上書き前に確認ダイアログを表示します。
- タブごとに画像生成を並行実行でき、完了時には対象タブ名付きのトーストで通知します。
- 生成中のタブにはインジケータ（●）が表示されるようになりました。

##### 変更
- 画像生成フローをタブ単位に再構築し、生成中でもタブ移動ができるほか、戻った際に元の状態が復元されます。
- キャンセル操作はアクティブなタブのジョブだけに作用し、他タブの処理は継続します。

##### 修正
- ロケール切り替え後もボタンの既定ラベルが失われないよう、起動時にキャプチャして保持するようにしました。

## [1.6.0] - 2025-09-12
### Added
- Model slots can now be configured independently: up to 4 models run in parallel with per-slot selection and saved state.
- Each model row includes a Details (More) button that expands slot-specific options and currently exposes slot-resident size inputs.
- Generated image cards show which slot/model produced them (e.g., "Model 2: …"), with metadata persisted through reloads and tabs.

### Changed
- Size handling moved from the single global inputs to per-slot settings; the detail panel auto-populates defaults from `models.json`.
- Restored sessions/tabs now rehydrate slot details, and reference-image/size guards account for all active slots.

### Fixed
- Prevented duplicate image suppression when different models produce identical data by including the slot in dedupe keys.

#### 日本語サマリー
##### 追加
- モデルスロットを個別に設定でき、最大4スロットのモデルを同時に実行可能にしました。
- 各スロットに「詳細」ボタンを追加し、モデルごとの追加設定（現在はサイズ入力）を拡張できるようにしました。
- 生成画像カードに「モデル1」などスロット番号付きで利用モデルを表示し、タブや復元でも保持するようにしました。

##### 変更
- サイズ指定はグローバル入力からスロット単位の設定に移行し、`models.json` のデフォルト値を自動反映します。
- 復元時にスロット設定を再描画し、参照画像必須判定なども全スロットを対象に確認するようにしました。

##### 修正
- 異なるモデルが同一画像を出力した際にメタ情報ごと保存されるよう、重複判定にスロット情報を含めました。

## [1.5.0] - 2025-09-11
### Added
- FAL provider support via endpoint-only configuration in `models.json`.
- Queue polling for FAL (`queue.fal.run`) with robust result parsing and short per-request timeouts.
- Size inputs (Width/Height) under the model selector. Values persist per tab/session.
- Auto-fill size from `models.json` when empty (supports `image_size`, `default_size`, or `default_width`/`default_height`).
- Settings: FAL API key field; stored in `chrome.storage.local` or `session` like other providers.
- Conditional UI:
  - Hide reference-image section when `image_to_image` is `false`.
  - Hide size row when `size` is explicitly `false` in `models.json`.
  - Guard i2i-only models: if no reference images, block generation and show an error.

### Changed
- Model selection now filters by available API keys per provider (Gemini/OpenRouter/FAL).
- All providers can declare their API endpoint in `models.json` (`endpoint`), which is used preferentially.
- Side panel generation code was refactored: moved provider-specific generate routines to `sidepanel.generate.js` and split some helpers into dedicated files (`sidepanel.util.js`, `sidepanel.refs.js`).
- Size handling for FAL: removed clamping; sends exact values from UI or defaults.

### Fixed
- Cases where FAL requests returned a `request_id` but the UI stayed on "Generating..."; added polling and explicit error if no images are returned within timeout.
- Initial visibility of the size row now respects the selected model from first render.

#### 日本語サマリー
##### 追加
- FAL プロバイダ対応（`models.json` に `endpoint` を記載する方式）。
- FAL のキューポーリング（queue.fal.run）に対応、結果取得を安定化。
- モデル直下にサイズ入力（幅/高さ）を追加し、タブ/セッションごとに保持。
- `models.json` にデフォルトサイズがあれば自動入力（`image_size` / `default_size` / `default_width`・`default_height`）。
- 設定画面に FAL API キーを追加。
- UI の条件表示を追加：
  - `image_to_image:false` のモデルでは参照画像セクションを非表示。
  - `size:false` のモデルではサイズ行を非表示。
  - i2i 専用モデルで参照画像が無い場合は実行をブロックしてエラーメッセージを表示。

##### 変更
- モデルプルダウンは利用可能なプロバイダのキーの有無でフィルタ。
- すべてのプロバイダで `models.json` の `endpoint` を優先使用。
- 生成ロジックを `sidepanel.generate.js` に整理し、ユーティリティ/参照画像処理を分割。
- FAL のサイズ指定はクランプを廃止し、入力値をそのまま送信。

##### 修正
- FAL キューの結果未取得で止まるケースを解消（ポーリング・タイムアウト・明示的エラー表示）。
- 初回表示時のサイズ行の表示/非表示がモデルに追従するように修正。

## [1.4.1] - 2025-09-09
### Changed
- Cancel behavior for multi-image generation: once canceled, remaining images are not started; loop exits immediately.

### Added
- Large image intake: auto downscale images > 8MB (local and remote) before adding as references, with a short toast notification.

### Fixed
- `cancelBtn` undefined on reload (follow-up guard) and minor robustness improvements around tab persistence.

#### 日本語サマリー
- 複数枚生成時のキャンセルを強化：キャンセル後は残りの生成を開始せず即終了。
- 8MB超の画像は自動リサイズして参照画像として取り込み（ローカル/リモート対応、トーストで通知）。
- キャンセルボタン未定義の再発防止、タブ保存の安定化。

## [1.4.0] - 2025-09-09
### Added
- Tabs UI in the Side Panel (fixed 5 tabs): segmented look, wraps to multiple rows when space is tight.
- Cancel generation: adds a Cancel button that aborts the in‑flight request (Gemini/OpenRouter) via AbortController.

### Changed
- Prevent tab switching while generating (tabs visually disabled and clicks ignored); toast informs when attempted.
- Tab persistence moved to `chrome.storage.local` so tabs survive extension reload; single‑panel session state remains under the existing preference.
- Tab layout tightened (reduced padding/gap) and segmented styling to match other controls.

### Fixed
- `cancelBtn is not defined` on reload: ensured element lookup and guarded references.
- Model dropdown construction is robust even if `models.json` is missing (fallback entries are used).

#### 日本語サマリー
##### 追加
- サイドパネルにタブUI（固定5タブ）を追加。幅が足りない場合は複数段に折り返し。
- 生成キャンセル機能を追加（AbortController で即中断）。

##### 変更
- 生成中はタブ切替を不可に（視覚的に無効＆クリック無効化）。
- タブ構成の保存先を `chrome.storage.local` に変更し、拡張の再読込でも維持。従来の単一セッション保存は設定に従って継続。
- タブの見た目をセグメント風に詰めて表示。

##### 修正
- 拡張再読込時の `cancelBtn` 未定義エラーを修正。
- models.json 不在時にもモデルプルダウンが表示されるようフォールバックを追加。

## [1.3.0] - 2025-09-05
### Added
- i18n: lightweight runtime language switching (English/Japanese) via `i18n.js` and `locales/en.json`/`ja.json`.
- Settings: UI Language selector (Auto/日本語/English), live‑applied across pages.
- Side Panel: copy icon next to “AIの返答”; shows a 2s toast (“Text copied”/「文章をコピーしました。」).
- Model list from JSON: `models.json` now defines model entries with per‑provider codes and `timeoutSec`; the model dropdown is populated from this file.
- Per‑model timeout: applies `timeoutSec` (e.g., Flash Preview 60s) to both Gemini and OpenRouter requests.
- Aspect‑ratio guidance: if prompt has AR → use it; else use the first reference image’s AR; else 1:1. Applied to both Gemini/OpenRouter requests.

### Changed
- System prompt updated for single‑shot image generation (no follow‑ups), user‑language text, AR handling, and compact guidance.
- Toast duration unified to 2s; Settings save now uses the same toast (no blocking alert).
- Model dropdown width and general visibility tweaks.
- Settings header layout: Save/Close moved to the header; Clear Key remains near the session checkbox.
- Visible separators in Settings for both light/dark themes.

### Fixed
- Version badge remained visible after i18n changes (title split from version span).
- Cursor position while panning/scrolling in the editor; wheel zoom sensitivity reduced for smoother control.

#### 日本語サマリー
##### 追加
- i18n 対応（英語/日本語のランタイム切替）。
- 設定に UI 言語のセレクタを追加（Auto/日本語/English、即時反映）。
- サイドパネル「AIの返答」にコピーアイコンを追加、2秒のトーストで「文章をコピーしました。」を表示。
- モデル定義を `models.json` で管理（プロバイダ別コードと `timeoutSec`）。プルダウンはこのJSONから構成。
- モデルごとのタイムアウト適用（例: Flash Preview 60秒）を Gemini/OpenRouter 双方に反映。
- アスペクト比ガイダンスを追加：プロンプトに比率があればそれを使用、なければ先頭の参照画像の比率、どちらも無い場合は 1:1。

##### 変更
- システムプロンプトを 1ショット画像生成向けに更新（追質問しない、ユーザー言語でのテキスト、AR扱いなど）。
- トースト表示を2秒に統一。設定の保存も同トーストで通知（ダイアログ廃止）。
- モデルプルダウンの見やすさを改善。
- 設定ヘッダーに Save/Close を移動。Clear Key はセッション保存行に残置。
- ライト/ダーク双方で見やすい区切り線を追加。

##### 修正
- タイトルのi18n化後もバージョンバッジが消えないように分離。
- エディタのスクロール時カーソル位置ずれを修正、ホイールズームの感度を低減。

## [1.2.1] - 2025-09-05
### Added
- Generation timeout: 60s timeout for both Gemini and OpenRouter requests (user‑visible message on timeout).
- Editor presets: size presets (5/10/20/40/80/120/160/200) and opacity presets (25/50/75/100).
- Color swatches: 10 quick colors next to the color picker with selection highlight.

### Changed
- Editor zoom (wheel): reduced sensitivity for smoother Ctrl/Cmd+wheel zooming.
- Editor toolbar layout: inserted a wrap/break so opacity controls move to the next line to limit width.
- Editor number inputs: theme‑aware colors for readability in dark/light modes.
- Size control: slider now supports 1–200 and stays in sync with number/presets.

### Fixed
- Editor cursor alignment after scrolling: compensates scroll offsets so the brush cursor matches the actual draw point.
- Overpainting density when using low opacity: switched to segment‑based stroke rendering with minimum spacing to reduce unintended darkening along a single stroke.

## [1.2.0] - 2025-09-05
### Added
- Provider selection in Settings: choose between Gemini API and OpenRouter. Separate key fields, session/local storage, and warning banner hides if either key exists.
- OpenRouter support for image generation (chat/completions), including robust parsing of `message.content` and `message.images` entries (image_url/data/b64_json) and reference image intake via data URLs.
- Model configurability: internal mapping allows per‑provider model overrides via `chrome.storage.local.providerModels`.
- “キャンバスを追加” in Side Panel: width/height inputs with ratio presets (1:1, 4:3, 3:4, 16:9, 9:16, 1:1.4, 1.4:1) to add a white PNG as a reference image.
- Built‑in paint editor popup (brush/eraser, color, size, undo/redo, zoom/pan) opened from a new ✎ button on each reference image. Save supports “置き換え/新規追加”.
- Brush size cursor overlay in editor (follows zoom/size/tool).

### Changed
- Side Panel key warning checks both `geminiApiKey` and `openrouterApiKey`.
- Gemini request path refactored with a named endpoint constant; provider switch logic centralized.
- Canvas modal uses opaque backgrounds for readability in both light/dark themes.

### Fixed
- aria-hidden focus warning when closing modals: focus is moved out before hiding the modal; dialog now has appropriate ARIA roles.

### Security/Permissions
- Settings notice clarifies which endpoint receives the key (Google or OpenRouter) depending on selected provider.

## [1.0.0] - 2025-08-29
### Added
- Side panel prompt workflow with Cmd/Ctrl+Enter shortcut.
- Gemini REST integration (`gemini-2.5-flash-image-preview`) with a built-in English system prompt.
- Separate Settings window ("設定を開く"): API key management, security notice, and 10 custom prompts (title + body).
- Reference image intake: drag & drop, clipboard paste, URL import (with `<all_urls>` host permission).
- Image Library window: persist images in `chrome.storage.local`, select/delete, and send to side panel.
- Generated image actions: Save to file, Copy to clipboard.
- Popup viewer window with session storage relay (avoids data URL length limits), click/Escape to close.

### Changed
- UI layout: controls (settings, prompt, generate) fixed at top; stream area scrolls.
- Dark mode button styles for visibility; refined spacing and right-edge clipping fixes.
- Smaller reference thumbnails, centered remove (×) button.
- Button label updates (e.g., "設定を開く", "生成された画像（クリックで拡大）").

### Fixed
- MV3 CSP compliance (no inline scripts); removed deprecated `navigator.platform` usage.
- Lightbox overlay no longer shows on load.
- X.com DnD: reduced duplicates by preferring files over URLs, filtering placeholders (tiny/0×0/<2KB), content deduplication, and HTML→image extraction (og:image/twitter:image).

### Security/Permissions
- API key stored locally in `chrome.storage.local` (not encrypted). Clear notice in Settings.
- Manifest: `sidePanel`, `storage`, `windows`, `host_permissions` for `generativelanguage.googleapis.com` and `<all_urls>`.

## [0.1.0] - 2025-08-29
### Added
- Initial MV3 scaffold with side panel displaying "Easy Banana" and background service worker.
