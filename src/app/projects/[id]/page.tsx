"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Project {
  id: string;
  name: string;
  description: string | null;
  manuscript: string | null;
  created_at: string;
  updated_at: string;
}

interface Section {
  id: string;
  project_id: string;
  name: string;
  order_index: number;
  image_path: string | null;
  width: number | null;
  height: number | null;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  // Manuscript state
  const [manuscript, setManuscript] = useState("");
  const [manuscriptSaved, setManuscriptSaved] = useState(true);
  const manuscriptTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProject = useCallback(async () => {
    try {
      const [projRes, secRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/sections`),
      ]);
      const projData = await projRes.json();
      const secData = await secRes.json();

      if (projData.ok) {
        setProject(projData.project);
        setManuscript(projData.project.manuscript || "");
      } else {
        router.push("/projects");
        return;
      }

      if (secData.ok) {
        setSections(secData.sections);
      }
    } catch (err) {
      console.error("Failed to fetch project:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // 原稿保存（autosave with debounce）
  const saveManuscript = useCallback(
    async (text: string) => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manuscript: text }),
        });
        const data = await res.json();
        if (data.ok) {
          setManuscriptSaved(true);
        }
      } catch (err) {
        console.error("Failed to save manuscript:", err);
      }
    },
    [projectId]
  );

  const handleManuscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setManuscript(value);
    setManuscriptSaved(false);

    if (manuscriptTimerRef.current) {
      clearTimeout(manuscriptTimerRef.current);
    }
    manuscriptTimerRef.current = setTimeout(() => {
      saveManuscript(value);
    }, 500);
  };

  // 画像パスからURL生成
  const getImageUrl = (imagePath: string | null): string | null => {
    if (!imagePath) return null;
    const filename = imagePath.split("/").pop();
    return `/api/images/${filename}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/projects" className="text-muted-foreground hover:text-foreground">
              ← 一覧
            </Link>
            <div>
              <h1 className="text-xl font-bold">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl p-4 space-y-6">
        {/* Primary Action - Workspace */}
        <Card className="border-primary">
          <CardContent className="py-8 text-center">
            <h2 className="text-lg font-semibold mb-2">LP制作を始める</h2>
            <p className="text-sm text-muted-foreground mb-4">
              ワークスペースでAIによる素材生成・Magic Pen編集・セクション管理ができます
            </p>
            <Link href={`/projects/${projectId}/workspace`}>
              <Button size="lg" className="min-w-48">
                ワークスペースを開く
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">セクション</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sections.length}</div>
              {sections.length > 0 && (
                <div className="mt-2 flex -space-x-2">
                  {sections.slice(0, 4).map((sec) => {
                    const imageUrl = getImageUrl(sec.image_path);
                    return imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={sec.id}
                        src={imageUrl}
                        alt={sec.name}
                        className="w-8 h-8 rounded border-2 border-card object-cover"
                      />
                    ) : (
                      <div
                        key={sec.id}
                        className="w-8 h-8 rounded border-2 border-card bg-muted flex items-center justify-center text-xs"
                      >
                        ?
                      </div>
                    );
                  })}
                  {sections.length > 4 && (
                    <div className="w-8 h-8 rounded border-2 border-card bg-muted flex items-center justify-center text-xs">
                      +{sections.length - 4}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">作成日</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">{formatDate(project.created_at)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">最終更新</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">{formatDate(project.updated_at)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ツール</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Link href={`/projects/${projectId}/manga`} className="block">
                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="font-medium mb-1">漫画生成</div>
                  <p className="text-xs text-muted-foreground">
                    AIで4コマ漫画やバナー用イラストを生成
                  </p>
                </div>
              </Link>
              <Link href={`/projects/${projectId}/scraper`} className="block">
                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="font-medium mb-1">LP取込</div>
                  <p className="text-xs text-muted-foreground">
                    既存LPのURLから画像をスクレイピング
                  </p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Manuscript */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">プロジェクト原稿</CardTitle>
              <span className="text-xs text-muted-foreground">
                {manuscriptSaved ? (
                  <span className="text-green-600">保存済み</span>
                ) : (
                  <span className="text-orange-500">保存中...</span>
                )}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              value={manuscript}
              onChange={handleManuscriptChange}
              placeholder="LP用の原稿をここに入力またはペーストしてください...&#10;&#10;例:&#10;【キャッチコピー】&#10;〇〇で悩んでいませんか？&#10;&#10;【メイン訴求】&#10;本商品は..."
              className="w-full h-48 p-4 border rounded-lg resize-y bg-background text-sm font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              入力内容は自動保存されます。AIでの素材生成時に参考にできます。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
