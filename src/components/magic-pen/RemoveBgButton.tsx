"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { removeBackground } from "@imgly/background-removal";

// =============================================================================
// Types
// =============================================================================

interface RemoveBgButtonProps {
  /** 背景除去する画像のBase64（data:image/...形式） */
  imageDataUrl: string;
  /** 背景除去完了時のコールバック */
  onComplete: (resultDataUrl: string) => void;
  /** ボタンのバリアント */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** ボタンのサイズ */
  size?: "default" | "sm" | "lg";
  /** 無効状態 */
  disabled?: boolean;
  /** ボタンラベル */
  label?: string;
}

type Quality = "low" | "medium" | "high";

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  phase: string;
  error: string | null;
}

// =============================================================================
// Component
// =============================================================================

export function RemoveBgButton({
  imageDataUrl,
  onComplete,
  variant = "outline",
  size = "default",
  disabled = false,
  label = "背景を削除",
}: RemoveBgButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quality, setQuality] = useState<Quality>("medium");
  const [state, setState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    phase: "",
    error: null,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 進捗コールバック
  const handleProgress = useCallback((key: string, current: number, total: number) => {
    const progress = total > 0 ? Math.round((current / total) * 100) : 0;
    const phaseLabels: Record<string, string> = {
      "fetch:image": "画像を読み込み中...",
      "compute:inference": "背景を検出中...",
      "encode:result": "結果を生成中...",
    };
    setState((prev) => ({
      ...prev,
      progress,
      phase: phaseLabels[key] || key,
    }));
  }, []);

  // 背景除去を実行
  const handleRemoveBackground = useCallback(async () => {
    setState({
      isProcessing: true,
      progress: 0,
      phase: "準備中...",
      error: null,
    });
    setPreviewUrl(null);

    try {
      // Base64をBlobに変換
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();

      // 背景除去実行
      const resultBlob = await removeBackground(blob, {
        progress: handleProgress,
      });

      // 結果をDataURLに変換
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultDataUrl = reader.result as string;
        setPreviewUrl(resultDataUrl);
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          progress: 100,
          phase: "完了",
        }));
      };
      reader.readAsDataURL(resultBlob);
    } catch (error) {
      console.error("[RemoveBgButton] Error:", error);
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : "背景除去に失敗しました",
      }));
    }
  }, [imageDataUrl, handleProgress]);

  // 結果を適用
  const handleApply = useCallback(() => {
    if (previewUrl) {
      onComplete(previewUrl);
      setDialogOpen(false);
      setPreviewUrl(null);
      setState({
        isProcessing: false,
        progress: 0,
        phase: "",
        error: null,
      });
    }
  }, [previewUrl, onComplete]);

  // キャンセル
  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setPreviewUrl(null);
    setState({
      isProcessing: false,
      progress: 0,
      phase: "",
      error: null,
    });
  }, []);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled || !imageDataUrl}
        onClick={() => setDialogOpen(true)}
      >
        {label}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>背景を削除</DialogTitle>
            <DialogDescription>
              AIが自動で被写体を検出し、背景を透明にします。処理には5-15秒かかります。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 設定 */}
            {!state.isProcessing && !previewUrl && (
              <div className="flex items-center gap-4">
                <span className="text-sm">品質:</span>
                <Select
                  value={quality}
                  onValueChange={(v) => setQuality(v as Quality)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低（高速）</SelectItem>
                    <SelectItem value="medium">中（推奨）</SelectItem>
                    <SelectItem value="high">高（高精度）</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  {quality === "low" && "処理時間: 約2-4秒"}
                  {quality === "medium" && "処理時間: 約5-10秒"}
                  {quality === "high" && "処理時間: 約10-20秒"}
                </span>
              </div>
            )}

            {/* プログレス */}
            {state.isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{state.phase}</span>
                  <span>{state.progress}%</span>
                </div>
                <Progress value={state.progress} className="h-2" />
              </div>
            )}

            {/* エラー */}
            {state.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {state.error}
              </div>
            )}

            {/* プレビュー */}
            <div className="grid grid-cols-2 gap-4">
              {/* 元画像 */}
              <div className="space-y-2">
                <p className="text-sm font-medium">元画像</p>
                <div className="border rounded-lg overflow-hidden bg-[url('/checkerboard.svg')] bg-repeat">
                  <img
                    src={imageDataUrl}
                    alt="Original"
                    className="w-full h-auto max-h-64 object-contain"
                  />
                </div>
              </div>

              {/* 結果 */}
              <div className="space-y-2">
                <p className="text-sm font-medium">結果</p>
                <div className="border rounded-lg overflow-hidden bg-[url('/checkerboard.svg')] bg-repeat min-h-32 flex items-center justify-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Result"
                      className="w-full h-auto max-h-64 object-contain"
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      {state.isProcessing ? "処理中..." : "処理後に表示されます"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* アクション */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                キャンセル
              </Button>

              {!previewUrl ? (
                <Button
                  onClick={handleRemoveBackground}
                  disabled={state.isProcessing}
                >
                  {state.isProcessing ? "処理中..." : "背景を削除"}
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleRemoveBackground}>
                    再実行
                  </Button>
                  <Button onClick={handleApply}>適用</Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =============================================================================
// Standalone Usage Example
// =============================================================================

export function RemoveBgDemo() {
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [inputImage, setInputImage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInputImage(reader.result as string);
        setResultImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">背景除去デモ</h2>

      <div className="space-y-2">
        <label className="block text-sm font-medium">画像を選択</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm"
        />
      </div>

      {inputImage && (
        <div className="flex items-center gap-4">
          <RemoveBgButton
            imageDataUrl={inputImage}
            onComplete={setResultImage}
            label="背景を削除"
          />
        </div>
      )}

      {resultImage && (
        <div className="space-y-2">
          <p className="text-sm font-medium">結果:</p>
          <div className="border rounded-lg overflow-hidden bg-[url('/checkerboard.svg')] bg-repeat inline-block">
            <img
              src={resultImage}
              alt="Result"
              className="max-w-md h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
