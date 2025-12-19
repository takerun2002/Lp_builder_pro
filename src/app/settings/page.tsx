"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSelectorGroup } from "@/components/ui/model-dropdown";
import type { ModelConfig, ModelPreset, CostTier } from "@/lib/ai/model-selector";
import {
  Key,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Globe,
  Bot,
  Image as ImageIcon,
  Search,
} from "lucide-react";
import { StorageQuickSettings } from "@/components/settings";
import { RAGStatsCard } from "@/components/ai/RAGStatsCard";

type ApiKeySource = "env" | "stored" | "none";

// APIキー設定の型定義
interface ApiKeyConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  placeholder: string;
  docsUrl: string;
  required: boolean;
  features: string[];
}

// APIキー一覧
const API_KEY_CONFIGS: ApiKeyConfig[] = [
  {
    id: "google",
    name: "Google Gemini API",
    description: "テキスト生成・画像生成・分析に使用",
    icon: <Sparkles className="w-5 h-5 text-blue-500" />,
    placeholder: "AIza...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    required: true,
    features: ["テキスト生成", "画像生成", "分析"],
  },
  {
    id: "openrouter",
    name: "OpenRouter API",
    description: "🆓 NVIDIA Nemotron（無料）、Perplexity、Claude等に対応",
    icon: <Globe className="w-5 h-5 text-purple-500" />,
    placeholder: "sk-or-...",
    docsUrl: "https://openrouter.ai/keys",
    required: false,
    features: ["🆓 Nemotron 3 Nano（無料）", "Perplexity（SNSトレンド）", "Claude Sonnet"],
  },
  {
    id: "manus",
    name: "Manus AI API",
    description: "動的スクレイピング・ブラウザ操作に使用",
    icon: <Bot className="w-5 h-5 text-green-500" />,
    placeholder: "manus_...",
    docsUrl: "https://manus.ai/settings/api",
    required: false,
    features: ["動的スクレイピング", "ブラウザ操作", "リサーチ自動化"],
  },
  {
    id: "perplexity",
    name: "Perplexity API（直接）",
    description: "リアルタイムWeb検索・SNSトレンド分析に最適",
    icon: <Search className="w-5 h-5 text-cyan-500" />,
    placeholder: "pplx-...",
    docsUrl: "https://www.perplexity.ai/settings/api",
    required: false,
    features: ["リアルタイム検索", "SNSトレンド", "ニュース分析"],
  },
  {
    id: "fal",
    name: "fal.ai API",
    description: "高速画像生成（Flux等）の代替プロバイダー",
    icon: <ImageIcon className="w-5 h-5 text-orange-500" />,
    placeholder: "fal_...",
    docsUrl: "https://fal.ai/dashboard/keys",
    required: false,
    features: ["Flux画像生成", "高速処理", "スタイル変換"],
  },
  {
    id: "brightdata",
    name: "Bright Data API",
    description: "高度なWebスクレイピング・SNSデータ収集に最適",
    icon: <Globe className="w-5 h-5 text-yellow-500" />,
    placeholder: "bd_...",
    docsUrl: "https://brightdata.com/cp/api_tokens",
    required: false,
    features: ["SNSスクレイピング", "LPデザイン収集", "Eコマースデータ", "ブラウザAPI"],
  },
  {
    id: "firecrawl",
    name: "Firecrawl API",
    description: "強力なWebスクレイピング・クローリングツール",
    icon: <Bot className="w-5 h-5 text-red-500" />,
    placeholder: "fc-...",
    docsUrl: "https://www.firecrawl.dev/app/api-keys",
    required: false,
    features: ["Webスクレイピング", "サイトクローリング", "構造化データ抽出"],
  },
];

interface ModelSettings {
  presets: ModelPreset;
  costLimit: CostTier | "unlimited";
  autoDowngrade: boolean;
}

// APIキーの状態を管理
interface ApiKeyStatus {
  configured: boolean;
  source: ApiKeySource;
}

