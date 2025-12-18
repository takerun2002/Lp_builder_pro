"use client";

/**
 * モデル選択コンポーネント
 * 動的にAIモデルを選択するためのUI
 */

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Zap, Image as ImageIcon, Wand2, Save, CheckCircle2 } from "lucide-react";

interface ModelConfig {
  id: string;
  label: string;
  provider: string;
  model: string;
  description?: string;
  text_generation?: boolean;
  text_to_image?: boolean;
  image_to_image?: boolean;
  default?: boolean;
  enabled: boolean;
}

interface ModelPreferences {
  textModelId: string;
  imageModelId: string;
  imageEditModelId: string;
  allowFallback: boolean;
}

interface ModelCategory {
  id: string;
  name: string;
  description: string;
  models: ModelConfig[];
}

export function ModelSelector() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [, setCategories] = useState<ModelCategory[]>([]);
  const [preferences, setPreferences] = useState<ModelPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // データ取得
  useEffect(() => {
    async function loadModels() {
      try {
        const response = await fetch("/api/models");
        const data = await response.json();
        if (data.success) {
          setModels(data.models);
          setCategories(data.categories || []);
          setPreferences(data.preferences);
        }
      } catch (error) {
        console.error("Failed to load models:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadModels();
  }, []);

  // 設定保存
  const savePreferences = async () => {
    if (!preferences) return;

    setIsSaving(true);
    setSaved(false);

    try {
      const response = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });
      const data = await response.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // 設定更新
  const updatePreference = (key: keyof ModelPreferences, value: string | boolean) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // カテゴリ別にモデルをフィルタ
  const textModels = models.filter((m) => m.text_generation);
  const imageGenModels = models.filter((m) => m.text_to_image);
  const imageEditModels = models.filter((m) => m.image_to_image);

  return (
    <div className="space-y-6">
      {/* テキスト生成モデル */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-yellow-500" />
            テキスト生成モデル
          </CardTitle>
          <CardDescription>
            文章生成、分析、コード生成に使用するAIモデル
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={preferences?.textModelId || ""}
            onValueChange={(value) => updatePreference("textModelId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="モデルを選択" />
            </SelectTrigger>
            <SelectContent>
              {textModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <span>{model.label}</span>
                    {model.default && (
                      <Badge variant="secondary" className="text-xs">
                        推奨
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preferences?.textModelId && (
            <p className="text-xs text-muted-foreground mt-2">
              {textModels.find((m) => m.id === preferences.textModelId)?.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 画像生成モデル */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="w-5 h-5 text-blue-500" />
            画像生成モデル
          </CardTitle>
          <CardDescription>
            テキストから画像を生成するAIモデル
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={preferences?.imageModelId || ""}
            onValueChange={(value) => updatePreference("imageModelId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="モデルを選択" />
            </SelectTrigger>
            <SelectContent>
              {imageGenModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <span>{model.label}</span>
                    {model.default && (
                      <Badge variant="secondary" className="text-xs">
                        推奨
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preferences?.imageModelId && (
            <p className="text-xs text-muted-foreground mt-2">
              {imageGenModels.find((m) => m.id === preferences.imageModelId)?.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 画像編集モデル */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wand2 className="w-5 h-5 text-purple-500" />
            画像編集モデル
          </CardTitle>
          <CardDescription>
            既存画像の編集・加工に使用するAIモデル
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={preferences?.imageEditModelId || ""}
            onValueChange={(value) => updatePreference("imageEditModelId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="モデルを選択" />
            </SelectTrigger>
            <SelectContent>
              {imageEditModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <span>{model.label}</span>
                    {model.default && (
                      <Badge variant="secondary" className="text-xs">
                        推奨
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preferences?.imageEditModelId && (
            <p className="text-xs text-muted-foreground mt-2">
              {imageEditModels.find((m) => m.id === preferences.imageEditModelId)?.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* オプション */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">オプション</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">フォールバックを許可</p>
              <p className="text-xs text-muted-foreground">
                エラー時に代替モデルを自動で試行します
              </p>
            </div>
            <Switch
              checked={preferences?.allowFallback ?? true}
              onCheckedChange={(checked) => updatePreference("allowFallback", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <Button onClick={savePreferences} disabled={isSaving} className="w-full">
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            保存中...
          </>
        ) : saved ? (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
            保存しました
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            設定を保存
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * 簡易モデル選択（インライン用）
 */
export function InlineModelSelector({
  capability,
  value,
  onChange,
}: {
  capability: "text" | "image_generation" | "image_editing";
  value: string;
  onChange: (modelId: string) => void;
}) {
  const [models, setModels] = useState<ModelConfig[]>([]);

  useEffect(() => {
    async function loadModels() {
      try {
        const response = await fetch(`/api/models?capability=${capability}`);
        const data = await response.json();
        if (data.success) {
          setModels(data.models);
        }
      } catch (error) {
        console.error("Failed to load models:", error);
      }
    }
    loadModels();
  }, [capability]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="モデル選択" />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
