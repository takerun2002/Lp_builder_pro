/**
 * Google Drive PDF Loader
 * GoogleドライブからPDFを読み込み
 */

import { google } from "googleapis";
import { getGoogleAuth } from "@/lib/storage/google-auth";

// =============================================================================
// Types
// =============================================================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
}

// =============================================================================
// Google Drive Functions
// =============================================================================

/**
 * GoogleドライブからPDFを読み込み
 */
export async function loadPDFFromGoogleDrive(
  fileId: string
): Promise<ArrayBuffer> {
  const authManager = getGoogleAuth();
  const oauth2Client = await authManager.getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  // ファイル情報を取得
  const fileInfo = await drive.files.get({
    fileId,
    fields: "mimeType, name",
  });

  if (fileInfo.data.mimeType !== "application/pdf") {
    throw new Error(`ファイルはPDFではありません: ${fileInfo.data.mimeType}`);
  }

  // ファイルをダウンロード
  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  return response.data as ArrayBuffer;
}

/**
 * GoogleドライブのPDFファイル一覧を取得
 */
export async function listPDFsFromGoogleDrive(
  folderId?: string
): Promise<DriveFile[]> {
  const authManager = getGoogleAuth();
  const oauth2Client = await authManager.getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  let query = "mimeType='application/pdf' and trashed=false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  const response = await drive.files.list({
    q: query,
    fields: "files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, iconLink)",
    orderBy: "modifiedTime desc",
    pageSize: 50,
  });

  return (response.data.files || []).map((file) => ({
    id: file.id || "",
    name: file.name || "",
    mimeType: file.mimeType || "",
    size: parseInt(file.size || "0", 10),
    createdTime: file.createdTime || undefined,
    modifiedTime: file.modifiedTime || undefined,
    webViewLink: file.webViewLink || undefined,
    iconLink: file.iconLink || undefined,
  }));
}

/**
 * Googleドライブのフォルダ一覧を取得
 */
export async function listFoldersFromGoogleDrive(): Promise<DriveFolder[]> {
  const authManager = getGoogleAuth();
  const oauth2Client = await authManager.getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: "files(id, name)",
    orderBy: "name",
    pageSize: 100,
  });

  return (response.data.files || []).map((folder) => ({
    id: folder.id || "",
    name: folder.name || "",
  }));
}

/**
 * 共有リンクからファイルIDを抽出
 */
export function extractFileIdFromShareLink(shareLink: string): string | null {
  // Google Drive共有リンクのパターン
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,  // https://drive.google.com/file/d/FILE_ID/view
    /id=([a-zA-Z0-9_-]+)/,           // https://drive.google.com/open?id=FILE_ID
    /\/d\/([a-zA-Z0-9_-]+)/,         // 短縮URL
  ];

  for (const pattern of patterns) {
    const match = shareLink.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // 純粋なIDの場合
  if (/^[a-zA-Z0-9_-]+$/.test(shareLink)) {
    return shareLink;
  }

  return null;
}

/**
 * ファイル情報を取得
 */
export async function getFileInfo(fileId: string): Promise<DriveFile | null> {
  try {
    const authManager = getGoogleAuth();
    const oauth2Client = await authManager.getAuthenticatedClient();
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const response = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size, createdTime, modifiedTime, webViewLink, iconLink",
    });

    const file = response.data;
    return {
      id: file.id || "",
      name: file.name || "",
      mimeType: file.mimeType || "",
      size: parseInt(file.size || "0", 10),
      createdTime: file.createdTime || undefined,
      modifiedTime: file.modifiedTime || undefined,
      webViewLink: file.webViewLink || undefined,
      iconLink: file.iconLink || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Google認証状態を確認
 */
export async function checkGoogleAuthStatus(): Promise<{
  authenticated: boolean;
  error?: string;
}> {
  try {
    const authManager = getGoogleAuth();
    const isAuthenticated = await authManager.isAuthenticated();
    return { authenticated: isAuthenticated };
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : "認証状態の確認に失敗",
    };
  }
}
