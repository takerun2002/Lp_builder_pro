/**
 * Google Docs Exporter
 * 提案書をGoogleドキュメント/スライドにエクスポート
 */

import { google, docs_v1, slides_v1 } from "googleapis";
import { getGoogleAuth } from "@/lib/storage/google-auth";
import type { GeneratedProposal } from "@/lib/documents/proposal-generator";

// =============================================================================
// Types
// =============================================================================

export type ExportFormat = "docs" | "slides" | "pdf";

export interface ExportOptions {
  format: ExportFormat;
  folderId?: string; // Google Driveフォルダ指定
  shareWithEmails?: string[]; // 共有先メール
  makePublic?: boolean;
}

export interface ExportResult {
  success: boolean;
  documentId?: string;
  documentUrl?: string;
  pdfUrl?: string;
  error?: string;
}

// =============================================================================
// Google Docs Exporter
// =============================================================================

/**
 * Google Docsにエクスポート
 */
export async function exportToGoogleDocs(
  proposal: GeneratedProposal,
  options: ExportOptions = { format: "docs" }
): Promise<ExportResult> {
  try {
    const authManager = getGoogleAuth();
    const oauth2Client = await authManager.getAuthenticatedClient();

    if (options.format === "docs") {
      return await createGoogleDoc(proposal, oauth2Client, options);
    } else if (options.format === "slides") {
      return await createGoogleSlides(proposal, oauth2Client, options);
    } else if (options.format === "pdf") {
      // まずDocsを作成してPDFに変換
      const docResult = await createGoogleDoc(proposal, oauth2Client, options);
      if (!docResult.success || !docResult.documentId) {
        return docResult;
      }
      return await exportDocToPdf(docResult.documentId, oauth2Client);
    }

    return {
      success: false,
      error: `Unknown format: ${options.format}`,
    };
  } catch (error) {
    console.error("[docs-exporter] Export failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "エクスポートに失敗しました",
    };
  }
}

// =============================================================================
// Google Docs Creation
// =============================================================================

async function createGoogleDoc(
  proposal: GeneratedProposal,
  auth: InstanceType<typeof google.auth.OAuth2>,
  options: ExportOptions
): Promise<ExportResult> {
  const docs = google.docs({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });

  // 1. ドキュメント作成
  const createResponse = await docs.documents.create({
    requestBody: {
      title: `${proposal.metadata.projectName} - 提案書`,
    },
  });

  const documentId = createResponse.data.documentId;
  if (!documentId) {
    return { success: false, error: "ドキュメントIDの取得に失敗しました" };
  }

  // 2. コンテンツを挿入
  const requests = buildDocumentRequests(proposal);
  await docs.documents.batchUpdate({
    documentId,
    requestBody: { requests },
  });

  // 3. フォルダに移動（指定があれば）
  if (options.folderId) {
    await drive.files.update({
      fileId: documentId,
      addParents: options.folderId,
    });
  }

  // 4. 共有設定
  if (options.shareWithEmails && options.shareWithEmails.length > 0) {
    for (const email of options.shareWithEmails) {
      await drive.permissions.create({
        fileId: documentId,
        requestBody: {
          type: "user",
          role: "reader",
          emailAddress: email,
        },
      });
    }
  }

  if (options.makePublic) {
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        type: "anyone",
        role: "reader",
      },
    });
  }

  return {
    success: true,
    documentId,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

function buildDocumentRequests(proposal: GeneratedProposal): docs_v1.Schema$Request[] {
  const requests: docs_v1.Schema$Request[] = [];
  let currentIndex = 1; // ドキュメントの挿入位置

  // タイトル挿入
  const title = `${proposal.metadata.projectName} - LP制作提案書\n\n`;
  requests.push({
    insertText: {
      location: { index: currentIndex },
      text: title,
    },
  });
  requests.push({
    updateParagraphStyle: {
      range: {
        startIndex: currentIndex,
        endIndex: currentIndex + title.length - 2,
      },
      paragraphStyle: {
        namedStyleType: "TITLE",
      },
      fields: "namedStyleType",
    },
  });
  currentIndex += title.length;

  // 各セクションを挿入
  for (const section of proposal.sections) {
    // セクションタイトル
    const sectionTitle = `${section.title}\n`;
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: sectionTitle,
      },
    });
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + sectionTitle.length - 1,
        },
        paragraphStyle: {
          namedStyleType: "HEADING_1",
        },
        fields: "namedStyleType",
      },
    });
    currentIndex += sectionTitle.length;

    // セクションコンテンツ（Markdownを簡易変換）
    const content = markdownToPlainText(section.content) + "\n\n";
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: content,
      },
    });
    currentIndex += content.length;
  }

  // フッター
  const footer = `\n\n---\n本提案書は LP Builder Pro により自動生成されました\n生成日時: ${new Date().toLocaleString("ja-JP")}`;
  requests.push({
    insertText: {
      location: { index: currentIndex },
      text: footer,
    },
  });

  return requests;
}

