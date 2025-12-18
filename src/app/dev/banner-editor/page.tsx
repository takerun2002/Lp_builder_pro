"use client";

/**
 * バナーエディター 開発ページ
 * AI生成画像の微調整とテキスト追加
 */

import { useState } from "react";
import { BannerEditor } from "@/components/editor/BannerEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// プリセットサイズ
const PRESETS = [
  { name: "YouTubeサムネイル", width: 1280, height: 720 },
  { name: "Instagram投稿", width: 1080, height: 1080 },
  { name: "Instagramストーリー", width: 1080, height: 1920 },
  { name: "Twitter投稿", width: 1200, height: 675 },
  { name: "Facebookカバー", width: 820, height: 312 },
  { name: "バナー広告（横長）", width: 728, height: 90 },
  { name: "バナー広告（レクタングル）", width: 300, height: 250 },
  { name: "LPヒーロー", width: 1920, height: 800 },
];

export default function BannerEditorPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [initialWidth, setInitialWidth] = useState(1280);
  const [initialHeight, setInitialHeight] = useState(720);
  const [savedImages, setSavedImages] = useState<string[]>([]);

  const handleStartEditing = (preset?: { width: number; height: number }) => {
    if (preset) {
      setInitialWidth(preset.width);
      setInitialHeight(preset.height);
    }
    setIsEditing(true);
  };

  const handleSave = (dataUrl: string) => {
    setSavedImages((prev) => [dataUrl, ...prev]);
    alert("画像を保存しました");
  };

  const handleClose = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="h-screen">
        <BannerEditor
          initialWidth={initialWidth}
          initialHeight={initialHeight}
          onSave={handleSave}
          onClose={handleClose}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">バナーエディター</h1>
        <p className="text-gray-600 mt-1">
          AI生成画像にテキストを追加して、広告バナーを仕上げる
        </p>
      </div>

      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new">新規作成</TabsTrigger>
          <TabsTrigger value="saved">保存済み ({savedImages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* プリセットサイズ */}
            <Card>
              <CardHeader>
                <CardTitle>サイズプリセット</CardTitle>
                <CardDescription>
                  用途に合わせたサイズを選択してエディターを開始
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-start"
                      onClick={() => handleStartEditing(preset)}
                    >
                      <span className="font-medium text-sm">{preset.name}</span>
                      <span className="text-xs text-gray-500">
                        {preset.width} × {preset.height}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* カスタムサイズ */}
            <Card>
              <CardHeader>
                <CardTitle>カスタムサイズ</CardTitle>
                <CardDescription>任意のサイズでエディターを開始</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm text-gray-500">幅 (px)</label>
                    <input
                      type="number"
                      value={initialWidth}
                      onChange={(e) => setInitialWidth(Number(e.target.value))}
                      className="w-full p-2 border rounded"
                      min={100}
                      max={4000}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-gray-500">高さ (px)</label>
                    <input
                      type="number"
                      value={initialHeight}
                      onChange={(e) => setInitialHeight(Number(e.target.value))}
                      className="w-full p-2 border rounded"
                      min={100}
                      max={4000}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={() => handleStartEditing()}>
                  エディターを開く
                </Button>
              </CardContent>
            </Card>

            {/* 使い方 */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>使い方</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>サイズを選択してエディターを開きます</li>
                  <li>「画像を読込」ボタンでAI生成画像を背景として読み込みます</li>
                  <li>「テキスト追加」ボタンでテキストレイヤーを追加します</li>
                  <li>キャンバス上でテキストをドラッグして位置を調整します</li>
                  <li>右側のパネルでフォントサイズ、色、スタイルを調整します</li>
                  <li>「PNG保存」または「JPEG保存」で画像をダウンロードします</li>
                </ol>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>ショートカット:</strong>
                    Ctrl+Z（元に戻す）、Ctrl+Y（やり直し）、矢印キー（位置微調整）
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          {savedImages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                まだ保存された画像はありません
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {savedImages.map((dataUrl, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="aspect-video bg-gray-100">
                    <img
                      src={dataUrl}
                      alt={`Saved ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <CardContent className="p-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = dataUrl;
                          link.download = `banner_${index + 1}.png`;
                          link.click();
                        }}
                      >
                        DL
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          navigator.clipboard.writeText(dataUrl);
                          alert("URLをコピーしました");
                        }}
                      >
                        URL
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
