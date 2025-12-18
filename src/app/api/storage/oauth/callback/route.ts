/**
 * Google OAuth コールバックエンドポイント
 * Googleからのリダイレクト後にトークンを取得
 */

import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuth } from "@/lib/storage/google-auth";

export const runtime = "nodejs";

/**
 * GET: OAuthコールバック処理
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // リダイレクト先のベースURL
  const redirectBase = new URL("/dev/storage-settings", request.url).origin;
  const settingsUrl = `${redirectBase}/dev/storage-settings`;

  // エラーがある場合
  if (error) {
    console.error("[storage/oauth/callback] OAuth error:", error, errorDescription);
    const errorMsg = errorDescription || error;
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(errorMsg)}`
    );
  }

  // 認証コードがない場合
  if (!code) {
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent("認証コードが見つかりません")}`
    );
  }

  try {
    const authManager = getGoogleAuth();

    // 認証コードをトークンに交換
    await authManager.exchangeCodeForTokens(code);

    console.log("[storage/oauth/callback] Token exchange successful");

    // 成功時は設定ページにリダイレクト
    return NextResponse.redirect(`${settingsUrl}?success=true`);
  } catch (err) {
    console.error("[storage/oauth/callback] Token exchange failed:", err);
    const errorMsg =
      err instanceof Error ? err.message : "トークンの取得に失敗しました";
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(errorMsg)}`
    );
  }
}