function markdownToPlainText(markdown: string): string {
  return markdown
    // 見出しのマークを削除
    .replace(/^#{1,3}\s+/gm, "")
    // 太字を通常テキストに
    .replace(/\*\*(.+?)\*\*/g, "$1")
    // 斜体を通常テキストに
    .replace(/\*(.+?)\*/g, "$1")
    // リストマークを保持
    .replace(/^-\s+/gm, "• ")
    // 引用を通常テキストに
    .replace(/^>\s+/gm, "")
    // 水平線を変換
    .replace(/^---$/gm, "────────────────");
}

// =============================================================================
// Google Slides Creation
// =============================================================================

async function createGoogleSlides(
  proposal: GeneratedProposal,
  auth: InstanceType<typeof google.auth.OAuth2>,
  options: ExportOptions
): Promise<ExportResult> {
  const slides = google.slides({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });

  // 1. プレゼンテーション作成
  const createResponse = await slides.presentations.create({
    requestBody: {
      title: `${proposal.metadata.projectName} - 提案書`,
    },
  });

  const presentationId = createResponse.data.presentationId;
  if (!presentationId) {
    return { success: false, error: "プレゼンテーションIDの取得に失敗しました" };
  }

  // 2. スライドを追加
  const requests = buildSlideRequests(proposal, createResponse.data);
  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: { requests },
  });

  // 3. フォルダに移動
  if (options.folderId) {
    await drive.files.update({
      fileId: presentationId,
      addParents: options.folderId,
    });
  }

  // 4. 共有設定
  if (options.shareWithEmails && options.shareWithEmails.length > 0) {
    for (const email of options.shareWithEmails) {
      await drive.permissions.create({
        fileId: presentationId,
        requestBody: {
          type: "user",
          role: "reader",
          emailAddress: email,
        },
      });
    }
  }

  return {
    success: true,
    documentId: presentationId,
    documentUrl: `https://docs.google.com/presentation/d/${presentationId}/edit`,
  };
}

function buildSlideRequests(
  proposal: GeneratedProposal,
  presentation: slides_v1.Schema$Presentation
): slides_v1.Schema$Request[] {
  const requests: slides_v1.Schema$Request[] = [];

  // タイトルスライドの更新（最初のスライドを使用）
  const titleSlideId = presentation.slides?.[0]?.objectId;
  if (titleSlideId) {
    const titleShape = presentation.slides?.[0]?.pageElements?.find(
      (el) => el.shape?.placeholder?.type === "CENTERED_TITLE" || el.shape?.placeholder?.type === "TITLE"
    );
    const subtitleShape = presentation.slides?.[0]?.pageElements?.find(
      (el) => el.shape?.placeholder?.type === "SUBTITLE"
    );

    if (titleShape?.objectId) {
      requests.push({
        insertText: {
          objectId: titleShape.objectId,
          text: proposal.metadata.projectName,
        },
      });
    }

    if (subtitleShape?.objectId) {
      requests.push({
        insertText: {
          objectId: subtitleShape.objectId,
          text: "LP制作提案書",
        },
      });
    }
  }

  // 各セクションのスライドを追加
  for (const section of proposal.sections) {
    const slideId = `slide_${section.id}_${Date.now()}`;

    // スライド追加
    requests.push({
      createSlide: {
        objectId: slideId,
        slideLayoutReference: {
          predefinedLayout: "TITLE_AND_BODY",
        },
      },
    });

    // タイトルと本文の追加はbatchUpdate後に別途行う必要がある
    // ここでは基本的なスライド構造のみ作成
  }

  return requests;
}

// =============================================================================
// PDF Export
// =============================================================================

async function exportDocToPdf(
  documentId: string,
  auth: InstanceType<typeof google.auth.OAuth2>
): Promise<ExportResult> {
  const drive = google.drive({ version: "v3", auth });

  try {
    const response = await drive.files.export({
      fileId: documentId,
      mimeType: "application/pdf",
    });

    // PDFデータを取得
    const pdfData = response.data;

    // Google Driveにアップロード
    const uploadResponse = await drive.files.create({
      requestBody: {
        name: `proposal_${documentId}.pdf`,
        mimeType: "application/pdf",
      },
      media: {
        mimeType: "application/pdf",
        body: pdfData as NodeJS.ReadableStream,
      },
    });

    const pdfFileId = uploadResponse.data.id;
    if (!pdfFileId) {
      return { success: false, error: "PDFファイルの作成に失敗しました" };
    }

    return {
      success: true,
      documentId,
      documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
      pdfUrl: `https://drive.google.com/file/d/${pdfFileId}/view`,
    };
  } catch (error) {
    console.error("[docs-exporter] PDF export failed:", error);
    return {
      success: false,
      error: "PDF出力に失敗しました",
    };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Google Drive内のフォルダ一覧を取得
 */
export async function listDriveFolders(): Promise<{ id: string; name: string }[]> {
  try {
    const authManager = getGoogleAuth();
    const oauth2Client = await authManager.getAuthenticatedClient();
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: "files(id, name)",
      orderBy: "name",
      pageSize: 50,
    });

    return (response.data.files || []).map((f) => ({
      id: f.id || "",
      name: f.name || "",
    }));
  } catch (error) {
    console.error("[docs-exporter] Failed to list folders:", error);
    return [];
  }
}

/**
 * 既存ドキュメントを更新
 */
export async function updateGoogleDoc(
  documentId: string,
  proposal: GeneratedProposal
): Promise<ExportResult> {
  try {
    const authManager = getGoogleAuth();
    const oauth2Client = await authManager.getAuthenticatedClient();
    const docs = google.docs({ version: "v1", auth: oauth2Client });

    // 既存コンテンツを削除
    const doc = await docs.documents.get({ documentId });
    const contentLength = doc.data.body?.content?.slice(-1)?.[0]?.endIndex || 1;

    if (contentLength > 1) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              deleteContentRange: {
                range: {
                  startIndex: 1,
                  endIndex: contentLength - 1,
                },
              },
            },
          ],
        },
      });
    }

    // 新しいコンテンツを挿入
    const requests = buildDocumentRequests(proposal);
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });

    return {
      success: true,
      documentId,
      documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
    };
  } catch (error) {
    console.error("[docs-exporter] Update failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "更新に失敗しました",
    };
  }
}
