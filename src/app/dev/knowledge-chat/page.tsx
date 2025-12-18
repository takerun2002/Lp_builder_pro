"use client";

/**
 * ナレッジチャット - RAG+CAGを活用した知識ベースへのクエリUI
 *
 * ユーザーが構築したナレッジに対して質問し、
 * コピーライティング・マーケティング・デザインのアドバイスを受けられる
 */

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Send,
  Sparkles,
  BookOpen,
  Target,
  Palette,
  Brain,
  Loader2,
  Database,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  timestamp: Date;
}

interface KnowledgeStatus {
  initialized: boolean;
  categories: string[];
  totalItems: number;
}

type AssistType = "copywriting" | "marketing" | "design" | "psychology";

const ASSIST_TYPES: { value: AssistType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "copywriting", label: "コピーライティング", icon: <MessageSquare className="h-4 w-4" />, description: "キャッチコピー、セールスコピーのアドバイス" },
  { value: "marketing", label: "マーケティング", icon: <Target className="h-4 w-4" />, description: "ターゲット分析、戦略提案" },
  { value: "design", label: "デザイン", icon: <Palette className="h-4 w-4" />, description: "デザインプロンプト、配色提案" },
  { value: "psychology", label: "心理トリガー", icon: <Brain className="h-4 w-4" />, description: "購買心理、説得技法" },
];

