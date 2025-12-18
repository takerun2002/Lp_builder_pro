"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PDFUploader, PDFFile } from "@/components/pdf/PDFUploader";
import { PDFViewer } from "@/components/pdf/PDFViewer";

// =============================================================================
// Types
// =============================================================================

interface PageImage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

interface ProcessedPDF {
  file: PDFFile;
  pageCount: number;
  extractedText?: string;
  images?: PageImage[];
}

// =============================================================================
// Page Component
// =============================================================================

export default function PDFProcessorPage() {
  const [processedPDFs, setProcessedPDFs] = useState<ProcessedPDF[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 処理オプション
  const [dpi, setDpi] = useState<"150" | "300" | "600">("150");
  const [imageFormat, setImageFormat] = useState<"png" | "jpeg">("png");
  const [ocrEnabled, setOcrEnabled] = useState(false);

  // PDFファイル選択時のハンドラ
  const handleFileSelect = useCallback(async (file: PDFFile) => {
    setError(null);
    setProcessing(true);

    try {
      // メタデータ取得
      const metadataRes = await fetch("/api/pdf/process?action=metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64: file.type === "local" ? file.base64 : undefined,
        }),
      });

      let pageCount = 1;
      if (metadataRes.ok) {
        const metadataData = await metadataRes.json();
        if (metadataData.ok && metadataData.metadata) {
          pageCount = metadataData.metadata.pageCount || 1;
        }
      }

      // 処理済みリストに追加
      setProcessedPDFs((prev) => [
        ...prev,
        {
          file,
          pageCount,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDFの読み込みに失敗しました");
    } finally {
      setProcessing(false);
    }
  }, []);

  // テキスト抽出
  const handleExtractText = useCallback(
    async (index: number) => {
      const pdf = processedPDFs[index];
      if (!pdf) return;

      setProcessing(true);
      setError(null);

      try {
        const response = await fetch("/api/pdf/extract-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: pdf.file.type === "local" ? pdf.file.base64 : pdf.file.googleDriveId,
            sourceType: pdf.file.type === "local" ? "base64" : "google-drive",
            ocrEnabled,
            outputFormat: "text",
          }),
        });

        const data = await response.json();

        if (!data.ok) {
          throw new Error(data.error || "テキスト抽出に失敗しました");
        }

        // 結果を更新
        setProcessedPDFs((prev) =>
          prev.map((p, i) =>
            i === index
              ? {
                  ...p,
                  extractedText: data.text,
                  pageCount: data.pageCount || p.pageCount,
                }
              : p
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "テキスト抽出に失敗しました");
      } finally {
        setProcessing(false);
      }
    },
    [processedPDFs, ocrEnabled]
  );

  // 画像変換
  const handleConvertImages = useCallback(
    async (index: number) => {
      const pdf = processedPDFs[index];
      if (!pdf) return;

      setProcessing(true);
      setError(null);

      try {
        const response = await fetch("/api/pdf/to-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: pdf.file.type === "local" ? pdf.file.base64 : pdf.file.googleDriveId,
            sourceType: pdf.file.type === "local" ? "base64" : "google-drive",
            dpi: parseInt(dpi),
            format: imageFormat,
            quality: imageFormat === "jpeg" ? 85 : undefined,
          }),
        });

        const data = await response.json();

        if (!data.ok) {
          throw new Error(data.error || "画像変換に失敗しました");
        }

        // 結果を更新
        setProcessedPDFs((prev) =>
          prev.map((p, i) =>
            i === index
              ? {
                  ...p,
                  images: data.images,
                  pageCount: data.pageCount || p.pageCount,
                }
              : p
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "画像変換に失敗しました");
      } finally {
        setProcessing(false);
      }
    },
    [processedPDFs, dpi, imageFormat]
  );

  // PDFをクリア
  const handleClear = useCallback((index: number) => {
    setProcessedPDFs((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 全てクリア
  const handleClearAll = useCallback(() => {
    setProcessedPDFs([]);
    setError(null);
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">PDF処理ツール</h1>
        <p className="text-muted-foreground">
          PDFからテキストを抽出したり、画像に変換してMagic Penで編集できます
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左カラム：アップロード・設定 */}
        <div className="space-y-6">
          {/* アップロード */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">PDFアップロード</CardTitle>
            </CardHeader>
            <CardContent>
              <PDFUploader
                onFileSelect={handleFileSelect}
                multiple={false}
                enableGoogleDrive={true}
                maxSizeMB={50}
              />
            </CardContent>
          </Card>

          {/* 処理オプション */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">処理オプション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* DPI設定 */}
              <div className="space-y-2">
                <Label>画像解像度（DPI）</Label>
                <Select value={dpi} onValueChange={(v) => setDpi(v as "150" | "300" | "600")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="150">
                      150 DPI（軽量・プレビュー用）
                    </SelectItem>
                    <SelectItem value="300">
                      300 DPI（標準・印刷品質）
                    </SelectItem>
                    <SelectItem value="600">
                      600 DPI（高解像度・OCR用）
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* フォーマット */}
              <div className="space-y-2">
                <Label>画像フォーマット</Label>
                <Select
                  value={imageFormat}
                  onValueChange={(v) => setImageFormat(v as "png" | "jpeg")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG（透過対応・高品質）</SelectItem>
                    <SelectItem value="jpeg">JPEG（小サイズ・写真向け）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* OCR設定 */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ocr"
                  checked={ocrEnabled}
                  onCheckedChange={(checked) => setOcrEnabled(checked === true)}
                />
                <Label htmlFor="ocr" className="text-sm font-normal">
                  OCRを有効にする（画像PDF用）
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* アクション */}
          {processedPDFs.length > 0 && (
            <Button variant="outline" onClick={handleClearAll} className="w-full">
              すべてクリア
            </Button>
          )}
        </div>

        {/* 右カラム：処理結果 */}
        <div className="lg:col-span-2 space-y-6">
          {/* エラー表示 */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* 処理中インジケータ */}
          {processing && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-center">
              処理中...
            </div>
          )}

          {/* 処理済みPDF一覧 */}
          {processedPDFs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                PDFをアップロードしてください
              </CardContent>
            </Card>
          ) : (
            processedPDFs.map((pdf, index) => (
              <PDFViewer
                key={`${pdf.file.name}-${index}`}
                fileName={pdf.file.name}
                pageCount={pdf.pageCount}
                extractedText={pdf.extractedText}
                images={pdf.images}
                processing={processing}
                onExtractText={() => handleExtractText(index)}
                onConvertImages={() => handleConvertImages(index)}
                onClear={() => handleClear(index)}
              />
            ))
          )}

          {/* 使い方ガイド */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">使い方</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <Badge variant="outline" className="mr-2">1</Badge>
                PDFファイルをドラッグ&ドロップまたはクリックしてアップロード
              </p>
              <p>
                <Badge variant="outline" className="mr-2">2</Badge>
                「テキスト抽出」でPDF内のテキストを取得（コピー・ダウンロード可能）
              </p>
              <p>
                <Badge variant="outline" className="mr-2">3</Badge>
                「画像変換」でPDFを画像化（Magic Penで編集可能）
              </p>
              <p className="pt-2 border-t mt-4">
                <strong>Tips:</strong> 画像PDFの場合は「OCRを有効にする」をチェックしてください
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
