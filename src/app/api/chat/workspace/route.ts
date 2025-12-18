/**
 * ワークスペース壁打ちチャットAPI
 * 
 * NVIDIA Nemotron 3 Nano（無料）をOpenRouter経由で使用
 * 画像生成はGemini APIを使用（別エンドポイント）
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiKey } from "@/lib/api-keys";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPT = `あなたはLP（ランディングページ）制作のアシスタントです。
ユーザーのLP制作をサポートしてください。

役割:
- コピーライティングのアドバイス
- デザインの提案
- コンセプトの壁打ち
- キャッチコピーの改善
- ターゲット分析

回答は簡潔に、日本語で答えてください。
画像生成が必要な場合は「〜を生成して」と言うよう促してください。`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { ok: false, error: "messages is required" },
        { status: 400 }
      );
    }

    // OpenRouter APIキーを取得
    const openrouterKey = process.env.OPENROUTER_API_KEY || await getApiKey("openrouter");

    if (!openrouterKey) {
      // Gemini APIにフォールバック
      const geminiKey = process.env.GEMINI_API_KEY || await getApiKey("gemini");
      
      if (geminiKey) {
        return await handleGeminiChat(messages, geminiKey);
      }
      
      return NextResponse.json(
        { ok: false, error: "APIキーが設定されていません。設定画面でOpenRouterまたはGemini APIキーを設定してください。" },
        { status: 400 }
      );
    }

    // OpenRouter API (NVIDIA Nemotron 3 Nano - 無料)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lp-builder-pro.local",
        "X-Title": "LP Builder Pro",
      },
      body: JSON.stringify({
        model: "nvidia/llama-3.1-nemotron-70b-instruct:free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[workspace-chat] OpenRouter error:", errorText);
      
      // Gemini APIにフォールバック
      const geminiKey = process.env.GEMINI_API_KEY || await getApiKey("gemini");
      if (geminiKey) {
        return await handleGeminiChat(messages, geminiKey);
      }
      
      return NextResponse.json(
        { ok: false, error: "チャット生成に失敗しました" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "応答を生成できませんでした";

    return NextResponse.json({
      ok: true,
      content,
      model: "nvidia/nemotron-3-nano (free)",
    });

  } catch (error) {
    console.error("[workspace-chat] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Gemini APIフォールバック
async function handleGeminiChat(messages: ChatMessage[], apiKey: string) {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const chatHistory = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "了解しました。LP制作のアシスタントとしてお手伝いします。" }] },
        ...chatHistory,
      ],
    });

    const content = response.text || "応答を生成できませんでした";

    return NextResponse.json({
      ok: true,
      content,
      model: "gemini-2.0-flash",
    });
  } catch (err) {
    console.error("[workspace-chat] Gemini fallback error:", err);
    return NextResponse.json(
      { ok: false, error: "Gemini APIでの生成にも失敗しました" },
      { status: 500 }
    );
  }
}