export default function SettingsPage() {
  // APIキー状態（複数対応）
  const [apiKeyStatuses, setApiKeyStatuses] = useState<Record<string, ApiKeyStatus>>({});
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, string | null>>({});

  // 後方互換用（既存のgoogle専用）
  const status = apiKeyStatuses.google ? {
    googleApiKeyConfigured: apiKeyStatuses.google.configured,
    source: apiKeyStatuses.google.source,
  } : null;

  // Model settings state
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [modelSettings, setModelSettings] = useState<ModelSettings | null>(null);
  const [modelMessage, setModelMessage] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);

  const loadModelSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/models");
      const data = await res.json();
      if (data.ok) {
        setModels(data.models);
        setModelSettings(data.settings);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveModelSettings = async (newPresets: Record<string, string>) => {
    setModelLoading(true);
    setModelMessage(null);
    try {
      const res = await fetch("/api/settings/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presets: newPresets }),
      });
      const data = await res.json();
      if (!data.ok) {
        setModelMessage(data.error || "保存に失敗しました");
        return;
      }
      setModelSettings(data.settings);
      setModelMessage("モデル設定を保存しました");
    } finally {
      setModelLoading(false);
    }
  };

  // 全APIキーの状態を読み込む
  const loadAllApiKeyStatuses = useCallback(async () => {
    try {
      // 既存のGoogleキー状態を取得
      const googleRes = await fetch("/api/settings/status");
      const googleData = await googleRes.json();
      
      const statuses: Record<string, ApiKeyStatus> = {};
      
      if (googleData.ok) {
        statuses.google = {
          configured: googleData.googleApiKeyConfigured,
          source: googleData.source,
        };
      }
      
      // 他のAPIキー状態を取得（新しいエンドポイント）
      try {
        const allRes = await fetch("/api/settings/api-keys/status");
        const allData = await allRes.json();
        if (allData.ok && allData.keys) {
          Object.assign(statuses, allData.keys);
        }
      } catch {
        // 新エンドポイントがない場合は無視
      }
      
      setApiKeyStatuses(statuses);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadAllApiKeyStatuses().catch(() => {});
    loadModelSettings().catch(() => {});
  }, [loadModelSettings, loadAllApiKeyStatuses]);

  // 汎用APIキー保存関数
  const saveApiKey = async (keyId: string) => {
    const keyValue = apiKeyInputs[keyId];
    if (!keyValue?.trim()) return;

    setLoading((prev) => ({ ...prev, [keyId]: true }));
    setMessages((prev) => ({ ...prev, [keyId]: null }));

    try {
      // Googleキーは既存エンドポイントを使用
      if (keyId === "google") {
        const res = await fetch("/api/settings/google-api-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ googleApiKey: keyValue }),
        });
        const data = await res.json();
        if (!data.ok) {
          setMessages((prev) => ({ ...prev, [keyId]: data.error || "保存に失敗しました" }));
          return;
        }
      } else {
        // 他のキーは新エンドポイント
        const res = await fetch("/api/settings/api-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyId, value: keyValue }),
        });
        const data = await res.json();
        if (!data.ok) {
          setMessages((prev) => ({ ...prev, [keyId]: data.error || "保存に失敗しました" }));
          return;
        }
      }

      setApiKeyInputs((prev) => ({ ...prev, [keyId]: "" }));
      setMessages((prev) => ({ ...prev, [keyId]: "保存しました（ローカルにのみ保存）" }));
      await loadAllApiKeyStatuses();
    } finally {
      setLoading((prev) => ({ ...prev, [keyId]: false }));
    }
  };

  // 汎用APIキー削除関数
  const deleteApiKey = async (keyId: string) => {
    setLoading((prev) => ({ ...prev, [keyId]: true }));
    setMessages((prev) => ({ ...prev, [keyId]: null }));

    try {
      if (keyId === "google") {
        const res = await fetch("/api/settings/google-api-key", { method: "DELETE" });
        const data = await res.json();
        if (!data.ok) {
          setMessages((prev) => ({ ...prev, [keyId]: data.error || "削除に失敗しました" }));
          return;
        }
      } else {
        const res = await fetch(`/api/settings/api-keys?keyId=${keyId}`, { method: "DELETE" });
        const data = await res.json();
        if (!data.ok) {
          setMessages((prev) => ({ ...prev, [keyId]: data.error || "削除に失敗しました" }));
          return;
        }
      }

      setMessages((prev) => ({ ...prev, [keyId]: "削除しました" }));
      await loadAllApiKeyStatuses();
    } finally {
      setLoading((prev) => ({ ...prev, [keyId]: false }));
    }
  };

  // ステータスラベル生成
  const getStatusLabel = (keyId: string) => {
    const keyStatus = apiKeyStatuses[keyId];
    if (!keyStatus) return { text: "未設定", icon: <XCircle className="w-4 h-4 text-muted-foreground" /> };
    if (!keyStatus.configured) return { text: "未設定", icon: <XCircle className="w-4 h-4 text-muted-foreground" /> };
    if (keyStatus.source === "env") {
      return { text: "設定済み（.env.local）", icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> };
    }
    return { text: "設定済み（アプリ内保存）", icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> };
  };

  // 後方互換用（将来使用予定）
  const _statusLabel = (() => {
    if (!status) return "確認中...";
    if (!status.googleApiKeyConfigured) return "未設定";
    return status.source === "env" ? "設定済み（.env.local）" : "設定済み（アプリ内保存）";
  })();
  void _statusLabel; // ESLint対策

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-sm text-muted-foreground">
          ローカル買い切り版の設定（APIキーやドキュメント）
        </p>
      </div>

      {/* ===== APIキー設定セクション ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-5 h-5" />
            APIキー設定
          </CardTitle>
          <CardDescription>
            各種AIサービスのAPIキーを設定します。保存したキーはローカルDBにのみ保存され、画面に再表示されません。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {API_KEY_CONFIGS.map((config) => {
            const keyStatus = getStatusLabel(config.id);
            const isLoading = loading[config.id] || false;
            const message = messages[config.id];
            const inputValue = apiKeyInputs[config.id] || "";
            
            return (
              <div key={config.id} className="space-y-3 pb-4 border-b last:border-0 last:pb-0">
                {/* ヘッダー */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{config.icon}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{config.name}</h4>
                        {config.required && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                            必須
                          </span>
                        )}
                        {!config.required && (
                          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            任意
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {config.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {config.features.map((feature) => (
                          <span
                            key={feature}
                            className="text-xs bg-secondary px-1.5 py-0.5 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {keyStatus.icon}
                    <span className="text-xs">{keyStatus.text}</span>
                  </div>
                </div>
                
                {/* 入力フォーム */}
                <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                  <Input
                    type="password"
                    placeholder={config.placeholder}
                    value={inputValue}
                    onChange={(e) => 
                      setApiKeyInputs((prev) => ({ ...prev, [config.id]: e.target.value }))
                    }
                  />
                  <Button 
                    onClick={() => saveApiKey(config.id)} 
                    disabled={isLoading || !inputValue.trim()}
                    size="sm"
                  >
                    {isLoading ? "保存中..." : "保存"}
                  </Button>
                  <a href={config.docsUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1">
                      取得
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>
                </div>
                
                {/* 削除ボタン */}
                {apiKeyStatuses[config.id]?.configured && apiKeyStatuses[config.id]?.source === "stored" && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteApiKey(config.id)} 
                      disabled={isLoading}
                      className="text-destructive hover:text-destructive"
                    >
                      保存済みキーを削除
                    </Button>
                  </div>
                )}
                
                {/* メッセージ */}
                {message && (
                  <div className="text-xs rounded-md border bg-muted/30 p-2">
                    {message}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* 推奨設定の説明 */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
              <AlertCircle className="w-4 h-4" />
              推奨設定
            </div>
            <ul className="text-xs text-blue-600 dark:text-blue-300 space-y-1 ml-6 list-disc">
              <li><strong>必須</strong>: Google Gemini API（テキスト・画像生成）</li>
              <li><strong>推奨</strong>: OpenRouter API（🆓Nemotron無料、Perplexity等）</li>
              <li><strong>SNSトレンド分析</strong>: OpenRouter経由でPerplexity Onlineを使用</li>
              <li><strong>動的スクレイピング</strong>: Manus AI API</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ===== ストレージ設定セクション（UX改善版） ===== */}
      <StorageQuickSettings />

      {/* ===== RAG+CAG統計セクション ===== */}
      <RAGStatsCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AIモデル設定</CardTitle>
          <CardDescription>
            用途ごとに使用するAIモデルを選択できます。コスト重視・品質重視など、ニーズに合わせて調整してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {modelSettings && models.length > 0 ? (
            <>
              <ModelSelectorGroup
                models={models}
                value={modelSettings.presets as unknown as Record<string, string>}
                onValueChange={saveModelSettings}
                disabled={modelLoading}
              />

              <div className="flex items-center gap-4 pt-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">コスト上限: </span>
                  <span className="font-medium">
                    {modelSettings.costLimit === "unlimited"
                      ? "無制限"
                      : modelSettings.costLimit === "low"
                      ? "低コストのみ"
                      : modelSettings.costLimit === "medium"
                      ? "中コストまで"
                      : "全モデル"}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">自動ダウングレード: </span>
                  <span className="font-medium">{modelSettings.autoDowngrade ? "有効" : "無効"}</span>
                </div>
              </div>

              {modelMessage && (
                <div className="text-sm rounded-md border bg-muted/30 p-3">
                  {modelMessage}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">読み込み中...</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ドキュメント</CardTitle>
          <CardDescription>
            要件定義書・技術スタック・使い方をアプリ内で確認できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/docs">
            <Button variant="outline">ドキュメントを開く</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}




