"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApiKeySource = "env" | "stored" | "none";

export default function SettingsPage() {
  const [status, setStatus] = useState<{
    googleApiKeyConfigured: boolean;
    source: ApiKeySource;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/settings/status");
      const data = (await res.json()) as { ok: boolean; googleApiKeyConfigured: boolean; source: ApiKeySource };
      if (data.ok) setStatus({ googleApiKeyConfigured: data.googleApiKeyConfigured, source: data.source });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStatus().catch(() => {});
  }, []);

  const saveKey = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/google-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleApiKey }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setMessage(data.error || "保存に失敗しました");
        return;
      }
      setGoogleApiKey("");
      setMessage("保存しました（ローカルにのみ保存）");
      await loadStatus();
    } finally {
      setLoading(false);
    }
  };

  const deleteStoredKey = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/google-api-key", { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setMessage(data.error || "削除に失敗しました");
        return;
      }
      setMessage("保存済みキーを削除しました");
      await loadStatus();
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (() => {
    if (!status) return "確認中...";
    if (!status.googleApiKeyConfigured) return "未設定";
    return status.source === "env" ? "設定済み（.env.local）" : "設定済み（アプリ内保存）";
  })();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-sm text-muted-foreground">
          ローカル買い切り版の設定（APIキーやドキュメント）
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gemini APIキー</CardTitle>
          <CardDescription>
            ここで保存したキーはローカルDBにのみ保存され、画面に再表示しません。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground">状態: </span>
              <span className="font-medium">{statusLabel}</span>
            </div>
            <Link href="/docs">
              <Button variant="outline" size="sm">使い方</Button>
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              type="password"
              placeholder="Google API Key を貼り付け（例: AIza...）"
              value={googleApiKey}
              onChange={(e) => setGoogleApiKey(e.target.value)}
            />
            <Button onClick={saveKey} disabled={loading || !googleApiKey.trim()}>
              {loading ? "保存中..." : "保存"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" onClick={deleteStoredKey} disabled={loading}>
              保存済みキーを削除
            </Button>
            <span className="text-xs text-muted-foreground">
              ※ .env.local に設定している場合は削除しても影響しません
            </span>
          </div>

          {message && (
            <div className="text-sm rounded-md border bg-muted/30 p-3">
              {message}
            </div>
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



