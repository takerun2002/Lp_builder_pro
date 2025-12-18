/**
 * Google Apps Script Templates
 * スプレッドシート連携のためのGASテンプレート
 */

// =============================================================================
// Types
// =============================================================================

export interface GASTemplate {
  id: string;
  name: string;
  description: string;
  category: "automation" | "notification" | "sync" | "report";
  code: string;
  setupInstructions: string[];
  triggers?: GASTemplateTrigger[];
}

export interface GASTemplateTrigger {
  type: "time" | "onEdit" | "onFormSubmit" | "onChange";
  config?: {
    everyMinutes?: number;
    everyHours?: number;
    everyDays?: number;
    atHour?: number;
  };
}

// =============================================================================
// GAS Code Templates (as plain strings)
// =============================================================================

const SLACK_CODE = [
  '/**',
  ' * LP Builder Pro - Slack通知スクリプト',
  ' *',
  ' * 設定方法:',
  ' * 1. スクリプトエディタを開く（拡張機能 > Apps Script）',
  ' * 2. SLACK_WEBHOOK_URLを設定',
  ' * 3. トリガーを追加（onEdit）',
  ' */',
  '',
  'const SLACK_WEBHOOK_URL = "YOUR_SLACK_WEBHOOK_URL";',
  '',
  'function onEdit(e) {',
  '  const sheet = e.source.getActiveSheet();',
  '  const range = e.range;',
  '  const sheetName = sheet.getName();',
  '',
  '  // 特定のシートのみ通知',
  '  const targetSheets = ["リサーチ結果", "コンセプト案", "進捗管理"];',
  '  if (!targetSheets.includes(sheetName)) return;',
  '',
  '  const row = range.getRow();',
  '  const col = range.getColumn();',
  '  const newValue = e.value;',
  '  const oldValue = e.oldValue;',
  '',
  '  // ステータス列が変更された場合のみ通知',
  '  const statusColumns = {',
  '    "リサーチ結果": -1, // 対象外',
  '    "コンセプト案": 7,   // G列: ステータス',
  '    "進捗管理": 5,       // E列: ステータス',
  '  };',
  '',
  '  if (statusColumns[sheetName] !== col) return;',
  '',
  '  // 行のデータを取得',
  '  const rowData = sheet.getRange(row, 1, 1, 10).getValues()[0];',
  '  const projectName = rowData[1] || "不明";',
  '  const taskName = rowData[3] || rowData[2] || "不明";',
  '',
  '  const message = {',
  '    text: `:sparkles: *${sheetName}が更新されました*`,',
  '    blocks: [',
  '      {',
  '        type: "section",',
  '        text: {',
  '          type: "mrkdwn",',
  '          text: `*${sheetName}が更新されました*\\nプロジェクト: ${projectName}\\n項目: ${taskName}\\nステータス: ${oldValue || "なし"} → ${newValue}`',
  '        }',
  '      }',
  '    ]',
  '  };',
  '',
  '  sendSlackNotification(message);',
  '}',
  '',
  'function sendSlackNotification(payload) {',
  '  if (!SLACK_WEBHOOK_URL || SLACK_WEBHOOK_URL === "YOUR_SLACK_WEBHOOK_URL") {',
  '    console.log("Slack Webhook URLが設定されていません");',
  '    return;',
  '  }',
  '',
  '  const options = {',
  '    method: "post",',
  '    contentType: "application/json",',
  '    payload: JSON.stringify(payload)',
  '  };',
  '',
  '  try {',
  '    UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options);',
  '  } catch (error) {',
  '    console.error("Slack通知エラー:", error);',
  '  }',
  '}',
].join('\n');

