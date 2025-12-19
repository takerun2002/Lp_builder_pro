"use client";

/**
 * GoogleAuthSetupWizard - Google認証セットアップウィザード
 *
 * ステップバイステップでGoogle Cloud Console設定をガイド
 * GASテンプレートの説明も含む
 */

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  ExternalLink,
  Copy,
  AlertCircle,
  Info,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  MessageSquare,
  Database,
  Shield,
} from "lucide-react";

interface GoogleAuthSetupWizardProps {
  onComplete?: () => void;
  onSaveOAuth?: (clientId: string, clientSecret: string) => Promise<boolean>;
  googleConfigured?: boolean;
  googleAuthenticated?: boolean;
}

// セットアップステップ
const SETUP_STEPS = [
  {
    id: 1,
    title: "Google Cloud Consoleにアクセス",
    description: "プロジェクトを作成または選択",
  },
  {
    id: 2,
    title: "OAuth 2.0クライアントIDを作成",
    description: "認証情報を設定",
  },
  {
    id: 3,
    title: "クライアントID・シークレットを入力",
    description: "LP Builder Proに設定を保存",
  },
  {
    id: 4,
    title: "接続テスト",
    description: "Googleとの連携を確認",
  },
];

// GASテンプレート情報
const GAS_TEMPLATES = [
  {
    id: "spreadsheet",
    name: "スプレッドシート連携",
    icon: <FileSpreadsheet className="w-5 h-5 text-green-600" />,
    required: true,
    description: "リサーチ結果をGoogle Sheetsに自動保存",
    features: [
      "リサーチ結果をフォーマット付きで保存",
      "ヘッダー行に色付け、列幅自動調整",
      "チームメンバーとリアルタイム共有",
    ],
  },
  {
    id: "slack",
    name: "Slack通知",
    icon: <MessageSquare className="w-5 h-5 text-purple-600" />,
    required: false,
    description: "リサーチ完了時にSlackに通知",
    features: [
      "リサーチ完了通知",
      "画像生成完了通知",
      "チームへの自動共有",
    ],
  },
  {
    id: "backup",
    name: "自動バックアップ",
    icon: <Database className="w-5 h-5 text-blue-600" />,
    required: false,
    description: "定期的にデータをバックアップ",
    features: [
      "毎日の自動バックアップ",
      "プロジェクトデータの保護",
      "復元機能",
    ],
  },
];

