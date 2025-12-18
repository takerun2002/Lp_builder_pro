/**
 * 取込LP個別操作API
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// DELETE: 取込LPを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lpId: string }> }
) {
  try {
    const { lpId } = await params;
    const db = getDb();

    db.prepare("DELETE FROM scraped_lps WHERE id = ?").run(lpId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[scraped-lps] DELETE error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to delete scraped LP" },
      { status: 500 }
    );
  }
}