const DAILY_REPORT_CODE = [
  '/**',
  ' * LP Builder Pro - 日次レポートスクリプト',
  ' *',
  ' * 設定方法:',
  ' * 1. REPORT_EMAIL_TOにメールアドレスを設定',
  ' * 2. 時間主導型トリガーを追加（毎日9:00）',
  ' */',
  '',
  'const REPORT_EMAIL_TO = "your-email@example.com";',
  '',
  'function generateDailyReport() {',
  '  const ss = SpreadsheetApp.getActiveSpreadsheet();',
  '',
  '  // 進捗管理シートを取得',
  '  const progressSheet = ss.getSheetByName("進捗管理");',
  '  if (!progressSheet) {',
  '    console.log("進捗管理シートが見つかりません");',
  '    return;',
  '  }',
  '',
  '  const data = progressSheet.getDataRange().getValues();',
  '  const rows = data.slice(1);',
  '',
  '  // ステータス別に集計',
  '  const summary = {',
  '    pending: [],',
  '    in_progress: [],',
  '    completed_today: []',
  '  };',
  '',
  '  const today = new Date();',
  '  today.setHours(0, 0, 0, 0);',
  '',
  '  rows.forEach(row => {',
  '    const status = row[4];',
  '    const completedAt = row[7];',
  '    const projectName = row[1];',
  '    const task = row[3];',
  '',
  '    if (status === "pending") {',
  '      summary.pending.push({ projectName, task });',
  '    } else if (status === "in_progress") {',
  '      summary.in_progress.push({ projectName, task });',
  '    } else if (status === "completed" && completedAt) {',
  '      const completedDate = new Date(completedAt);',
  '      completedDate.setHours(0, 0, 0, 0);',
  '      if (completedDate.getTime() === today.getTime()) {',
  '        summary.completed_today.push({ projectName, task });',
  '      }',
  '    }',
  '  });',
  '',
  '  // メール本文を生成',
  '  const emailBody = [',
  '    "LP Builder Pro 日次レポート",',
  '    "=========================",',
  '    `日付: ${Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy/MM/dd")}`,',
  '    "",',
  '    `■ 進行中のタスク (${summary.in_progress.length}件)`,',
  '    summary.in_progress.map(t => `  - [${t.projectName}] ${t.task}`).join("\\n") || "  なし",',
  '    "",',
  '    `■ 本日完了したタスク (${summary.completed_today.length}件)`,',
  '    summary.completed_today.map(t => `  - [${t.projectName}] ${t.task}`).join("\\n") || "  なし",',
  '    "",',
  '    `■ 未着手のタスク (${summary.pending.length}件)`,',
  '    summary.pending.map(t => `  - [${t.projectName}] ${t.task}`).join("\\n") || "  なし",',
  '    "",',
  '    "---",',
  '    "このメールは LP Builder Pro により自動生成されました。",',
  '    `スプレッドシート: ${ss.getUrl()}`',
  '  ].join("\\n");',
  '',
  '  // メール送信',
  '  if (REPORT_EMAIL_TO && REPORT_EMAIL_TO !== "your-email@example.com") {',
  '    MailApp.sendEmail({',
  '      to: REPORT_EMAIL_TO,',
  '      subject: `[LP Builder Pro] 日次レポート ${Utilities.formatDate(new Date(), "Asia/Tokyo", "MM/dd")}`,',
  '      body: emailBody',
  '    });',
  '    console.log("日次レポートを送信しました");',
  '  } else {',
  '    console.log("メールアドレスが設定されていません");',
  '    console.log(emailBody);',
  '  }',
  '}',
].join('\n');

