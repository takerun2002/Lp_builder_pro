"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StorageQuickSettings, GoogleAuthSetupWizard } from "@/components/settings";
import { Settings, Sparkles, Database } from "lucide-react";

type StorageMode = "local" | "cloud" | "hybrid";
type SyncStatus = "idle" | "syncing" | "success" | "error";

interface StorageConfig {
  mode: StorageMode;
  autoSync: boolean;
  syncIntervalMinutes: number;
  offlineQueueEnabled: boolean;
}

interface ConnectionStatus {
  googleConfigured: boolean;
  googleAuthenticated: boolean;
  lastSyncAt?: string;
  queueSize: number;
}

interface SyncResult {
  success: boolean;
  syncedAt: string;
  itemsSynced: number;
  conflicts: { key: string; resolution: string }[];
  errors: { key: string; error: string }[];
}

function StorageSettingsContent() {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);


  // URLパラメータからメッセージを表示
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      setMessage({ type: "success", text: "Googleとの連携が完了しました" });
    } else if (error) {
      setMessage({ type: "error", text: `エラー: ${decodeURIComponent(error)}` });
    }
  }, [searchParams]);

  // 設定を読み込み
  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/storage/config");
      const data = await res.json();
      if (data.ok) {
        setConfig(data.config);
        setStatus(data.status);
      } else {
        setMessage({ type: "error", text: data.error || "設定の読み込みに失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "設定の読み込みに失敗しました" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 自動同期を切り替え
  const handleAutoSyncToggle = async () => {
    if (!config) return;

    try {
      const res = await fetch("/api/storage/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSync: !config.autoSync }),
      });
      const data = await res.json();
      if (data.ok) {
        setConfig(data.config);
      } else {
        setMessage({ type: "error", text: data.error || "変更に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "変更に失敗しました" });
    }
  };

  // 同期間隔を変更
  const handleIntervalChange = async (interval: number) => {
    try {
      const res = await fetch("/api/storage/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncIntervalMinutes: interval }),
      });
      const data = await res.json();
      if (data.ok) {
        setConfig(data.config);
      } else {
        setMessage({ type: "error", text: data.error || "変更に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "変更に失敗しました" });
    }
  };

  // 手動同期
  const handleSync = async () => {
    setSyncStatus("syncing");
    setSyncResult(null);

    try {
      const res = await fetch("/api/storage/sync", { method: "POST" });
      const data = await res.json();

      if (data.ok) {
        setSyncStatus("success");
        setSyncResult(data.result);
        await loadConfig();
      } else {
        setSyncStatus("error");
        setMessage({ type: "error", text: data.error || "同期に失敗しました" });
      }
    } catch {
      setSyncStatus("error");
      setMessage({ type: "error", text: "同期に失敗しました" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ストレージ設定</h1>
            <p className="text-sm text-muted-foreground">
              データの保存先とGoogle Workspace連携の設定
            </p>
          </div>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              戻る
            </Button>
          </Link>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-md border p-4 ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="ml-4 text-sm underline"
            >
              閉じる
            </button>
          </div>
        )}

        {/* タブ形式のUI */}
        <Tabs defaultValue={status?.googleConfigured ? "storage" : "setup"} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup" className="gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">セットアップ</span>
            </TabsTrigger>
            <TabsTrigger value="storage" className="gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">ストレージ</span>
            </TabsTrigger>
            <TabsTrigger value="sync" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">同期設定</span>
            </TabsTrigger>
          </TabsList>

          {/* セットアップタブ - Google認証ウィザード */}
          <TabsContent value="setup">
            <GoogleAuthSetupWizard
              googleConfigured={status?.googleConfigured}
              googleAuthenticated={status?.googleAuthenticated}
              onComplete={loadConfig}
              onSaveOAuth={async (id, secret) => {
                try {
                  const res = await fetch("/api/storage/oauth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ clientId: id, clientSecret: secret }),
                  });
                  const data = await res.json();
                  if (data.ok) {
                    await loadConfig();
                    return true;
                  }
                  return false;
                } catch {
                  return false;
                }
              }}
            />
          </TabsContent>

          {/* ストレージタブ - モード選択 */}
          <TabsContent value="storage">
            <StorageQuickSettings showHeader={false} />
          </TabsContent>

          {/* 同期設定タブ */}
          <TabsContent value="sync" className="space-y-4">
            {/* Sync Settings */}
            {config?.mode !== "local" ? (
              <Card>
            <CardHeader>
              <CardTitle className="text-base">同期設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Auto Sync Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動同期</p>
                  <p className="text-sm text-muted-foreground">
                    定期的にクラウドと同期します
                  </p>
                </div>
                <Button
                  variant={config?.autoSync ? "default" : "outline"}
                  size="sm"
                  onClick={handleAutoSyncToggle}
                >
                  {config?.autoSync ? "ON" : "OFF"}
                </Button>
              </div>

              {/* Sync Interval */}
              {config?.autoSync && (
                <div className="flex items-center gap-4">
                  <span className="text-sm">同期間隔</span>
                  <div className="flex gap-2">
                    {[1, 5, 15, 30].map((interval) => (
                      <Button
                        key={interval}
                        variant={
                          config?.syncIntervalMinutes === interval
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => handleIntervalChange(interval)}
                      >
                        {interval}分
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Sync */}
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <p className="text-sm">
                    最終同期:{" "}
                    <span className="text-muted-foreground">
                      {status?.lastSyncAt
                        ? new Date(status.lastSyncAt).toLocaleString("ja-JP")
                        : "未同期"}
                    </span>
                  </p>
                  {status?.queueSize && status.queueSize > 0 && (
                    <p className="text-sm text-yellow-600">
                      未同期のデータ: {status.queueSize}件
                    </p>
                  )}
                </div>
                <Button onClick={handleSync} disabled={syncStatus === "syncing"}>
                  {syncStatus === "syncing" ? "同期中..." : "今すぐ同期"}
                </Button>
              </div>

              {/* Sync Progress */}
              {syncStatus === "syncing" && (
                <Progress value={undefined} className="h-2" />
              )}

              {/* Sync Result */}
              {syncResult && (
                <div
                  className={`rounded-lg p-4 ${
                    syncResult.success ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <p className="font-medium">
                    {syncResult.success ? "同期完了" : "同期エラー"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {syncResult.itemsSynced}件を同期しました
                  </p>
                  {syncResult.conflicts.length > 0 && (
                    <p className="text-sm text-yellow-600">
                      競合: {syncResult.conflicts.length}件
                    </p>
                  )}
                  {syncResult.errors.length > 0 && (
                    <p className="text-sm text-red-600">
                      エラー: {syncResult.errors.length}件
                    </p>
                  )}
                </div>
              )}
              </CardContent>
            </Card>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    ローカルモードでは同期設定は不要です。
                    <br />
                    Google連携を使用する場合は「ストレージ」タブでモードを変更してください。
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Data Mapping Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">データ保存先マッピング</CardTitle>
                <CardDescription>
                  ハイブリッドモードでのデータ種別ごとの保存先
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left">データ種別</th>
                        <th className="py-2 text-center">ローカル</th>
                        <th className="py-2 text-center">Sheets</th>
                        <th className="py-2 text-center">Drive</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2">ユーザー設定</td>
                        <td className="py-2 text-center text-green-600">Master</td>
                        <td className="py-2 text-center">-</td>
                        <td className="py-2 text-center">-</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">リサーチ結果</td>
                        <td className="py-2 text-center text-gray-500">Cache</td>
                        <td className="py-2 text-center text-green-600">Master</td>
                        <td className="py-2 text-center">-</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">コンセプト案</td>
                        <td className="py-2 text-center text-gray-500">Draft</td>
                        <td className="py-2 text-center text-green-600">Shared</td>
                        <td className="py-2 text-center">-</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">生成画像</td>
                        <td className="py-2 text-center text-gray-500">Cache</td>
                        <td className="py-2 text-center">-</td>
                        <td className="py-2 text-center text-green-600">Master</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">LP HTMLエクスポート</td>
                        <td className="py-2 text-center">-</td>
                        <td className="py-2 text-center">-</td>
                        <td className="py-2 text-center text-green-600">Master</td>
                      </tr>
                      <tr>
                        <td className="py-2">ナレッジYAML</td>
                        <td className="py-2 text-center text-green-600">Master</td>
                        <td className="py-2 text-center">-</td>
                        <td className="py-2 text-center text-blue-600">Shared</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function StorageSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-gray-600">読み込み中...</div></div>}>
      <StorageSettingsContent />
    </Suspense>
  );
}
