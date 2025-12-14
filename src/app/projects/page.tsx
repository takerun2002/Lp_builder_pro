"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.ok) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDesc.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setProjects((prev) => [data.project, ...prev]);
        setDialogOpen(false);
        setNewProjectName("");
        setNewProjectDesc("");
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このプロジェクトを削除しますか？")) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">プロジェクト一覧</h1>
            <p className="text-sm text-muted-foreground">
              LP制作プロジェクトを管理します
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>+ 新規プロジェクト</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規プロジェクト作成</DialogTitle>
                <DialogDescription>
                  プロジェクト名と説明を入力してください
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">プロジェクト名 *</label>
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="例: 〇〇株式会社 LP"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">説明（任意）</label>
                  <Input
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="例: 新商品ランディングページ"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleCreate} disabled={creating || !newProjectName.trim()}>
                  {creating ? "作成中..." : "作成"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dev Tools Link */}
        <div className="flex gap-2 text-sm">
          <Link href="/dev/magic-pen" className="text-primary hover:underline">
            Magic Pen v2 (Dev)
          </Link>
        </div>

        {/* Projects List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              プロジェクトがありません。「新規プロジェクト」から作成してください。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id} className="group relative">
                <CardHeader className="pb-2">
                  <Link href={`/projects/${project.id}`}>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                  </Link>
                  {project.description && (
                    <CardDescription className="line-clamp-2">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-3">
                    <div>作成: {formatDate(project.created_at)}</div>
                    <div>更新: {formatDate(project.updated_at)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/projects/${project.id}/workspace`} className="flex-1">
                      <Button size="sm" className="w-full">
                        ワークスペース
                      </Button>
                    </Link>
                    <Link href={`/projects/${project.id}`}>
                      <Button size="sm" variant="outline">
                        詳細
                      </Button>
                    </Link>
                  </div>
                </CardContent>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(project.id);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 flex items-center justify-center"
                  title="削除"
                >
                  ×
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