const BACKUP_CODE = [
  '/**',
  ' * LP Builder Pro - 自動バックアップスクリプト',
  ' *',
  ' * 設定方法:',
  ' * 1. BACKUP_FOLDER_IDにバックアップ先フォルダのIDを設定',
  ' * 2. 時間主導型トリガーを追加（毎日2:00）',
  ' */',
  '',
  'const BACKUP_FOLDER_ID = "YOUR_BACKUP_FOLDER_ID";',
  'const MAX_BACKUPS = 7;',
  '',
  'function createBackup() {',
  '  const ss = SpreadsheetApp.getActiveSpreadsheet();',
  '  const ssId = ss.getId();',
  '  const ssName = ss.getName();',
  '',
  '  // バックアップファイル名',
  '  const timestamp = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMdd_HHmmss");',
  '  const backupName = `${ssName}_backup_${timestamp}`;',
  '',
  '  // バックアップ先フォルダ',
  '  let folder;',
  '  if (BACKUP_FOLDER_ID && BACKUP_FOLDER_ID !== "YOUR_BACKUP_FOLDER_ID") {',
  '    folder = DriveApp.getFolderById(BACKUP_FOLDER_ID);',
  '  } else {',
  '    const file = DriveApp.getFileById(ssId);',
  '    folder = file.getParents().next();',
  '  }',
  '',
  '  // スプレッドシートをコピー',
  '  const file = DriveApp.getFileById(ssId);',
  '  const backup = file.makeCopy(backupName, folder);',
  '',
  '  console.log(`バックアップを作成しました: ${backup.getName()}`);',
  '',
  '  // 古いバックアップを削除',
  '  cleanOldBackups(folder, ssName);',
  '}',
  '',
  'function cleanOldBackups(folder, baseName) {',
  '  const files = folder.getFiles();',
  '  const backups = [];',
  '',
  '  while (files.hasNext()) {',
  '    const file = files.next();',
  '    if (file.getName().startsWith(`${baseName}_backup_`)) {',
  '      backups.push({',
  '        file: file,',
  '        date: file.getDateCreated()',
  '      });',
  '    }',
  '  }',
  '',
  '  // 日付順にソート（新しい順）',
  '  backups.sort((a, b) => b.date - a.date);',
  '',
  '  // 古いバックアップを削除',
  '  for (let i = MAX_BACKUPS; i < backups.length; i++) {',
  '    console.log(`古いバックアップを削除: ${backups[i].file.getName()}`);',
  '    backups[i].file.setTrashed(true);',
  '  }',
  '}',
].join('\n');

const FORM_IMPORT_CODE = [
  '/**',
  ' * LP Builder Pro - フォーム回答インポートスクリプト',
  ' *',
  ' * 設定方法:',
  ' * 1. Googleフォームを作成（ヒアリングシート用）',
  ' * 2. フォームの回答先をこのスプレッドシートに設定',
  ' * 3. onFormSubmit トリガーを追加',
  ' */',
  '',
  'function onFormSubmit(e) {',
  '  const responses = e.namedValues;',
  '  const timestamp = new Date();',
  '',
  '  const ss = SpreadsheetApp.getActiveSpreadsheet();',
  '  const researchSheet = ss.getSheetByName("リサーチ結果");',
  '',
  '  if (!researchSheet) {',
  '    console.log("リサーチ結果シートが見つかりません");',
  '    return;',
  '  }',
  '',
  '  // フォームの質問名をマッピング',
  '  const projectName = responses["プロジェクト名"]?.[0] || "未設定";',
  '  const targetAudience = responses["ターゲット顧客"]?.[0] || "";',
  '  const painPoints = responses["課題・悩み"]?.[0] || "";',
  '  const desiredOutcome = responses["理想の状態"]?.[0] || "";',
  '  const competitors = responses["競合情報"]?.[0] || "";',
  '',
  '  const records = [];',
  '',
  '  if (targetAudience) {',
  '    records.push([',
  '      generateId(), projectName, "N1インタビュー", "ヒアリングフォーム",',
  '      "ターゲット顧客情報", "", targetAudience, "", timestamp.toISOString()',
  '    ]);',
  '  }',
  '',
  '  if (painPoints) {',
  '    records.push([',
  '      generateId(), projectName, "ペインポイント", "ヒアリングフォーム",',
  '      "課題・悩み", "", painPoints, "", timestamp.toISOString()',
  '    ]);',
  '  }',
  '',
  '  if (desiredOutcome) {',
  '    records.push([',
  '      generateId(), projectName, "ベネフィット", "ヒアリングフォーム",',
  '      "理想の状態", "", desiredOutcome, "", timestamp.toISOString()',
  '    ]);',
  '  }',
  '',
  '  if (competitors) {',
  '    records.push([',
  '      generateId(), projectName, "競合分析", "ヒアリングフォーム",',
  '      "競合情報", "", competitors, "", timestamp.toISOString()',
  '    ]);',
  '  }',
  '',
  '  if (records.length > 0) {',
  '    const lastRow = researchSheet.getLastRow();',
  '    researchSheet.getRange(lastRow + 1, 1, records.length, 9).setValues(records);',
  '    console.log(`${records.length}件のレコードを追加しました`);',
  '  }',
  '}',
  '',
  'function generateId() {',
  '  return Utilities.getUuid().replace(/-/g, "").substring(0, 12);',
  '}',
].join('\n');

