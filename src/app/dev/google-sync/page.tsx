"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// =============================================================================
// Types
// =============================================================================

interface ConnectionStatus {
  configured: boolean;
  authenticated: boolean;
  expiresAt?: string;
}

interface Spreadsheet {
  projectName: string;
  spreadsheetId: string;
  url: string;
}

interface GASTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  setupInstructions: string[];
  triggers?: { type: string; config?: Record<string, unknown> }[];
}

// =============================================================================
// Page Component
// =============================================================================

export default function GoogleSyncPage() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [templates, setTemplates] = useState<GASTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // フォーム状態
  const [newProjectName, setNewProjectName] = useState("");
  const [connectSpreadsheetId, setConnectSpreadsheetId] = useState("");
  const [connectProjectName, setConnectProjectName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [gasCode, setGasCode] = useState("");

  // 接続状態を取得
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/google/sync?action=status");
      const data = await res.json();
      if (data.ok) {
        setStatus(data);
      }
    } catch {
      console.error("Failed to fetch status");
    }
  }, []);

  // スプレッドシート一覧を取得
  const fetchSpreadsheets = useCallback(async () => {
    try {
      const res = await fetch("/api/google/sync?action=spreadsheets");
      const data = await res.json();
      if (data.ok) {
        setSpreadsheets(data.spreadsheets);
      }
    } catch {
      console.error("Failed to fetch spreadsheets");
    }
  }, []);

  // GASテンプレート一覧を取得
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/google/sync?action=gas-templates");
      const data = await res.json();
      if (data.ok) {
        setTemplates(data.templates);
      }
    } catch {
      console.error("Failed to fetch templates");
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchSpreadsheets();
    fetchTemplates();
  }, [fetchStatus, fetchSpreadsheets, fetchTemplates]);

  // 新規スプレッドシート作成
  const handleCreateSpreadsheet = async () => {
    if (!newProjectName.trim()) {
      setError("プロジェクト名を入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/google/sync?action=init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: newProjectName }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error);
      }

      setSuccess(`スプレッドシートを作成しました: ${data.url}`);
      setNewProjectName("");
      fetchSpreadsheets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // 既存スプレッドシートに接続
  const handleConnectSpreadsheet = async () => {
    if (!connectSpreadsheetId.trim()) {
      setError("スプレッドシートIDを入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/google/sync?action=connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId: connectSpreadsheetId,
          projectName: connectProjectName || undefined,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error);
      }

      setSuccess("スプレッドシートに接続しました");
      setConnectSpreadsheetId("");
      setConnectProjectName("");
      fetchSpreadsheets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "接続に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // GASコードを取得
  const handleGetGASCode = async (templateId: string) => {
    setSelectedTemplate(templateId);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/google/sync?action=gas-code&templateId=${templateId}`
      );
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error);
      }

      setGasCode(data.template.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // コードをクリップボードにコピー
  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasCode);
    setSuccess("コードをクリップボードにコピーしました");
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Google Workspace連携</h1>
        <p className="text-muted-foreground">
          スプレッドシートへのデータ蓄積とGAS自動化
        </p>
      </div>

      {/* 接続状態 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>接続状態</span>
            {status && (
              <Badge variant={status.authenticated ? "default" : "secondary"}>
                {status.authenticated ? "接続済み" : "未接続"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">OAuth設定:</span>
                <span>{status.configured ? "完了" : "未設定"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">認証:</span>
                <span>{status.authenticated ? "認証済み" : "未認証"}</span>
              </div>
              {status.expiresAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">トークン有効期限:</span>
                  <span>{new Date(status.expiresAt).toLocaleString("ja-JP")}</span>
                </div>
              )}
              {!status.configured && (
                <p className="text-amber-600 mt-2">
                  設定画面からGoogle OAuth情報を設定してください
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">読み込み中...</p>
          )}
        </CardContent>
      </Card>

      {/* エラー・成功メッセージ */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* メインコンテンツ */}
      <Tabs defaultValue="spreadsheets">
        <TabsList className="mb-4">
          <TabsTrigger value="spreadsheets">スプレッドシート</TabsTrigger>
          <TabsTrigger value="gas">GASテンプレート</TabsTrigger>
        </TabsList>

        {/* スプレッドシートタブ */}
        <TabsContent value="spreadsheets" className="space-y-6">
          {/* 新規作成 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">新規スプレッドシート作成</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>プロジェクト名</Label>
                <div className="flex gap-2">
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="例: 美容LP制作"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCreateSpreadsheet}
                    disabled={loading || !status?.authenticated}
                  >
                    {loading ? "作成中..." : "作成"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                リサーチ結果、コンセプト案、ヘッドライン、進捗管理の4シートを自動作成します
              </p>
            </CardContent>
          </Card>

          {/* 既存接続 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">既存スプレッドシートに接続</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>スプレッドシートID</Label>
                <Input
                  value={connectSpreadsheetId}
                  onChange={(e) => setConnectSpreadsheetId(e.target.value)}
                  placeholder="スプレッドシートURLからIDをコピー"
                />
              </div>
              <div className="space-y-2">
                <Label>プロジェクト名（任意）</Label>
                <div className="flex gap-2">
                  <Input
                    value={connectProjectName}
                    onChange={(e) => setConnectProjectName(e.target.value)}
                    placeholder="関連付けるプロジェクト名"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleConnectSpreadsheet}
                    disabled={loading || !status?.authenticated}
                    variant="outline"
                  >
                    接続
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* スプレッドシート一覧 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                接続済みスプレッドシート ({spreadsheets.length}件)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {spreadsheets.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  まだスプレッドシートがありません
                </p>
              ) : (
                <div className="space-y-2">
                  {spreadsheets.map((sheet) => (
                    <div
                      key={sheet.spreadsheetId}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{sheet.projectName}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {sheet.spreadsheetId}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(sheet.url, "_blank")}
                      >
                        開く
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GASテンプレートタブ */}
        <TabsContent value="gas" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* テンプレート一覧 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">GASテンプレート</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {templates.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    読み込み中...
                  </p>
                ) : (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate === template.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-gray-400"
                      }`}
                      onClick={() => handleGetGASCode(template.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">{template.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* コード表示 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>GASコード</span>
                  {gasCode && (
                    <Button variant="outline" size="sm" onClick={handleCopyCode}>
                      コピー
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gasCode ? (
                  <div className="space-y-4">
                    <Textarea
                      value={gasCode}
                      readOnly
                      className="font-mono text-xs h-80"
                    />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-medium">使い方:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>
                          スプレッドシートを開き「拡張機能」→「Apps Script」
                        </li>
                        <li>上のコードをコピーして貼り付け</li>
                        <li>設定値（WEBHOOK_URL等）を編集</li>
                        <li>トリガーを設定して保存</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    左のテンプレートを選択してください
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* セットアップ手順 */}
          {selectedTemplate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">セットアップ手順</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const template = templates.find(
                    (t) => t.id === selectedTemplate
                  );
                  if (!template) return null;

                  return (
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      {template.setupInstructions.map((instruction, index) => (
                        <li key={index}>{instruction}</li>
                      ))}
                    </ol>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
