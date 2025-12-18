"use client";

/**
 * ResearchProgressLog - リサーチ進行状況ログ
 *
 * リサーチの進行状況をリアルタイムでログ形式で表示
 */

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  FileText,
} from "lucide-react";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: "info" | "success" | "warning" | "error" | "url" | "progress";
  message: string;
  data?: {
    url?: string;
    title?: string;
    count?: number;
    details?: string;
  };
}

interface ResearchProgressLogProps {
  logs: LogEntry[];
  isRunning?: boolean;
  onClear?: () => void;
  onExportMarkdown?: () => void;
  className?: string;
}

export function ResearchProgressLog({
  logs,
  isRunning = false,
  onClear: _onClear,
  onExportMarkdown,
  className = "",
}: ResearchProgressLogProps) {
  void _onClear; // 将来使用予定
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLogCountRef = useRef(0);

  // 新しいログを検出してアニメーション用にマーク
  useEffect(() => {
    if (logs.length > prevLogCountRef.current) {
      const newIds = new Set(logs.slice(prevLogCountRef.current).map((log) => log.id));
      setNewLogIds(newIds);
      // 300ms後にアニメーションクラスを削除
      const timer = setTimeout(() => setNewLogIds(new Set()), 300);
      prevLogCountRef.current = logs.length;
      return () => clearTimeout(timer);
    }
    prevLogCountRef.current = logs.length;
  }, [logs]);

  // 自動スクロール
  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, expanded]);

  // ログをMarkdown形式に変換
  const logsToMarkdown = () => {
    const lines: string[] = [
      "# リサーチ進行ログ",
      "",
      `生成日時: ${new Date().toLocaleString("ja-JP")}`,
      "",
      "---",
      "",
    ];

    // URLのみ抽出
    const urls = logs.filter((log) => log.type === "url" && log.data?.url);
    if (urls.length > 0) {
      lines.push("## 発見したLP一覧", "");
      urls.forEach((log, i) => {
        lines.push(`${i + 1}. [${log.data?.title || log.message}](${log.data?.url})`);
      });
      lines.push("");
    }

    // 全ログ
    lines.push("## 詳細ログ", "");
    logs.forEach((log) => {
      const time = log.timestamp.toLocaleTimeString("ja-JP");
      const icon = getLogIcon(log.type);
      let line = `- \`${time}\` ${icon} ${log.message}`;
      if (log.data?.url) {
        line += ` - [${log.data.url}](${log.data.url})`;
      }
      lines.push(line);
    });

    return lines.join("\n");
  };

  // クリップボードにコピー
  const handleCopy = async () => {
    const markdown = logsToMarkdown();
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // アイコン取得
  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      case "url":
        return "🔗";
      case "progress":
        return "⏳";
      default:
        return "ℹ️";
    }
  };

  // URLログの数をカウント
  const urlCount = logs.filter((log) => log.type === "url").length;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            進行ログ
            {isRunning && (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            )}
            {urlCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {urlCount}件のLP発見
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              title="Markdownでコピー"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            {onExportMarkdown && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExportMarkdown}
                title="Markdownでダウンロード"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <ScrollArea
            className="h-64 rounded-md border bg-muted/30 p-2"
            ref={scrollRef}
          >
            {logs.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                リサーチを開始するとログが表示されます
              </div>
            ) : (
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log) => (
                  <LogLine key={log.id} log={log} isNew={newLogIds.has(log.id)} />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}

// 個別ログ行
function LogLine({ log, isNew = false }: { log: LogEntry; isNew?: boolean }) {
  const time = log.timestamp.toLocaleTimeString("ja-JP");

  const getTypeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "text-green-600 dark:text-green-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      case "url":
        return "text-blue-600 dark:text-blue-400";
      case "progress":
        return "text-purple-600 dark:text-purple-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-3 h-3" />;
      case "warning":
        return <AlertCircle className="w-3 h-3" />;
      case "error":
        return <AlertCircle className="w-3 h-3" />;
      case "url":
        return <ExternalLink className="w-3 h-3" />;
      case "progress":
        return <Loader2 className="w-3 h-3 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex items-start gap-2 py-0.5 ${getTypeColor(log.type)} ${isNew ? "animate-in fade-in slide-in-from-left-2 duration-300" : ""}`}
    >
      <span className="text-muted-foreground shrink-0">[{time}]</span>
      <span className="shrink-0">{getIcon(log.type)}</span>
      <span className="flex-1">
        {log.message}
        {log.data?.url && (
          <a
            href={log.data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-blue-500 hover:underline"
          >
            {log.data.title || log.data.url}
          </a>
        )}
        {log.data?.count !== undefined && (
          <Badge variant="outline" className="ml-2 text-[10px]">
            {log.data.count}件
          </Badge>
        )}
      </span>
    </div>
  );
}

/**
 * 発見したLPのURL一覧表示コンポーネント
 */
interface DiscoveredUrlsProps {
  urls: { url: string; title?: string; domain?: string }[];
  onOpenUrl?: (url: string) => void;
}

export function DiscoveredUrls({ urls, onOpenUrl }: DiscoveredUrlsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const text = urls.map((u) => u.url).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMarkdown = async () => {
    const lines = urls.map((u, i) => `${i + 1}. [${u.title || u.domain || u.url}](${u.url})`);
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (urls.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            🔗 発見したLP一覧
            <Badge variant="secondary">{urls.length}件</Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleCopyAll}>
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              <span className="ml-1 text-xs">URLのみ</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopyMarkdown}>
              <FileText className="w-4 h-4" />
              <span className="ml-1 text-xs">Markdown</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-48">
          <ul className="space-y-1 text-sm">
            {urls.map((item, i) => (
              <li key={i} className="flex items-center gap-2 py-1 border-b last:border-0">
                <span className="text-muted-foreground w-6 text-right">{i + 1}.</span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (onOpenUrl) {
                      e.preventDefault();
                      onOpenUrl(item.url);
                    }
                  }}
                  className="flex-1 text-blue-600 hover:underline truncate"
                >
                  {item.title || item.domain || item.url}
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => window.open(item.url, "_blank")}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

