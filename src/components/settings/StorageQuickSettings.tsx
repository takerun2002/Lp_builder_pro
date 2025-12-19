"use client";

/**
 * StorageQuickSettings - ストレージ設定クイックUI
 *
 * ユーザーにわかりやすくストレージモードを選択できるコンポーネント
 * 「これで何ができるの？」を常に明示
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HardDrive,
  Cloud,
  Layers,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Settings2,
} from "lucide-react";

type StorageMode = "local" | "cloud" | "hybrid";

interface StorageOption {
  id: StorageMode;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  recommended?: string;
  pros: string[];
  cons: string[];
  requiresGoogle: boolean;
  features: string[];
}

const STORAGE_OPTIONS: StorageOption[] = [
  {
    id: "local",
    name: "ローカルストレージ",
    subtitle: "個人利用におすすめ",
    icon: <HardDrive className="w-6 h-6" />,
    recommended: "個人利用",
    pros: ["すぐ使える、設定不要", "インターネット不要でも動作", "データは完全にローカル保存"],
    cons: ["チーム共有不可", "バックアップは手動"],
    requiresGoogle: false,
    features: [
      "プロジェクト・画像をローカルに保存",
      "リサーチ結果をSQLiteに保存",
      "オフラインでも利用可能",
    ],
  },
  {
    id: "cloud",
    name: "Google Drive",
    subtitle: "チーム利用におすすめ",
    icon: <Cloud className="w-6 h-6" />,
    recommended: "チーム利用",
    pros: ["チームメンバーとリアルタイム共有", "自動バックアップ", "どのデバイスからもアクセス"],
    cons: ["Google接続が必要", "インターネット必須"],
    requiresGoogle: true,
    features: [
      "リサーチ結果をGoogle Sheetsに自動保存",
      "画像をGoogle Driveに保存",
      "チームメンバーとリアルタイム共有",
      "コメント・フィードバック機能",
    ],
  },
  {
    id: "hybrid",
    name: "ハイブリッド",
    subtitle: "自動最適化",
    icon: <Layers className="w-6 h-6" />,
    pros: ["データ種別で最適な保存先を自動選択", "オフライン時はローカルにキャッシュ", "復帰時に自動同期"],
    cons: ["Google接続が必要"],
    requiresGoogle: true,
    features: [
      "設定・キャッシュはローカル保存",
      "リサーチ結果はGoogle Sheets",
      "画像はGoogle Drive",
      "オフライン対応",
    ],
  },
];

interface StorageQuickSettingsProps {
  showHeader?: boolean;
  compact?: boolean;
  className?: string;
}

export function StorageQuickSettings({
  showHeader = true,
  compact = false,
  className,
}: StorageQuickSettingsProps) {
  const [currentMode, setCurrentMode] = useState<StorageMode | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/storage/config");
      const data = await res.json();
      if (data.ok) {
        setCurrentMode(data.config.mode);
        setGoogleConnected(data.status.googleAuthenticated);
        setGoogleConfigured(data.status.googleConfigured);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleModeChange = async (mode: StorageMode) => {
    const option = STORAGE_OPTIONS.find((o) => o.id === mode);
    if (option?.requiresGoogle && !googleConnected) {
      setMessage({
        type: "error",
        text: "このモードにはGoogle接続が必要です。先にGoogleと連携してください。",
      });
      return;
    }

    setChanging(true);
    setMessage(null);

    try {
      const res = await fetch("/api/storage/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (data.ok) {
        setCurrentMode(mode);
        setMessage({ type: "success", text: "ストレージモードを変更しました" });
      } else {
        setMessage({ type: "error", text: data.error || "変更に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "変更に失敗しました" });
    } finally {
      setChanging(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const res = await fetch("/api/storage/oauth");
      const data = await res.json();
      if (data.ok) {
        window.location.href = data.authUrl;
      } else {
        setMessage({ type: "error", text: data.error || "認証URLの取得に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "認証の開始に失敗しました" });
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>読み込み中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="w-5 h-5" />
            データの保存先
          </CardTitle>
          <CardDescription>
            プロジェクト・画像・リサーチ結果の保存先を選択します
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {/* メッセージ */}
        {message && (
          <div
            className={`rounded-md border p-3 text-sm ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Google接続ステータス */}
        <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                googleConnected ? "bg-green-500" : "bg-gray-300"
              }`}
            />
            <div>
              <span className="text-sm font-medium">
                Google Workspace: {googleConnected ? "接続済み" : "未接続"}
              </span>
              {!googleConnected && googleConfigured && (
                <p className="text-xs text-muted-foreground">OAuth設定済み・未認証</p>
              )}
              {!googleConnected && !googleConfigured && (
                <p className="text-xs text-muted-foreground">OAuth設定が必要です</p>
              )}
            </div>
          </div>
          {googleConnected ? (
            <Badge variant="outline" className="text-green-600 border-green-300">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              接続済み
            </Badge>
          ) : googleConfigured ? (
            <Button size="sm" onClick={handleGoogleConnect}>
              Googleと接続
            </Button>
          ) : (
            <Link href="/dev/storage-settings">
              <Button size="sm" variant="outline">
                設定する
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          )}
        </div>

        {/* ストレージモード選択 */}
        <div className={`grid gap-3 ${compact ? "grid-cols-1" : "md:grid-cols-3"}`}>
          {STORAGE_OPTIONS.map((option) => {
            const isSelected = currentMode === option.id;
            const isDisabled = option.requiresGoogle && !googleConnected;

            return (
              <button
                key={option.id}
                onClick={() => handleModeChange(option.id)}
                disabled={changing || isDisabled}
                className={`relative rounded-lg border p-4 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : isDisabled
                    ? "border-input bg-muted/30 opacity-60 cursor-not-allowed"
                    : "border-input hover:bg-muted/50 hover:border-primary/50"
                }`}
              >
                {/* 推奨バッジ */}
                {option.recommended && (
                  <Badge
                    variant={isSelected ? "default" : "secondary"}
                    className="absolute -top-2 right-2 text-xs"
                  >
                    {option.recommended}
                  </Badge>
                )}

                {/* ヘッダー */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${isSelected ? "bg-primary/10 text-primary" : "bg-muted"}`}>
                    {option.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{option.name}</h4>
                    <p className="text-xs text-muted-foreground">{option.subtitle}</p>
                  </div>
                </div>

                {/* できること */}
                {!compact && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">できること:</p>
                    <ul className="space-y-1">
                      {option.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs">
                          <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 選択中インジケーター */}
                {isSelected && (
                  <div className="absolute top-2 left-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                )}

                {/* Google必須警告 */}
                {isDisabled && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle className="w-3 h-3" />
                    <span>Google接続が必要</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 現在のモードの詳細説明 */}
        {currentMode && !compact && (
          <div className="rounded-lg bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                現在の設定: {STORAGE_OPTIONS.find((o) => o.id === currentMode)?.name}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* メリット */}
              <div>
                <p className="text-xs font-medium text-green-600 mb-1">メリット</p>
                <ul className="space-y-1">
                  {STORAGE_OPTIONS.find((o) => o.id === currentMode)?.pros.map((pro, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* デメリット */}
              <div>
                <p className="text-xs font-medium text-amber-600 mb-1">注意点</p>
                <ul className="space-y-1">
                  {STORAGE_OPTIONS.find((o) => o.id === currentMode)?.cons.map((con, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <XCircle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 詳細設定へのリンク */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            同期設定・OAuth設定は詳細設定画面で行えます
          </p>
          <Link href="/dev/storage-settings">
            <Button variant="ghost" size="sm" className="gap-1">
              詳細設定
              <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
