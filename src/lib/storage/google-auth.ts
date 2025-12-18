/**
 * Google OAuth Manager
 * セルフホスト型：ユーザーが自分で取得したOAuth認証情報を使用
 */

import { google } from "googleapis";
import { getDb } from "@/lib/db";
import type { GoogleAuthConfig, GoogleClientConfig, GoogleOAuthRow } from "./types";

// 必要なスコープ
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

export class GoogleAuthManager {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2> | null = null;

  /**
   * OAuth クライアント設定を取得
   * 優先順位: 環境変数 > DB設定
   */
  getClientConfig(): GoogleClientConfig | null {
    // 環境変数から取得
    const envClientId = process.env.GOOGLE_CLIENT_ID;
    const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (envClientId && envClientSecret) {
      return {
        clientId: envClientId,
        clientSecret: envClientSecret,
        redirectUri: this.getRedirectUri(),
      };
    }

    // DBから取得
    const db = getDb();
    const clientIdRow = db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get("google_client_id") as { value: string } | undefined;
    const clientSecretRow = db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get("google_client_secret") as { value: string } | undefined;

    if (clientIdRow && clientSecretRow) {
      return {
        clientId: clientIdRow.value,
        clientSecret: clientSecretRow.value,
        redirectUri: this.getRedirectUri(),
      };
    }

    return null;
  }

  /**
   * OAuth クライアント設定を保存
   */
  saveClientConfig(clientId: string, clientSecret: string): void {
    const db = getDb();
    const now = new Date().toISOString();

    // Client ID
    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run("google_client_id", clientId, now);

    // Client Secret
    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run("google_client_secret", clientSecret, now);

    // キャッシュをクリア
    this.oauth2Client = null;
  }

  /**
   * リダイレクトURIを取得
   */
  private getRedirectUri(): string {
    return (
      process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:3000/api/storage/oauth/callback"
    );
  }

  /**
   * OAuth2クライアントを取得（キャッシュ付き）
   */
  private getOAuth2Client(): InstanceType<typeof google.auth.OAuth2> {
    if (this.oauth2Client) {
      return this.oauth2Client;
    }

    const config = this.getClientConfig();
    if (!config) {
      throw new Error(
        "Google OAuth未設定: GOOGLE_CLIENT_IDとGOOGLE_CLIENT_SECRETを設定してください"
      );
    }

    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    return this.oauth2Client;
  }

  /**
   * 認証URLを生成
   */
  getAuthorizationUrl(state?: string): string {
    const oauth2Client = this.getOAuth2Client();

    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent", // 毎回refresh_tokenを取得するため
      state: state || "",
    });
  }

  /**
   * 認証コードをトークンに交換
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleAuthConfig> {
    const oauth2Client = this.getOAuth2Client();

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("トークンの取得に失敗しました");
    }

    const config: GoogleAuthConfig = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString(),
      scope: SCOPES,
    };

    // トークンを保存
    await this.saveTokens(config);

    return config;
  }

  /**
   * トークンを保存
   */
  async saveTokens(config: GoogleAuthConfig): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO google_oauth (id, access_token, refresh_token, expires_at, scope, updated_at)
       VALUES (1, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         access_token = excluded.access_token,
         refresh_token = excluded.refresh_token,
         expires_at = excluded.expires_at,
         scope = excluded.scope,
         updated_at = excluded.updated_at`
    ).run(
      config.accessToken,
      config.refreshToken,
      config.expiresAt,
      JSON.stringify(config.scope),
      now
    );
  }

  /**
   * 保存されたトークンを取得
   */
  async getStoredTokens(): Promise<GoogleAuthConfig | null> {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM google_oauth WHERE id = 1")
      .get() as GoogleOAuthRow | undefined;

    if (!row) {
      return null;
    }

    return {
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      scope: JSON.parse(row.scope),
    };
  }

  /**
   * 有効なアクセストークンを取得（必要に応じてリフレッシュ）
   */
  async getValidAccessToken(): Promise<string> {
    const stored = await this.getStoredTokens();

    if (!stored) {
      throw new Error("Google認証が必要です。設定画面から連携してください。");
    }

    // トークンの有効期限をチェック（5分のマージン）
    const expiresAt = new Date(stored.expiresAt).getTime();
    const now = Date.now();
    const marginMs = 5 * 60 * 1000;

    if (expiresAt - now > marginMs) {
      // まだ有効
      return stored.accessToken;
    }

    // リフレッシュが必要
    return await this.refreshAccessToken(stored.refreshToken);
  }

  /**
   * アクセストークンをリフレッシュ
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    const oauth2Client = this.getOAuth2Client();

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error("トークンのリフレッシュに失敗しました");
    }

    const config: GoogleAuthConfig = {
      accessToken: credentials.access_token,
      refreshToken: refreshToken, // refresh_tokenは通常変わらない
      expiresAt: credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString(),
      scope: SCOPES,
    };

    await this.saveTokens(config);

    return credentials.access_token;
  }

  /**
   * 認証済みかどうかを確認
   */
  async isAuthenticated(): Promise<boolean> {
    const stored = await this.getStoredTokens();
    return stored !== null;
  }

  /**
   * OAuth設定が完了しているか確認
   */
  isConfigured(): boolean {
    return this.getClientConfig() !== null;
  }

  /**
   * 認証を取り消し
   */
  async revokeAccess(): Promise<void> {
    const stored = await this.getStoredTokens();

    if (stored) {
      try {
        const oauth2Client = this.getOAuth2Client();
        await oauth2Client.revokeToken(stored.accessToken);
      } catch (err) {
        console.warn("[GoogleAuthManager] Token revocation failed:", err);
      }
    }

    // DBからトークンを削除
    const db = getDb();
    db.prepare("DELETE FROM google_oauth WHERE id = 1").run();
  }

  /**
   * クライアント設定を削除
   */
  clearClientConfig(): void {
    const db = getDb();
    db.prepare("DELETE FROM app_settings WHERE key IN (?, ?)").run(
      "google_client_id",
      "google_client_secret"
    );
    this.oauth2Client = null;
  }

  /**
   * 認証済みのOAuth2クライアントを取得
   */
  async getAuthenticatedClient(): Promise<InstanceType<typeof google.auth.OAuth2>> {
    const accessToken = await this.getValidAccessToken();
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    return oauth2Client;
  }

  /**
   * 接続状態を取得
   */
  async getConnectionStatus(): Promise<{
    configured: boolean;
    authenticated: boolean;
    expiresAt?: string;
  }> {
    const configured = this.isConfigured();
    const stored = await this.getStoredTokens();

    return {
      configured,
      authenticated: stored !== null,
      expiresAt: stored?.expiresAt,
    };
  }
}

// シングルトンインスタンス
let instance: GoogleAuthManager | null = null;

export function getGoogleAuth(): GoogleAuthManager {
  if (!instance) {
    instance = new GoogleAuthManager();
  }
  return instance;
}