export default function KnowledgeChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<KnowledgeStatus | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "assist">("chat");
  const [assistType, setAssistType] = useState<AssistType>("copywriting");
  const [assistTopic, setAssistTopic] = useState("");
  const [assistContext, setAssistContext] = useState("");
  const [showCitations, setShowCitations] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/dev/rag?action=status");
      const data = await res.json();
      if (data.ok) {
        setStatus(data.status);
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
  };

  const initializeKnowledge = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/rag?action=initialize");
      const data = await res.json();
      if (data.ok) {
        await fetchStatus();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "ナレッジベースを初期化しました。質問をどうぞ！",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to initialize:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/dev/rag?action=query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: input,
          includeRawCitations: true,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.answer || data.result || "回答を生成できませんでした",
          citations: data.rawCitations?.map((c: { source: string; content: string }) =>
            `[${c.source}] ${c.content.slice(0, 200)}...`
          ),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `エラーが発生しました: ${err instanceof Error ? err.message : "Unknown error"}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssist = async () => {
    if (!assistTopic.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: `[${ASSIST_TYPES.find(t => t.value === assistType)?.label}] ${assistTopic}${assistContext ? `\n\nコンテキスト: ${assistContext}` : ""}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setAssistTopic("");
    setAssistContext("");
    setLoading(true);

    try {
      const res = await fetch("/api/dev/rag?action=assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: assistType,
          topic: assistTopic,
          context: assistContext || undefined,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        // Format the result based on type
        let content = "";
        if (assistType === "copywriting" && data.recommendations) {
          content = `**コピーライティングアドバイス**\n\n`;
          if (data.headlines) content += `**見出し案**\n${data.headlines.join("\n")}\n\n`;
          if (data.recommendations) content += `**推奨事項**\n${data.recommendations.join("\n")}\n\n`;
          if (data.techniques) content += `**テクニック**\n${data.techniques.join("\n")}`;
        } else if (assistType === "marketing" && data.strategies) {
          content = `**マーケティング戦略**\n\n`;
          if (data.targetInsights) content += `**ターゲット洞察**\n${data.targetInsights}\n\n`;
          if (data.strategies) content += `**戦略**\n${data.strategies.join("\n")}\n\n`;
          if (data.recommendations) content += `**推奨事項**\n${data.recommendations.join("\n")}`;
        } else if (assistType === "design" && data.prompts) {
          content = `**デザインプロンプト**\n\n${data.prompts.join("\n\n")}`;
          if (data.styleGuide) content += `\n\n**スタイルガイド**\n${JSON.stringify(data.styleGuide, null, 2)}`;
        } else if (assistType === "psychology" && data.triggers) {
          content = `**心理トリガー**\n\n`;
          data.triggers.forEach((t: { name: string; description: string; application: string }) => {
            content += `**${t.name}**\n${t.description}\n適用: ${t.application}\n\n`;
          });
        } else {
          content = JSON.stringify(data, null, 2);
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content,
            timestamp: new Date(),
          },
        ]);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `エラーが発生しました: ${err instanceof Error ? err.message : "Unknown error"}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleCitations = (index: number) => {
    setShowCitations((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          ナレッジチャット
        </h1>
        <p className="text-muted-foreground mt-1">
          構築したナレッジベースに質問して、コピーライティング・マーケティングのアドバイスを受けられます
        </p>
      </div>

      {/* Status Bar */}
      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {status?.initialized ? (
                    <>
                      <Badge variant="default" className="mr-2">初期化済み</Badge>
                      {status.totalItems}件のナレッジ
                    </>
                  ) : (
                    <Badge variant="secondary">未初期化</Badge>
                  )}
                </span>
              </div>
              {status?.categories && status.categories.length > 0 && (
                <div className="flex gap-1">
                  {status.categories.slice(0, 3).map((cat) => (
                    <Badge key={cat} variant="outline" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                  {status.categories.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{status.categories.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={initializeKnowledge}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              {status?.initialized ? "再初期化" : "初期化"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">会話</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] overflow-y-auto border rounded-lg p-4 mb-4 bg-muted/30">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <BookOpen className="h-12 w-12 mb-4" />
                <p>ナレッジベースに質問してみましょう</p>
                <p className="text-sm mt-2">例: 「CVRを上げるキャッチコピーのコツは？」</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border"
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleCitations(idx)}
                            className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
                          >
                            {showCitations[idx] ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                            引用元 ({msg.citations.length})
                          </button>
                          {showCitations[idx] && (
                            <div className="mt-2 space-y-1 text-xs opacity-70">
                              {msg.citations.map((c, i) => (
                                <div key={i} className="border-l-2 border-primary/30 pl-2">
                                  {c}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-xs opacity-50 mt-1">
                        {msg.timestamp.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "assist")}>
            <TabsList className="mb-4">
              <TabsTrigger value="chat">
                <MessageSquare className="h-4 w-4 mr-1" />
                自由質問
              </TabsTrigger>
              <TabsTrigger value="assist">
                <Sparkles className="h-4 w-4 mr-1" />
                アシスト
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat">
              <div className="flex gap-2">
                <Textarea
                  placeholder="ナレッジベースに質問を入力..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleQuery();
                    }
                  }}
                  className="flex-1 min-h-[80px]"
                />
                <Button onClick={handleQuery} disabled={loading || !input.trim()}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="assist">
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {ASSIST_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setAssistType(type.value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        assistType === type.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {type.icon}
                        <span className="font-medium text-sm">{type.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder={`${ASSIST_TYPES.find(t => t.value === assistType)?.label}のトピックを入力...`}
                    value={assistTopic}
                    onChange={(e) => setAssistTopic(e.target.value)}
                    className="min-h-[60px]"
                  />
                  <Textarea
                    placeholder="追加コンテキスト（オプション）: 商品名、ターゲット層など"
                    value={assistContext}
                    onChange={(e) => setAssistContext(e.target.value)}
                    className="min-h-[40px]"
                  />
                </div>

                <Button
                  onClick={handleAssist}
                  disabled={loading || !assistTopic.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  アドバイスを取得
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Examples */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">クイック質問例</CardTitle>
          <CardDescription>クリックして質問</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              "CVRを上げるキャッチコピーのコツは？",
              "PASONAの法則とは？",
              "限定性を演出するテクニック",
              "ファーストビューで伝えるべきこと",
              "CTA周りのデザインのポイント",
            ].map((example) => (
              <Button
                key={example}
                variant="outline"
                size="sm"
                onClick={() => {
                  setInput(example);
                  setActiveTab("chat");
                }}
              >
                {example}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
