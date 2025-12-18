"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// =============================================================================
// Types
// =============================================================================

interface PageImage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

interface PDFViewerProps {
  /** ファイル名 */
  fileName: string;
  /** ページ数 */
  pageCount: number;
  /** 抽出されたテキスト */
  extractedText?: string;
  /** 変換された画像 */
  images?: PageImage[];
  /** 処理中かどうか */
  processing?: boolean;
  /** テキスト抽出を実行 */
  onExtractText?: () => void;
  /** 画像変換を実行 */
  onConvertImages?: () => void;
  /** クリア */
  onClear?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function PDFViewer({
  fileName,
  pageCount,
  extractedText,
  images,
  processing = false,
  onExtractText,
  onConvertImages,
  onClear,
}: PDFViewerProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // テキストをクリップボードにコピー
  const handleCopyText = useCallback(() => {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText);
    }
  }, [extractedText]);

  // テキストをダウンロード
  const handleDownloadText = useCallback(() => {
    if (!extractedText) return;

    const blob = new Blob([extractedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName.replace(".pdf", "")}_text.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [extractedText, fileName]);

  // 画像をダウンロード
  const handleDownloadImage = useCallback(
    (image: PageImage) => {
      const a = document.createElement("a");
      a.href = image.dataUrl;
      a.download = `${fileName.replace(".pdf", "")}_page${image.pageNumber}.png`;
      a.click();
    },
    [fileName]
  );

  // 全画像をダウンロード
  const handleDownloadAllImages = useCallback(() => {
    if (!images) return;

    images.forEach((image, index) => {
      setTimeout(() => {
        handleDownloadImage(image);
      }, index * 200);
    });
  }, [images, handleDownloadImage]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{fileName}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{pageCount}ページ</Badge>
              {processing && (
                <Badge variant="secondary">処理中...</Badge>
              )}
            </div>
          </div>
          {onClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              クリア
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="info">情報</TabsTrigger>
            <TabsTrigger value="text" disabled={!extractedText}>
              テキスト
            </TabsTrigger>
            <TabsTrigger value="images" disabled={!images || images.length === 0}>
              画像
            </TabsTrigger>
          </TabsList>

          {/* 情報タブ */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">ファイル名:</span>
                <p className="font-medium">{fileName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">ページ数:</span>
                <p className="font-medium">{pageCount}ページ</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              {onExtractText && (
                <Button
                  onClick={onExtractText}
                  disabled={processing}
                  variant="outline"
                >
                  テキスト抽出
                </Button>
              )}
              {onConvertImages && (
                <Button
                  onClick={onConvertImages}
                  disabled={processing}
                  variant="outline"
                >
                  画像変換
                </Button>
              )}
            </div>
          </TabsContent>

          {/* テキストタブ */}
          <TabsContent value="text" className="space-y-4">
            {extractedText && (
              <>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyText}>
                    コピー
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadText}>
                    ダウンロード
                  </Button>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {extractedText}
                  </pre>
                </div>

                <p className="text-xs text-muted-foreground">
                  {extractedText.length.toLocaleString()}文字
                </p>
              </>
            )}
          </TabsContent>

          {/* 画像タブ */}
          <TabsContent value="images" className="space-y-4">
            {images && images.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentImageIndex === 0}
                      onClick={() => setCurrentImageIndex((i) => i - 1)}
                    >
                      前へ
                    </Button>
                    <span className="text-sm self-center">
                      {currentImageIndex + 1} / {images.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentImageIndex === images.length - 1}
                      onClick={() => setCurrentImageIndex((i) => i + 1)}
                    >
                      次へ
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadImage(images[currentImageIndex])}
                    >
                      ダウンロード
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadAllImages}
                    >
                      全てダウンロード
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={images[currentImageIndex].dataUrl}
                    alt={`Page ${images[currentImageIndex].pageNumber}`}
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  {images[currentImageIndex].width} x {images[currentImageIndex].height} px
                </p>

                {/* サムネイル一覧 */}
                <div className="flex gap-2 overflow-x-auto py-2">
                  {images.map((image, index) => (
                    <button
                      key={image.pageNumber}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 border-2 rounded overflow-hidden ${
                        index === currentImageIndex
                          ? "border-primary"
                          : "border-gray-200"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.dataUrl}
                        alt={`Thumbnail ${image.pageNumber}`}
                        className="w-16 h-20 object-cover"
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
