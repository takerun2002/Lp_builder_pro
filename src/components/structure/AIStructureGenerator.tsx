"use client";

/**
 * AIStructureGenerator - AI構成自動生成
 *
 * 商品情報を入力してAIに構成を提案させる
 */

import { useState } from "react";
import type { SectionPlan, GlobalDesignRules } from "@/lib/structure/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Wand2, Loader2, Sparkles } from "lucide-react";

interface AIStructureGeneratorProps {
  onGenerated: (sections: SectionPlan[], globalRules: GlobalDesignRules) => void;
  isLoading?: boolean;
}

interface FormData {
  productName: string;
  productDescription: string;
  targetAudience: string;
  industry: string;
  tone: string;
  sectionCount: number;
  includeTestimonials: boolean;
  includeFaq: boolean;
  includePrice: boolean;
}

const INDUSTRIES = [
  "美容・サロン",
  "健康・医療",
  "教育・講座",
  "ビジネス・コンサルティング",
  "飲食・食品",
  "不動産",
  "IT・テクノロジー",
  "ファッション",
  "旅行・レジャー",
  "その他",
];

const TONES = [
  "プロフェッショナル",
  "カジュアル",
  "高級感",
  "親しみやすい",
  "エネルギッシュ",
  "落ち着いた",
  "信頼感",
];

export function AIStructureGenerator({
  onGenerated,
  isLoading: externalLoading,
}: AIStructureGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData>({
    productName: "",
    productDescription: "",
    targetAudience: "",
    industry: "その他",
    tone: "プロフェッショナル",
    sectionCount: 6,
    includeTestimonials: true,
    includeFaq: true,
    includePrice: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productName || !formData.productDescription) {
      return;
    }

    setIsLoading(true);
    setSuggestions([]);

    try {
      const response = await fetch("/api/structure/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("生成に失敗しました");
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      onGenerated(data.sections, data.globalRules);
    } catch (error) {
      console.error("AI generation error:", error);
      setSuggestions(["エラーが発生しました。もう一度お試しください。"]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const loading = isLoading || externalLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          AI構成自動生成
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 商品名 */}
          <div className="space-y-2">
            <Label htmlFor="productName">商品・サービス名 *</Label>
            <Input
              id="productName"
              value={formData.productName}
              onChange={(e) => updateFormData("productName", e.target.value)}
              placeholder="例: Beauty Salon SILK"
              required
            />
          </div>

          {/* 商品説明 */}
          <div className="space-y-2">
            <Label htmlFor="productDescription">商品・サービスの説明 *</Label>
            <Textarea
              id="productDescription"
              value={formData.productDescription}
              onChange={(e) => updateFormData("productDescription", e.target.value)}
              placeholder="例: 結果にこだわる大人女性のためのエステサロン。丁寧なカウンセリングと確かな技術で..."
              rows={3}
              required
            />
          </div>

          {/* ターゲット */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience">ターゲット</Label>
            <Input
              id="targetAudience"
              value={formData.targetAudience}
              onChange={(e) => updateFormData("targetAudience", e.target.value)}
              placeholder="例: 30-50代の働く女性、肌の悩みを抱えている方"
            />
          </div>

          {/* 業界・トーン */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>業界</Label>
              <Select
                value={formData.industry}
                onValueChange={(v) => updateFormData("industry", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>トーン</Label>
              <Select
                value={formData.tone}
                onValueChange={(v) => updateFormData("tone", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((tone) => (
                    <SelectItem key={tone} value={tone}>
                      {tone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* セクション数 */}
          <div className="space-y-2">
            <Label>セクション数</Label>
            <Select
              value={String(formData.sectionCount)}
              onValueChange={(v) => updateFormData("sectionCount", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}セクション
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* オプション */}
          <div className="space-y-3">
            <Label className="text-muted-foreground">含めるセクション</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="includeTestimonials" className="font-normal">
                お客様の声
              </Label>
              <Switch
                id="includeTestimonials"
                checked={formData.includeTestimonials}
                onCheckedChange={(v) => updateFormData("includeTestimonials", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="includeFaq" className="font-normal">
                よくある質問
              </Label>
              <Switch
                id="includeFaq"
                checked={formData.includeFaq}
                onCheckedChange={(v) => updateFormData("includeFaq", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="includePrice" className="font-normal">
                価格セクション
              </Label>
              <Switch
                id="includePrice"
                checked={formData.includePrice}
                onCheckedChange={(v) => updateFormData("includePrice", v)}
              />
            </div>
          </div>

          {/* 生成ボタン */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                AIで構成を生成
              </>
            )}
          </Button>

          {/* 提案 */}
          {suggestions.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <div className="text-sm font-medium text-blue-800 mb-1">
                AIからの提案
              </div>
              <ul className="text-sm text-blue-700 space-y-1">
                {suggestions.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
