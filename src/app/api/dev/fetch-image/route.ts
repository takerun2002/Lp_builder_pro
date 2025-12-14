import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface FetchImageResponse {
  ok: boolean;
  mimeType?: string;
  base64?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<FetchImageResponse>> {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid URL" }, { status: 400 });
    }

    // Only allow http/https
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ ok: false, error: "Only http/https URLs allowed" }, { status: 400 });
    }

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LP-Builder-Pro/1.0)",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: `Fetch failed: ${response.status}` }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "URL does not point to an image" }, { status: 400 });
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = contentType.split(";")[0].trim();

    // Size check (max 10MB)
    if (buffer.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "Image too large (max 10MB)" }, { status: 400 });
    }

    console.log(`[fetch-image] Fetched ${url} (${mimeType}, ${Math.round(buffer.byteLength / 1024)}KB)`);

    return NextResponse.json({ ok: true, mimeType, base64 });
  } catch (err) {
    console.error("[fetch-image] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
