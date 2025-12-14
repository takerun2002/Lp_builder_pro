"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Project {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
}

export default function Home() {
  const router = useRouter();
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // #region agent log (uiux)
    fetch("/api/dev/debug-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "uiux-pre",
        hypothesisId: "H4",
        location: "src/app/page.tsx:useEffect",
        message: "home-mounted",
        data: { nodeEnv: process.env.NODE_ENV },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    // 直近プロジェクトを取得
    fetch("/api/projects?limit=3")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setRecentProjects(data.projects);
        }
      })
      .catch(console.error);
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push(`/projects/${data.project.id}`);
      }
    } catch (err) {
      console.error(err);
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <section className="bg-primary/5 border-b py-16 px-4">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            LP Builder Pro
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            AIとマジックペンで、思った通りのLPを爆速で制作。
            <br />
            まずはプロジェクトを作成してスタートしましょう。
          </p>
          
          <div className="pt-4">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="h-14 px-8 text-base shadow-lg hover:shadow-xl transition-all scale-100 hover:scale-105">
                  ＋ 新規プロジェクト作成
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新規プロジェクト</DialogTitle>
                  <DialogDescription>
                    プロジェクト名を入力してください（後で変更可能）
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    placeholder="例: 美容液LP 2025春"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
                  <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || isCreating}>
                    {isCreating ? "作成中..." : "作成して開始"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 space-y-12">
        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">最近のプロジェクト</h2>
              <Link href="/projects">
                <Button variant="ghost" size="sm">すべて見る →</Button>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {recentProjects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
                    <CardHeader className="p-4">
                      <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                        {p.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        更新: {new Date(p.updated_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    {/* サムネがあればここに表示 */}
                    <CardContent className="p-4 pt-0 h-20 bg-muted/20 rounded-b flex items-center justify-center text-muted-foreground text-xs">
                      編集を再開
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Tools & Resources */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">ツール & リソース</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/swipe-files">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">📁 スワイプファイル管理</CardTitle>
                  <CardDescription>
                    参考画像・LPスクショをストックして整理
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/dev/research">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">🔬 リサーチエージェント</CardTitle>
                  <CardDescription>
                    AIが競合LP・トレンドを分析して構成・コピーを提案
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </section>

        {/* Development Tools (Hidden in Production) */}
        {process.env.NODE_ENV === "development" && (
          <section className="pt-8 border-t">
            <details className="group">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground list-none flex items-center gap-2">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                開発者用メニュー (Dev Tools)
              </summary>
              <div className="mt-4 grid gap-2 pl-4 border-l">
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/dev/research">
                    <Button variant="outline" size="sm" className="w-full justify-start">🔬 Research Agent (NEW)</Button>
                  </Link>
                  <Link href="/dev/magic-pen">
                    <Button variant="outline" size="sm" className="w-full justify-start">🪄 Magic Pen (Dev)</Button>
                  </Link>
                  <Link href="/dev/scraper">
                    <Button variant="outline" size="sm" className="w-full justify-start">🔍 Scraper (Dev)</Button>
                  </Link>
                  <Link href="/dev/gemini">
                    <Button variant="outline" size="sm" className="w-full justify-start">🤖 Gemini Test</Button>
                  </Link>
                </div>
                <div className="text-[10px] text-muted-foreground mt-2 font-mono bg-muted p-2 rounded">
                  <div>Routes:</div>
                  <div>/projects/[id]/sections/[sectionId]/magic-pen</div>
                  <div>/projects/[id]/scraper</div>
                </div>
              </div>
            </details>
          </section>
        )}
      </div>
    </div>
  );
}