const DATA_VALIDATION_CODE = [
  '/**',
  ' * LP Builder Pro - データ検証スクリプト',
  ' *',
  ' * 設定方法:',
  ' * 1. ALERT_EMAIL_TOにアラート送信先を設定',
  ' * 2. 時間主導型トリガーを追加（6時間ごと）',
  ' */',
  '',
  'const ALERT_EMAIL_TO = "your-email@example.com";',
  '',
  'function validateData() {',
  '  const ss = SpreadsheetApp.getActiveSpreadsheet();',
  '  const issues = [];',
  '',
  '  // 進捗管理シートの検証',
  '  const progressSheet = ss.getSheetByName("進捗管理");',
  '  if (progressSheet) {',
  '    const data = progressSheet.getDataRange().getValues();',
  '    const rows = data.slice(1);',
  '',
  '    rows.forEach((row, index) => {',
  '      const rowNum = index + 2;',
  '      const status = row[4];',
  '      const dueDate = row[6];',
  '',
  '      // 期限超過チェック',
  '      if (status !== "completed" && dueDate) {',
  '        const due = new Date(dueDate);',
  '        if (due < new Date()) {',
  '          issues.push({',
  '            sheet: "進捗管理",',
  '            row: rowNum,',
  '            message: `期限超過: ${row[3]} (期限: ${Utilities.formatDate(due, "Asia/Tokyo", "yyyy/MM/dd")})`',
  '          });',
  '        }',
  '      }',
  '',
  '      // 必須項目チェック',
  '      if (!row[1] || !row[3]) {',
  '        issues.push({',
  '          sheet: "進捗管理",',
  '          row: rowNum,',
  '          message: "必須項目（プロジェクト名またはタスク）が空です"',
  '        });',
  '      }',
  '    });',
  '  }',
  '',
  '  // コンセプト案シートの検証',
  '  const conceptSheet = ss.getSheetByName("コンセプト案");',
  '  if (conceptSheet) {',
  '    const data = conceptSheet.getDataRange().getValues();',
  '    const rows = data.slice(1);',
  '    const projectConcepts = {};',
  '',
  '    rows.forEach((row) => {',
  '      const projectName = row[1];',
  '      const status = row[6];',
  '',
  '      if (status === "approved") {',
  '        projectConcepts[projectName] = (projectConcepts[projectName] || 0) + 1;',
  '      }',
  '    });',
  '',
  '    Object.entries(projectConcepts).forEach(([project, count]) => {',
  '      if (count > 1) {',
  '        issues.push({',
  '          sheet: "コンセプト案",',
  '          row: "-",',
  '          message: `${project}: 複数のコンセプトが採用されています (${count}件)`',
  '        });',
  '      }',
  '    });',
  '  }',
  '',
  '  if (issues.length > 0) {',
  '    sendAlert(issues);',
  '  } else {',
  '    console.log("データ検証完了: 問題なし");',
  '  }',
  '}',
  '',
  'function sendAlert(issues) {',
  '  const ss = SpreadsheetApp.getActiveSpreadsheet();',
  '',
  '  const emailBody = [',
  '    "LP Builder Pro データ検証アラート",',
  '    "================================",',
  '    "",',
  '    "以下の問題が検出されました:",',
  '    "",',
  '    issues.map(issue => `[${issue.sheet}] 行${issue.row}: ${issue.message}`).join("\\n"),',
  '    "",',
  '    "---",',
  '    `スプレッドシート: ${ss.getUrl()}`',
  '  ].join("\\n");',
  '',
  '  if (ALERT_EMAIL_TO && ALERT_EMAIL_TO !== "your-email@example.com") {',
  '    MailApp.sendEmail({',
  '      to: ALERT_EMAIL_TO,',
  '      subject: "[LP Builder Pro] データ検証アラート",',
  '      body: emailBody',
  '    });',
  '    console.log(`アラートを送信しました: ${issues.length}件の問題`);',
  '  } else {',
  '    console.log("アラートメールアドレスが設定されていません");',
  '    console.log(emailBody);',
  '  }',
  '}',
].join('\n');

