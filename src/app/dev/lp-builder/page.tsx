"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionCard, DraggableSectionCard } from "@/components/lp-builder/SectionCard";
import { LPPreview } from "@/components/lp-builder/LPPreview";
import {
  type LPSectionItem,
  type LPProject,
  LPSection,
  SectionStatus,
  SECTION_LABELS,
  DEFAULT_SECTION_ORDER,
} from "@/lib/lp-builder/section-manager";

export default function LPBuilderPage() {
  // State
  const [projects, setProjects] = useState<LPProject[]>([]);
  const [currentProject, setCurrentProject] = useState<LPProject | null>(null);
  const [sections, setSections] = useState<LPSectionItem[]>([]);
  const [approvedSections, setApprovedSections] = useState<LPSectionItem[]>([]);
  const [selectedSectionType, setSelectedSectionType] = useState<LPSection>(LPSection.HERO);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("generate");

  // New project form
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectGenre, setNewProjectGenre] = useState("");
  const [newProjectTarget, setNewProjectTarget] = useState("");

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/lp-builder?action=list-projects");
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  }, []);

  // Fetch project details
  const fetchProject = useCallback(async (projectId: string) => {
    try {
      setLoading(true);
      const [projectRes, approvedRes] = await Promise.all([
        fetch(`/api/lp-builder?action=project&projectId=${projectId}`),
        fetch(`/api/lp-builder?action=approved&projectId=${projectId}`),
      ]);

      const projectData = await projectRes.json();
      const approvedData = await approvedRes.json();

      setCurrentProject(projectData.project);
      setSections(projectData.project?.sections || []);
      setApprovedSections(approvedData.sections || []);
    } catch (error) {
      console.error("Failed to fetch project:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Create new project
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      setLoading(true);
      const response = await fetch("/api/lp-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-project",
          name: newProjectName,
          genre: newProjectGenre,
          targetDescription: newProjectTarget,
        }),
      });

      const data = await response.json();
      if (data.project) {
        await fetchProjects();
        setCurrentProject(data.project);
        setSections([]);
        setApprovedSections([]);
        setShowNewProject(false);
        setNewProjectName("");
        setNewProjectGenre("");
        setNewProjectTarget("");
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate section
  const handleGenerateSection = async (versionsCount = 1) => {
    if (!currentProject) return;

    try {
      setGenerating(true);
      const response = await fetch("/api/lp-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: versionsCount > 1 ? "generate-versions" : "generate-section",
          projectId: currentProject.id,
          type: selectedSectionType,
          count: versionsCount,
          context: {
            projectName: currentProject.name,
            genre: currentProject.genre,
            targetDescription: currentProject.targetDescription,
          },
        }),
      });

      if (response.ok) {
        await fetchProject(currentProject.id);
      }
    } catch (error) {
      console.error("Failed to generate section:", error);
    } finally {
      setGenerating(false);
    }
  };

  // Update section status
  const handleStatusChange = async (sectionId: string, status: SectionStatus) => {
    if (!currentProject) return;

    try {
      await fetch("/api/lp-builder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-status",
          sectionId,
          status,
        }),
      });

      await fetchProject(currentProject.id);
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // Delete section
  const handleDeleteSection = async (sectionId: string) => {
    if (!currentProject || !confirm("このセクションを削除しますか？")) return;

    try {
      await fetch(`/api/lp-builder?sectionId=${sectionId}`, {
        method: "DELETE",
      });
      await fetchProject(currentProject.id);
    } catch (error) {
      console.error("Failed to delete section:", error);
    }
  };

  // Remove from approved
  const handleRemoveFromApproved = async (sectionId: string) => {
    await handleStatusChange(sectionId, SectionStatus.PENDING);
  };

  // Export HTML
  const handleExportHTML = (html: string) => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentProject?.name || "lp"}_export.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get sections by type
  const getSectionsByType = (type: LPSection) => {
    return sections.filter((s) => s.type === type);
  };

  // Get missing section types
  const getMissingSectionTypes = () => {
    const existingTypes = new Set(sections.map((s) => s.type));
    return DEFAULT_SECTION_ORDER.filter((type) => !existingTypes.has(type));
  };

  // Stats
  const stats = {
    total: sections.length,
    approved: sections.filter((s) => s.status === SectionStatus.APPROVED).length,
    pending: sections.filter((s) => s.status === SectionStatus.PENDING).length,
    rejected: sections.filter((s) => s.status === SectionStatus.REJECTED).length,
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">LPセクションビルダー</h1>
        <p className="text-muted-foreground">
          セクション単位でLPを生成・管理し、採用/没/保留で組み立てます
        </p>
      </div>

      {/* Project Selection */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">プロジェクト</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewProject(!showNewProject)}
            >
              {showNewProject ? "キャンセル" : "+ 新規プロジェクト"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showNewProject ? (
            <div className="space-y-4">
              <Input
                placeholder="プロジェクト名（例: ダイエット商品LP）"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
              <Input
                placeholder="ジャンル（例: 健康・美容）"
                value={newProjectGenre}
                onChange={(e) => setNewProjectGenre(e.target.value)}
              />
              <Textarea
                placeholder="ターゲット説明（例: 30-40代女性、産後太りに悩む主婦）"
                value={newProjectTarget}
                onChange={(e) => setNewProjectTarget(e.target.value)}
                rows={2}
              />
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || loading}>
                {loading ? "作成中..." : "プロジェクトを作成"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {projects.map((project) => (
                <Button
                  key={project.id}
                  variant={currentProject?.id === project.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => fetchProject(project.id)}
                >
                  {project.name}
                </Button>
              ))}
              {projects.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  プロジェクトがありません。新規作成してください。
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {currentProject && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">生成済み</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                <p className="text-sm text-muted-foreground">採用</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-sm text-muted-foreground">保留</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <p className="text-sm text-muted-foreground">没</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Generation & Management */}
            <div className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="generate" className="flex-1">セクション生成</TabsTrigger>
                  <TabsTrigger value="approved" className="flex-1">採用済み ({stats.approved})</TabsTrigger>
                </TabsList>

                {/* Generate Tab */}
                <TabsContent value="generate">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">セクション生成</CardTitle>
                      <CardDescription>
                        セクションタイプを選んで生成
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Select
                          value={selectedSectionType}
                          onValueChange={(v) => setSelectedSectionType(v as LPSection)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(LPSection).map((type) => (
                              <SelectItem key={type} value={type}>
                                {SECTION_LABELS[type]}
                                {getSectionsByType(type).length > 0 && (
                                  <span className="ml-2 text-muted-foreground">
                                    ({getSectionsByType(type).length})
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() => handleGenerateSection(1)}
                          disabled={generating}
                        >
                          {generating ? "生成中..." : "生成"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleGenerateSection(3)}
                          disabled={generating}
                        >
                          3案生成
                        </Button>
                      </div>

                      {/* Missing Sections Warning */}
                      {getMissingSectionTypes().length > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800 font-medium mb-2">
                            未生成のセクション:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {getMissingSectionTypes().map((type) => (
                              <Badge
                                key={type}
                                variant="outline"
                                className="cursor-pointer hover:bg-yellow-100"
                                onClick={() => setSelectedSectionType(type)}
                              >
                                {SECTION_LABELS[type]}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Generated Sections by Type */}
                  <div className="mt-4 space-y-4">
                    <h3 className="font-medium">
                      {SECTION_LABELS[selectedSectionType]} ({getSectionsByType(selectedSectionType).length}件)
                    </h3>
                    {getSectionsByType(selectedSectionType).length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                          まだ生成されていません
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {getSectionsByType(selectedSectionType).map((section) => (
                          <SectionCard
                            key={section.id}
                            section={section}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDeleteSection}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Approved Tab */}
                <TabsContent value="approved">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">採用済みセクション</CardTitle>
                      <CardDescription>
                        ドラッグで順番を入れ替え
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {approvedSections.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <div className="text-4xl mb-2">📋</div>
                          <p>採用されたセクションがありません</p>
                          <p className="text-sm">セクションを「採用」するとここに追加されます</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {approvedSections.map((section, index) => (
                            <DraggableSectionCard
                              key={section.id}
                              section={section}
                              index={index}
                              onRemove={handleRemoveFromApproved}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right: Preview */}
            <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]">
              <LPPreview
                sections={approvedSections}
                projectName={currentProject.name}
                onExportHTML={handleExportHTML}
              />
            </div>
          </div>
        </>
      )}

      {!currentProject && !showNewProject && projects.length > 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">👆</div>
            <p className="text-muted-foreground">
              プロジェクトを選択してください
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