export function GoogleAuthSetupWizard({
  onComplete,
  onSaveOAuth,
  googleConfigured = false,
  googleAuthenticated = false,
}: GoogleAuthSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(googleConfigured ? 3 : 1);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: { service: string; status: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const redirectUri = typeof window !== "undefined"
    ? `${window.location.origin}/api/storage/oauth/callback`
    : "http://localhost:3000/api/storage/oauth/callback";

  const handleCopyRedirectUri = useCallback(() => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [redirectUri]);

  const handleSaveOAuth = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError("Client IDとClient Secretを入力してください");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (onSaveOAuth) {
        const success = await onSaveOAuth(clientId.trim(), clientSecret.trim());
        if (success) {
          setCurrentStep(4);
        }
      } else {
        const res = await fetch("/api/storage/oauth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim(),
          }),
        });
        const data = await res.json();
        if (data.ok) {
          setCurrentStep(4);
        } else {
          setError(data.error || "保存に失敗しました");
        }
      }
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // まずOAuth認証を開始
      const res = await fetch("/api/storage/oauth");
      const data = await res.json();

      if (data.ok && data.authUrl) {
        // 認証URLにリダイレクト
        window.location.href = data.authUrl;
      } else {
        setTestResult({
          success: false,
          message: data.error || "認証URLの取得に失敗しました",
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: "接続テストに失敗しました",
      });
    } finally {
      setTesting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4">
              <h4 className="font-medium text-sm mb-2">手順</h4>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">1</span>
                  <div>
                    <p>下のボタンからGoogle Cloud Consoleにアクセス</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">2</span>
                  <div>
                    <p>「プロジェクトを作成」をクリック</p>
                    <p className="text-xs text-muted-foreground">プロジェクト名: 「LP Builder Pro」など</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">3</span>
                  <div>
                    <p>左メニューの「APIとサービス」→「認証情報」を開く</p>
                  </div>
                </li>
              </ol>
            </div>

            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full gap-2">
                Google Cloud Consoleを開く
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>

            <div className="flex justify-end">
              <Button onClick={() => setCurrentStep(2)} variant="outline" className="gap-1">
                次へ
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4">
              <h4 className="font-medium text-sm mb-2">手順</h4>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">1</span>
                  <div>
                    <p>「+ 認証情報を作成」→「OAuth クライアント ID」をクリック</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">2</span>
                  <div>
                    <p>アプリケーションの種類: 「ウェブ アプリケーション」を選択</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">3</span>
                  <div>
                    <p>名前: 「LP Builder Pro」など</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">4</span>
                  <div>
                    <p>「承認済みのリダイレクト URI」に以下を追加:</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 rounded bg-muted px-2 py-1 text-xs break-all">
                        {redirectUri}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyRedirectUri}
                        className="flex-shrink-0"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">5</span>
                  <div>
                    <p>「作成」をクリック</p>
                    <p className="text-xs text-muted-foreground">クライアントIDとシークレットが表示されます</p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-400">OAuth同意画面の設定</p>
                  <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                    初回は「OAuth同意画面」の設定が必要な場合があります。
                    「外部」を選択し、アプリ名とメールアドレスを入力してください。
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button onClick={() => setCurrentStep(1)} variant="outline" className="gap-1">
                <ArrowLeft className="w-4 h-4" />
                戻る
              </Button>
              <Button onClick={() => setCurrentStep(3)} variant="outline" className="gap-1">
                次へ
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="xxxx.apps.googleusercontent.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="GOCSPX-..."
                  className="mt-1"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  認証情報はローカルDBにのみ保存され、外部に送信されません。
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button onClick={() => setCurrentStep(2)} variant="outline" className="gap-1">
                <ArrowLeft className="w-4 h-4" />
                戻る
              </Button>
              <Button
                onClick={handleSaveOAuth}
                disabled={saving || !clientId || !clientSecret}
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "設定を保存"
                )}
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h4 className="font-medium">OAuth設定が完了しました</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Googleとの接続テストを行ってください
              </p>
            </div>

            {testResult && (
              <div
                className={`rounded-lg p-4 ${
                  testResult.success
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                    {testResult.success ? "接続成功" : "接続失敗"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{testResult.message}</p>
                {testResult.details && (
                  <ul className="mt-2 space-y-1">
                    {testResult.details.map((detail, i) => (
                      <li key={i} className="text-xs flex items-center gap-2">
                        {detail.status === "ok" ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-red-500" />
                        )}
                        <span>{detail.service}: {detail.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <Button
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  接続中...
                </>
              ) : googleAuthenticated ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  接続済み - 再テスト
                </>
              ) : (
                "Googleと接続してテスト"
              )}
            </Button>

            {googleAuthenticated && onComplete && (
              <Button onClick={onComplete} variant="outline" className="w-full">
                完了
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* セットアップウィザード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Google Workspace連携セットアップ
          </CardTitle>
          <CardDescription>
            ステップバイステップでGoogle連携を設定します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ステップインジケーター */}
          <div className="flex items-center justify-between mb-6">
            {SETUP_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep > step.id
                        ? "bg-green-500 text-white"
                        : currentStep === step.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className="text-xs mt-1 text-center max-w-[80px] hidden md:block">
                    {step.title}
                  </span>
                </div>
                {index < SETUP_STEPS.length - 1 && (
                  <div
                    className={`w-8 md:w-16 h-0.5 mx-1 ${
                      currentStep > step.id ? "bg-green-500" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 現在のステップタイトル（モバイル用） */}
          <div className="md:hidden mb-4 text-center">
            <h4 className="font-medium">{SETUP_STEPS[currentStep - 1].title}</h4>
            <p className="text-sm text-muted-foreground">
              {SETUP_STEPS[currentStep - 1].description}
            </p>
          </div>

          {/* ステップコンテンツ */}
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* GASテンプレート説明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-amber-500" />
            GASテンプレート（オプション）
          </CardTitle>
          <CardDescription>
            Google Apps Scriptを使った追加機能。基本機能だけでも十分動作します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {GAS_TEMPLATES.map((template) => (
              <AccordionItem key={template.id} value={template.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    {template.icon}
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        {template.required ? (
                          <Badge variant="default" className="text-xs">推奨</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">オプション</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-normal">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-8 space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">できること:</p>
                      <ul className="space-y-1">
                        {template.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {!template.required && (
                      <p className="text-xs text-muted-foreground">
                        この機能は必須ではありません。必要に応じて後から追加できます。
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-4 rounded-lg bg-muted/50 p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium">ヒント</p>
                <p>GASテンプレートなしでも、Google Drive/Sheetsとの基本連携は動作します。</p>
                <p>Slack通知や自動バックアップが必要な場合のみ、GASテンプレートを設定してください。</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
