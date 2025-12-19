"use client";

/**
 * SwipeFileSelector - スワイプファイル選択コンポーネント
 *
 * プロジェクトのスワイプファイル一覧を表示
 * カテゴリ/トンマナでフィルタリング可能
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Image as ImageIcon,
  Check,
  ExternalLink,
  Star,
} from "lucide-react";

export interface SwipeFile {
  id: string;
  title: string;
  thumbnailUrl?: string;
  lpUrl?: string;
  category?: string;
  style?: string;
  tags?: string[];
  createdAt?: string;
}

interface SwipeFileSelectorProps {
  swipeFiles: SwipeFile[];
  onSelect: (swipeFile: SwipeFile) => void;
  selectedId?: string;
}

const CATEGORY_OPTIONS = [
  { value: "all", label: "すべてのカテゴリ" },
  { value: "beauty", label: "美容・コスメ" },
  { value: "health", label: "健康・サプリ" },
  { value: "finance", label: "金融・投資" },
  { value: "education", label: "教育・スクール" },
  { value: "business", label: "ビジネス・BtoB" },
  { value: "other", label: "その他" },
];

const STYLE_OPTIONS = [
  { value: "all", label: "すべてのスタイル" },
  { value: "luxury", label: "高級・セレブ" },
  { value: "casual", label: "カジュアル・親しみ" },
  { value: "professional", label: "プロフェッショナル" },
  { value: "emotional", label: "感情訴求" },
  { value: "minimal", label: "シンプル・ミニマル" },
];

export function SwipeFileSelector({
  swipeFiles,
  onSelect,
  selectedId,
}: SwipeFileSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [styleFilter, setStyleFilter] = useState("all");

  const filteredFiles = useMemo(() => {
    return swipeFiles.filter((file) => {
      // 検索クエリでフィルタ
      if (
        searchQuery &&
        !file.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // カテゴリでフィルタ
      if (categoryFilter !== "all" && file.category !== categoryFilter) {
        return false;
      }

      // スタイルでフィルタ
      if (styleFilter !== "all" && file.style !== styleFilter) {
        return false;
      }

      return true;
    });
  }, [swipeFiles, searchQuery, categoryFilter, styleFilter]);

  if (swipeFiles.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            スワイプファイルがありません
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            スクレイパーでLPを取り込んでください
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="space-y-3">
        {/* 検索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="タイトルで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* カテゴリ・スタイルフィルター */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">カテゴリ</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">スタイル</Label>
            <Select value={styleFilter} onValueChange={setStyleFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 結果件数 */}
      <p className="text-xs text-muted-foreground">
        {filteredFiles.length}件のスワイプファイル
      </p>

      {/* ファイル一覧 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
        {filteredFiles.map((file) => (
          <Card
            key={file.id}
            className={`cursor-pointer transition-all overflow-hidden ${
              file.id === selectedId
                ? "ring-2 ring-primary border-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => onSelect(file)}
          >
            {/* サムネイル */}
            <div className="aspect-[4/3] bg-muted relative">
              {file.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.thumbnailUrl}
                  alt={file.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                </div>
              )}

              {/* 選択中マーク */}
              {file.id === selectedId && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* 情報 */}
            <CardContent className="p-2">
              <p className="text-xs font-medium line-clamp-1">{file.title}</p>
              {(file.category || file.style) && (
                <div className="flex items-center gap-1 mt-1">
                  {file.style && (
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                      {
                        STYLE_OPTIONS.find((s) => s.value === file.style)
                          ?.label || file.style
                      }
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 結果なし */}
      {filteredFiles.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              条件に一致するファイルがありません
            </p>
          </CardContent>
        </Card>
      )}

      {/* 選択中のファイルの詳細 */}
      {selectedId && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">
                  選択中:{" "}
                  {filteredFiles.find((f) => f.id === selectedId)?.title}
                </span>
              </div>
              {filteredFiles.find((f) => f.id === selectedId)?.lpUrl && (
                <Button size="sm" variant="ghost" asChild>
                  <a
                    href={
                      filteredFiles.find((f) => f.id === selectedId)?.lpUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    LP確認
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SwipeFileSelector;
