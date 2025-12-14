"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SwipeFile {
  id: string;
  project_id: string | null;
  name: string;
  mime_type: string;
  file_path: string;
  width: number | null;
  height: number | null;
  source_url: string | null;
  tags: string | null;
  created_at: string;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// 画像ダウンスケール（magic-penから移植）
async function downscaleImage(
  blob: Blob,
  { maxBytes = MAX_IMAGE_BYTES, maxDim = 2048 } = {}
): Promise<{ mimeType: string; base64: string; width: number; height: number } | null> {
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error);
      fr.onload = () => resolve(String(fr.result || ""));
      fr.readAsDataURL(blob);
    });
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = rej;
      img.src = dataUrl;
    });
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    w = Math.max(1, Math.floor(w * scale));
    h = Math.max(1, Math.floor(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    let lo = 0.5,
      hi = 0.95,
      best: string | null = null;
    for (let i = 0; i < 6; i++) {
      const q = i === 0 ? Math.min(0.9, hi) : (lo + hi) / 2;
      const b64 = canvas.toDataURL("image/jpeg", q);
      const est = Math.floor((b64.length - "data:;base64,".length) * 0.75);
      if (est <= maxBytes) {
        best = b64;
        lo = q;
      } else {
        hi = q;
      }
    }
    const out = best || canvas.toDataURL("image/jpeg", 0.85);
    const comma = out.indexOf(",");
    return {
      mimeType: out.substring(5, out.indexOf(";")),
      base64: out.substring(comma + 1),
      width: w,
      height: h,
    };
  } catch {
    return null;
  }
}