// =============================================================================
// GAS Templates
// =============================================================================

const SLACK_NOTIFICATION_TEMPLATE: GASTemplate = {
  id: "slack-notification",
  name: "Slack通知",
  description: "スプレッドシートが更新されたらSlackに通知",
  category: "notification",
  triggers: [{ type: "onEdit" }],
  setupInstructions: [
    "1. SlackでIncoming Webhookを作成",
    "2. Webhook URLをSLACK_WEBHOOK_URLに設定",
    "3. onEdit トリガーを設定",
  ],
  code: SLACK_CODE,
};

const DAILY_REPORT_TEMPLATE: GASTemplate = {
  id: "daily-report",
  name: "日次レポート",
  description: "毎日の進捗をメールで送信",
  category: "report",
  triggers: [{ type: "time", config: { everyDays: 1, atHour: 9 } }],
  setupInstructions: [
    "1. REPORT_EMAIL_TOを設定",
    "2. 時間主導型トリガーを追加（毎日9時）",
  ],
  code: DAILY_REPORT_CODE,
};

const BACKUP_TEMPLATE: GASTemplate = {
  id: "auto-backup",
  name: "自動バックアップ",
  description: "スプレッドシートを定期的にバックアップ",
  category: "automation",
  triggers: [{ type: "time", config: { everyDays: 1, atHour: 2 } }],
  setupInstructions: [
    "1. BACKUP_FOLDER_IDを設定（GoogleドライブのフォルダID）",
    "2. 時間主導型トリガーを追加（毎日2時）",
  ],
  code: BACKUP_CODE,
};

const FORM_IMPORT_TEMPLATE: GASTemplate = {
  id: "form-import",
  name: "フォーム回答インポート",
  description: "Googleフォームの回答を自動インポート",
  category: "sync",
  triggers: [{ type: "onFormSubmit" }],
  setupInstructions: [
    "1. Googleフォームを作成",
    "2. フォームの回答先をこのスプレッドシートに設定",
    "3. フォーム送信トリガーを追加",
  ],
  code: FORM_IMPORT_CODE,
};

const DATA_VALIDATION_TEMPLATE: GASTemplate = {
  id: "data-validation",
  name: "データ検証",
  description: "データの整合性をチェックしてアラート",
  category: "automation",
  triggers: [{ type: "time", config: { everyHours: 6 } }],
  setupInstructions: [
    "1. ALERT_EMAIL_TOを設定",
    "2. 時間主導型トリガーを追加（6時間ごと）",
  ],
  code: DATA_VALIDATION_CODE,
};

// =============================================================================
// Template Collection
// =============================================================================

export const GAS_TEMPLATES: GASTemplate[] = [
  SLACK_NOTIFICATION_TEMPLATE,
  DAILY_REPORT_TEMPLATE,
  BACKUP_TEMPLATE,
  FORM_IMPORT_TEMPLATE,
  DATA_VALIDATION_TEMPLATE,
];

/**
 * テンプレートをIDで取得
 */
export function getGASTemplate(id: string): GASTemplate | undefined {
  return GAS_TEMPLATES.find((t) => t.id === id);
}

/**
 * カテゴリでテンプレートをフィルタ
 */
export function getGASTemplatesByCategory(category: GASTemplate["category"]): GASTemplate[] {
  return GAS_TEMPLATES.filter((t) => t.category === category);
}

/**
 * テンプレートコードを生成（設定値を埋め込み）
 */
export function generateGASCode(
  templateId: string,
  config: Record<string, string>
): string | null {
  const template = getGASTemplate(templateId);
  if (!template) return null;

  let code = template.code;

  // 設定値を埋め込み
  Object.entries(config).forEach(([key, value]) => {
    const placeholder = new RegExp(`(const ${key} = )"[^"]*"`, "g");
    code = code.replace(placeholder, `$1"${value}"`);
  });

  return code;
}
