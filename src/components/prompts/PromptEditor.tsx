"use client";

/**
 * PromptEditor - プロンプト編集エリア
 *
 * 生のプロンプトを直接編集するコンポーネント
 */

import { useState, useEffect } from "react";
import type { PromptFormat } from "@/lib/workflow/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, RotateCcw } from "lucide-react";

interface PromptEditorProps {
  content: string;
  format: PromptFormat;
  onChange: (content: string) => void;
  onReset?: () => void;
  readOnly?: boolean;
  className?: string;
}

export function PromptEditor({
  content,
  format,
  onChange,
  onReset,
  readOnly = false,
  className = "",
}: PromptEditorProps) {
  const [copied, setCopied] = useState(false);
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    setLineCount(content.split("\n").length);
  }, [content]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLanguageHint = () => {
    switch (format) {
      case "yaml":
        return "YAML";
      case "json":
        return "JSON";
      default:
        return "テキスト";
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            プロンプト
            <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
              {getLanguageHint()}
            </span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2">
              {lineCount}行
            </span>
            {onReset && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onReset}
                title="リセット"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
              title="コピー"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className={`font-mono text-sm min-h-[300px] resize-y ${
            format === "yaml" ? "whitespace-pre" : ""
          }`}
          placeholder="プロンプトを入力..."
        />
      </CardContent>
    </Card>
  );
}