export default function SwipeFilesPage() {
  const [swipeFiles, setSwipeFiles] = useState<SwipeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchSwipeFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/swipe-files");
      const data = await res.json();
      if (data.ok) {
        setSwipeFiles(data.swipeFiles);
      }
    } catch (err) {
      console.error("Failed to fetch swipe files:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSwipeFiles();
  }, [fetchSwipeFiles]);

  // ファイル追加
  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;

    setUploading(true);
    const filesToUpload: {
      name: string;
      mimeType: string;
      base64: string;
      width: number;
      height: number;
    }[] = [];

    for (const file of arr) {
      try {
        let mimeType: string, base64: string, width: number, height: number;

        if (file.size > MAX_IMAGE_BYTES) {
          const ds = await downscaleImage(file);
          if (!ds) continue;
          ({ mimeType, base64, width, height } = ds);
        } else {
          const dataUrl = await new Promise<string>((res, rej) => {
            const fr = new FileReader();
            fr.onerror = () => rej(fr.error);
            fr.onload = () => res(String(fr.result || ""));
            fr.readAsDataURL(file);
          });
          const comma = dataUrl.indexOf(",");
          const meta = dataUrl.substring(0, comma);
          base64 = dataUrl.substring(comma + 1);
          const mimeMatch = /data:(.*?);base64/.exec(meta);
          mimeType = mimeMatch ? mimeMatch[1] : file.type || "image/png";
          const dim = await new Promise<{ w: number; h: number }>((res) => {
            const im = new Image();
            im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
            im.onerror = () => res({ w: 0, h: 0 });
            im.src = dataUrl;
          });
          if (dim.w < 64 || dim.h < 64) continue;
          width = dim.w;
          height = dim.h;
        }

        filesToUpload.push({
          name: file.name,
          mimeType,
          base64,
          width,
          height,
        });
      } catch (err) {
        console.error("Failed to process file:", err);
      }
    }

    if (filesToUpload.length > 0) {
      try {
        const res = await fetch("/api/swipe-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: filesToUpload }),
        });
        const data = await res.json();
        if (data.ok) {
          setSwipeFiles((prev) => [...data.swipeFiles, ...prev]);
        }
      } catch (err) {
        console.error("Failed to upload swipe files:", err);
      }
    }

    setUploading(false);
  }, []);

  // URL取り込み
  const addFromUrl = useCallback(async (url: string) => {
    try {
      const res = await fetch("/api/dev/fetch-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!data.ok || !data.base64 || !data.mimeType) {
        console.warn("[swipe-files] URL fetch failed:", data.error);
        return;
      }
      const dataUrl = `data:${data.mimeType};base64,${data.base64}`;
      const dim = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 0, h: 0 });
        img.src = dataUrl;
      });
      if (dim.w < 64 || dim.h < 64) return;

      const uploadRes = await fetch("/api/swipe-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [
            {
              name: url.split("/").pop() || "url-image",
              mimeType: data.mimeType,
              base64: data.base64,
              width: dim.w,
              height: dim.h,
              sourceUrl: url,
            },
          ],
        }),
      });
      const uploadData = await uploadRes.json();
      if (uploadData.ok) {
        setSwipeFiles((prev) => [...uploadData.swipeFiles, ...prev]);
      }
    } catch (err) {
      console.error("[swipe-files] URL fetch error:", err);
    }
  }, []);

  // D&D / Paste handlers
  useEffect(() => {
    const dropzone = dropzoneRef.current;
    if (!dropzone) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("ring-2", "ring-primary");
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("ring-2", "ring-primary");
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("ring-2", "ring-primary");
      const files = e.dataTransfer?.files;
      if (files?.length) {
        addFiles(files);
        return;
      }
      const url =
        e.dataTransfer?.getData("text/uri-list") || e.dataTransfer?.getData("text/plain");
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        addFromUrl(url.trim().split("\n")[0]);
      }
    };

    dropzone.addEventListener("dragover", handleDragOver);
    dropzone.addEventListener("dragleave", handleDragLeave);
    dropzone.addEventListener("drop", handleDrop);

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type?.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        } else if (item.kind === "string" && item.type === "text/plain") {
          item.getAsString((text) => {
            if (text.startsWith("http://") || text.startsWith("https://")) {
              addFromUrl(text.trim());
            }
          });
        }
      }
      if (files.length) addFiles(files);
    };
    document.addEventListener("paste", handlePaste);

    return () => {
      dropzone.removeEventListener("dragover", handleDragOver);
      dropzone.removeEventListener("dragleave", handleDragLeave);
      dropzone.removeEventListener("drop", handleDrop);
      document.removeEventListener("paste", handlePaste);
    };
  }, [addFiles, addFromUrl]);

  // 削除
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/swipe-files/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setSwipeFiles((prev) => prev.filter((s) => s.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to delete swipe file:", err);
    }
  };

  // 複数削除
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}件のスワイプファイルを削除しますか？`)) return;
    for (const id of selectedIds) {
      await handleDelete(id);
    }
  };

  // 選択トグル
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">スワイプファイル管理</h1>
            <p className="text-sm text-muted-foreground">
              参考画像・LPスクショをコレクション
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">← ホーム</Button>
            </Link>
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                {selectedIds.size}件削除
              </Button>
            )}
          </div>
        </div>

        {/* Dropzone */}
        <div
          ref={dropzoneRef}
          className="border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer hover:bg-muted/30"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-muted-foreground">
            {uploading ? (
              <span>アップロード中...</span>
            ) : (
              <>
                <p className="text-lg font-medium">画像をドロップ / クリック / Ctrl+V</p>
                <p className="text-sm mt-1">URLをペーストして取り込みも可能</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
        ) : swipeFiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              スワイプファイルがありません。画像を追加してください。
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">{swipeFiles.length}件</div>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {swipeFiles.map((sf) => (
                <Card
                  key={sf.id}
                  className={`group relative cursor-pointer transition-all ${
                    selectedIds.has(sf.id) ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => toggleSelect(sf.id)}
                >
                  <CardContent className="p-2">
                    <div className="aspect-square rounded overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/swipe-files/${sf.id}/image`}
                        alt={sf.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="mt-2 text-xs truncate" title={sf.name}>
                      {sf.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {sf.width && sf.height ? `${sf.width}×${sf.height}` : ""} • {formatDate(sf.created_at)}
                    </div>
                  </CardContent>
                  {/* Checkbox indicator */}
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedIds.has(sf.id)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-background/80"
                    }`}
                  >
                    {selectedIds.has(sf.id) && "✓"}
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(sf.id);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                    title="削除"
                  >
                    ×
                  </button>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
