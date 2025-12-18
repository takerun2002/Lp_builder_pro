"use client";

/**
 * SectionPromptCard - セクションプロンプトカード
 *
 * 個別セクションのプロンプト表示・編集
 */

import { useState } from "react";
import type { GeneratedPrompt } from "@/lib/prompts/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RefreshCw,
  Edit2,
  X,
} from "lucide-react";

interface SectionPromptCardProps {
  prompt: GeneratedPrompt;
  sectionIndex: number;
  onUpdate: (content: string) => void;
  onRegenerate: () => void;
}

export function SectionPromptCard({
  prompt,
  sectionIndex,
  onUpdate,
  onRegenerate,
}: SectionPromptCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(prompt.content);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onUpdate(editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(prompt.content);
    setIsEditing(false);
  };

  return (
    <Card className={prompt.metadata.isCustomized ? "border-yellow-500/50" : ""}>
      <CardHeader className="p-3">
        <div className="flex items-center gap-2">
          {/* セクション番号 */}
          <span className="text-sm font-bold text-muted-foreground w-6">
            {String(sectionIndex + 1).padStart(2, "0")}
          </span>

          {/* セクション名 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{prompt.sectionName}</span>
              <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                {prompt.format.toUpperCase()}
              </span>
              {prompt.metadata.isCustomized && (
                <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                  編集済み
                </span>
              )}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center gap-1">
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
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsEditing(!isEditing)}
              title="編集"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRegenerate}
              title="再生成"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-3 px-3">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="font-mono text-sm min-h-[200px] resize-y"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-1" />
                  キャンセル
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Check className="w-4 h-4 mr-1" />
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
              {prompt.content}
            </pre>
          )}
        </CardContent>
      )}
    </Card>
  );
}
