/**
 * Google Drive Storage Adapter
 * Google Driveを使用したファイルストレージアダプター
 * 画像、HTMLエクスポート、YAMLファイルの保存に使用
 */

import { google, drive_v3 } from "googleapis";
import { getGoogleAuth } from "./google-auth";
import type {
  StorageAdapter,
  StorageMetadata,
  SyncResult,
  DataType,
  DriveFileInfo,
} from "./types";
import { inferDataType } from "./types";

// ルートフォルダ名
const ROOT_FOLDER_NAME = "LP_Builder_Pro";

// MIMEタイプマッピング
const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".html": "text/html",
  ".css": "text/css",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".json": "application/json",
};

export class GoogleDriveAdapter implements StorageAdapter {
  private drive: drive_v3.Drive | null = null;
  private rootFolderId: string | null = null;
  private folderCache: Map<string, string> = new Map();

  /**
   * Drive APIクライアントを取得
   */
  private async getClient(): Promise<drive_v3.Drive> {
    if (this.drive) {
      return this.drive;
    }

    const authManager = getGoogleAuth();
    const auth = await authManager.getAuthenticatedClient();
    this.drive = google.drive({ version: "v3", auth });

    return this.drive;
  }

  /**
   * データを保存
   */
  async save(key: string, data: unknown, dataType?: DataType): Promise<void> {
    const drive = await this.getClient();
    const type = dataType || inferDataType(key);

    // ファイル名とフォルダを解決
    const { folderId, fileName, mimeType } = await this.resolveKeyToFile(key, type);

    // データをバッファに変換
    const content = this.dataToBuffer(data);

    // 既存ファイルを検索
    const existingFileId = await this.findFileByName(folderId, fileName);

    if (existingFileId) {
      // 更新
      await drive.files.update({
        fileId: existingFileId,
        media: {
          mimeType,
          body: content,
        },
      });
    } else {
      // 新規作成
      await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
          mimeType,
        },
        media: {
          mimeType,
          body: content,
        },
      });
    }
  }

  /**
   * データを読み込み
   */
  async load<T = unknown>(key: string): Promise<T | null> {
    const drive = await this.getClient();
    const type = inferDataType(key);

    const { folderId, fileName } = await this.resolveKeyToFile(key, type);

    // ファイルを検索
    const fileId = await this.findFileByName(folderId, fileName);
    if (!fileId) {
      return null;
    }

    // ファイルをダウンロード
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);

    // MIMEタイプに応じてパース
    const ext = this.getExtension(fileName);
    if (ext === ".json" || ext === ".yaml" || ext === ".yml") {
      try {
        return JSON.parse(buffer.toString("utf-8")) as T;
      } catch {
        return buffer.toString("utf-8") as unknown as T;
      }
    }

    // バイナリデータはBase64で返す
    return buffer.toString("base64") as unknown as T;
  }

  /**
   * データを削除
   */
  async delete(key: string): Promise<void> {
    const drive = await this.getClient();
    const type = inferDataType(key);

    const { folderId, fileName } = await this.resolveKeyToFile(key, type);

    // ファイルを検索
    const fileId = await this.findFileByName(folderId, fileName);
    if (!fileId) {
      return;
    }

    // ファイルを削除
    await drive.files.delete({ fileId });
  }

  /**
   * キーの一覧を取得
   */
  async list(prefix?: string): Promise<string[]> {
    const drive = await this.getClient();
    const rootFolderId = await this.ensureRootFolder();

    // すべてのファイルを取得
    const response = await drive.files.list({
      q: `'${rootFolderId}' in parents or '${rootFolderId}' in parents`,
      fields: "files(id, name, parents)",
      pageSize: 1000,
    });

    const files = response.data.files || [];
    const keys = files.map((f) => f.name || "").filter(Boolean);

    if (prefix) {
      return keys.filter((k) => k.startsWith(prefix));
    }

    return keys;
  }

  /**
   * 同期を実行
   */
  async sync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedAt: new Date().toISOString(),
      itemsSynced: 0,
      conflicts: [],
      errors: [],
    };

    // 同期ロジック（将来実装）

    return result;
  }

  /**
   * メタデータを取得
   */
  async getMetadata(key: string): Promise<StorageMetadata | null> {
    const drive = await this.getClient();
    const type = inferDataType(key);

    const { folderId, fileName } = await this.resolveKeyToFile(key, type);

    // ファイルを検索
    const fileId = await this.findFileByName(folderId, fileName);
    if (!fileId) {
      return null;
    }

    // ファイルメタデータを取得
    const response = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size, createdTime, modifiedTime, md5Checksum",
    });

    const file = response.data;

    return {
      key,
      dataType: type,
      createdAt: file.createdTime || "",
      updatedAt: file.modifiedTime || "",
      checksum: file.md5Checksum || undefined,
      size: file.size ? parseInt(file.size) : undefined,
      source: "google_drive",
    };
  }

  // ==========================================================================
  // Public Utility Methods
  // ==========================================================================

  /**
   * 画像をアップロード
   */
  async uploadImage(
    projectId: string,
    imageData: Buffer | string,
    filename: string
  ): Promise<DriveFileInfo> {
    const drive = await this.getClient();
    const folderId = await this.ensureProjectFolder(projectId, "images");

    const buffer = typeof imageData === "string"
      ? Buffer.from(imageData, "base64")
      : imageData;
    const mimeType = MIME_TYPES[this.getExtension(filename)] || "image/png";

    const response = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
        mimeType,
      },
      media: {
        mimeType,
        body: buffer,
      },
      fields: "id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink",
    });

    const file = response.data;

    return {
      fileId: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size ? parseInt(file.size) : 0,
      createdTime: file.createdTime!,
      modifiedTime: file.modifiedTime!,
      webViewLink: file.webViewLink || undefined,
      webContentLink: file.webContentLink || undefined,
    };
  }

  /**
   * 画像をダウンロード
   */
  async downloadImage(fileId: string): Promise<Buffer> {
    const drive = await this.getClient();

    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    return Buffer.from(response.data as ArrayBuffer);
  }

  /**
   * HTMLエクスポートをアップロード
   */
  async uploadHtmlExport(
    projectId: string,
    html: string,
    css: string,
    filename: string
  ): Promise<{ htmlFile: DriveFileInfo; cssFile?: DriveFileInfo }> {
    const drive = await this.getClient();
    const folderId = await this.ensureProjectFolder(projectId, "exports");

    // HTMLファイルをアップロード
    const htmlResponse = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
        mimeType: "text/html",
      },
      media: {
        mimeType: "text/html",
        body: html,
      },
      fields: "id, name, mimeType, size, createdTime, modifiedTime, webViewLink",
    });

    const htmlFile = htmlResponse.data;
    const result: { htmlFile: DriveFileInfo; cssFile?: DriveFileInfo } = {
      htmlFile: {
        fileId: htmlFile.id!,
        name: htmlFile.name!,
        mimeType: htmlFile.mimeType!,
        size: htmlFile.size ? parseInt(htmlFile.size) : 0,
        createdTime: htmlFile.createdTime!,
        modifiedTime: htmlFile.modifiedTime!,
        webViewLink: htmlFile.webViewLink || undefined,
      },
    };

    // CSSがある場合は別ファイルとしてアップロード
    if (css) {
      const cssFilename = filename.replace(/\.html?$/i, ".css");
      const cssResponse = await drive.files.create({
        requestBody: {
          name: cssFilename,
          parents: [folderId],
          mimeType: "text/css",
        },
        media: {
          mimeType: "text/css",
          body: css,
        },
        fields: "id, name, mimeType, size, createdTime, modifiedTime",
      });

      const cssFile = cssResponse.data;
      result.cssFile = {
        fileId: cssFile.id!,
        name: cssFile.name!,
        mimeType: cssFile.mimeType!,
        size: cssFile.size ? parseInt(cssFile.size) : 0,
        createdTime: cssFile.createdTime!,
        modifiedTime: cssFile.modifiedTime!,
      };
    }

    return result;
  }

  /**
   * ファイルを共有
   */
  async shareFile(
    fileId: string,
    email: string,
    role: "reader" | "writer" = "reader"
  ): Promise<void> {
    const drive = await this.getClient();

    await drive.permissions.create({
      fileId,
      requestBody: {
        type: "user",
        role,
        emailAddress: email,
      },
    });
  }

  /**
   * 公開リンクを取得
   */
  async getPublicLink(fileId: string): Promise<string | null> {
    const drive = await this.getClient();

    // 誰でも閲覧可能に設定
    await drive.permissions.create({
      fileId,
      requestBody: {
        type: "anyone",
        role: "reader",
      },
    });

    // Webリンクを取得
    const response = await drive.files.get({
      fileId,
      fields: "webViewLink",
    });

    return response.data.webViewLink || null;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * ルートフォルダを確保
   */
  private async ensureRootFolder(): Promise<string> {
    if (this.rootFolderId) {
      return this.rootFolderId;
    }

    const drive = await this.getClient();

    // 既存のルートフォルダを検索
    const response = await drive.files.list({
      q: `name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
    });

    if (response.data.files && response.data.files.length > 0) {
      this.rootFolderId = response.data.files[0].id!;
      return this.rootFolderId;
    }

    // 新規作成
    const createResponse = await drive.files.create({
      requestBody: {
        name: ROOT_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });

    this.rootFolderId = createResponse.data.id!;
    return this.rootFolderId;
  }

  /**
   * プロジェクトフォルダを確保
   */
  private async ensureProjectFolder(projectId: string, subFolder?: string): Promise<string> {
    const cacheKey = subFolder ? `${projectId}/${subFolder}` : projectId;

    const cached = this.folderCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    await this.getClient(); // Ensure client is initialized
    const rootFolderId = await this.ensureRootFolder();

    // プロジェクトフォルダを検索または作成
    let projectFolderId = await this.findOrCreateFolder(rootFolderId, projectId);

    // サブフォルダが指定されている場合
    if (subFolder) {
      projectFolderId = await this.findOrCreateFolder(projectFolderId, subFolder);
    }

    this.folderCache.set(cacheKey, projectFolderId);
    return projectFolderId;
  }

  /**
   * フォルダを検索または作成
   */
  private async findOrCreateFolder(parentId: string, folderName: string): Promise<string> {
    const drive = await this.getClient();

    // 検索
    const response = await drive.files.list({
      q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // 作成
    const createResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        parents: [parentId],
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });

    return createResponse.data.id!;
  }

  /**
   * キーからファイル情報を解決
   */
  private async resolveKeyToFile(
    key: string,
    dataType: DataType
  ): Promise<{ folderId: string; fileName: string; mimeType: string }> {
    // キー形式: "project:{projectId}:{type}:{filename}" or "{type}:{filename}"
    const parts = key.split(":");
    let projectId = "default";
    let fileName = key;

    if (parts[0] === "project" && parts.length >= 3) {
      projectId = parts[1];
      fileName = parts.slice(2).join("_");
    } else if (parts.length >= 2) {
      fileName = parts.join("_");
    }

    // データタイプに応じたサブフォルダ
    let subFolder: string | undefined;
    if (dataType === "generated_image") {
      subFolder = "images";
    } else if (dataType === "lp_export") {
      subFolder = "exports";
    } else if (dataType === "knowledge_yaml") {
      subFolder = "knowledge";
    }

    const folderId = await this.ensureProjectFolder(projectId, subFolder);
    const ext = this.getExtension(fileName) || this.getDefaultExtension(dataType);
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    // 拡張子がない場合は追加
    if (!this.getExtension(fileName)) {
      fileName = `${fileName}${ext}`;
    }

    return { folderId, fileName, mimeType };
  }

  /**
   * ファイル名で検索
   */
  private async findFileByName(folderId: string, fileName: string): Promise<string | null> {
    const drive = await this.getClient();

    const response = await drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      fields: "files(id)",
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    return null;
  }

  /**
   * データをバッファに変換
   */
  private dataToBuffer(data: unknown): Buffer | string {
    if (Buffer.isBuffer(data)) {
      return data;
    }

    if (typeof data === "string") {
      // Base64エンコードされた画像データの場合
      if (data.startsWith("data:")) {
        const base64 = data.split(",")[1];
        return Buffer.from(base64, "base64");
      }
      return data;
    }

    // オブジェクトの場合はJSONに変換
    return JSON.stringify(data, null, 2);
  }

  /**
   * ファイル名から拡張子を取得
   */
  private getExtension(fileName: string): string {
    const match = fileName.match(/\.[^.]+$/);
    return match ? match[0].toLowerCase() : "";
  }

  /**
   * データタイプからデフォルト拡張子を取得
   */
  private getDefaultExtension(dataType: DataType): string {
    switch (dataType) {
      case "generated_image":
        return ".png";
      case "lp_export":
        return ".html";
      case "knowledge_yaml":
        return ".yaml";
      default:
        return ".json";
    }
  }
}

// シングルトンインスタンス
let instance: GoogleDriveAdapter | null = null;

export function getGoogleDrive(): GoogleDriveAdapter {
  if (!instance) {
    instance = new GoogleDriveAdapter();
  }
  return instance;
}
