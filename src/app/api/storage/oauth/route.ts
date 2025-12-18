/**
 * Google OAuth 開始エンドポイント
 * GET: 認証URLを取得
 * POST: クライアント設定を保存
 */

import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuth } from "@/lib/storage/google-auth";
import { generateId } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET: 認証URLを取得
 */
export async function GET(): Promise<NextResponse> {
  try {
    const authManager = getGoogleAuth();

    // クライアント設定が完了しているか確認
    if (!authManager.isConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Google OAuth未設定: Client IDとClient Secretを設定してください",
        },
        { status: 400 }
      );
    }

    // CSRF保護用のstate生成
    const state = generateId();

    // 認証URLを生成
    const authUrl = authManager.getAuthorizationUrl(state);

    return NextResponse.json({
      ok: true,
      authUrl,
      state,
    });
  } catch (err) {
    console.error("[storage/oauth] GET error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "認証URLの生成に失敗しました",
      },
      { status: 500 }
    );
  }
}

/**
 * POST: クライアント設定を保存
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { clientId, clientSecret } = body as {
      clientId?: string;
      clientSecret?: string;
    };

    if (!clientId || typeof clientId !== "string" || clientId.trim() === "") {
      return NextResponse.json(
        { ok: false, error: "clientId is required" },
        { status: 400 }
      );
    }

    if (
      !clientSecret ||
      typeof clientSecret !== "string" ||
      clientSecret.trim() === ""
    ) {
      return NextResponse.json(
        { ok: false, error: "clientSecret is required" },
        { status: 400 }
      );
    }

    const authManager = getGoogleAuth();
    authManager.saveClientConfig(clientId.trim(), clientSecret.trim());

    return NextResponse.json({
      ok: true,
      message: "クライアント設定を保存しました",
    });
  } catch (err) {
    console.error("[storage/oauth] POST error:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "クライアント設定の保存に失敗しました",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: クライアント設定とトークンを削除
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    const authManager = getGoogleAuth();

    // トークンを取り消し
    await authManager.revokeAccess();

    // クライアント設定を削除
    authManager.clearClientConfig();

    return NextResponse.json({
      ok: true,
      message: "Google連携を解除しました",
    });
  } catch (err) {
    console.error("[storage/oauth] DELETE error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "連携解除に失敗しました",
      },
      { status: 500 }
    );
  }
}
