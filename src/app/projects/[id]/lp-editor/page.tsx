"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Project {
  id: string;
  name: string;
  lp_html: string | null;
  lp_css: string | null;
}

interface Section {
  id: string;
  name: string;
  image_path: string | null;
  width: number | null;
  height: number | null;
}

const DEFAULT_CSS = `/* LP スタイル */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.lp-container {
  max-width: 100%;
  margin: 0 auto;
}

.lp-section {
  width: 100%;
}

.lp-section img {
  width: 100%;
  height: auto;
  display: block;
}

/* 必要に応じてカスタマイズ */
`;

export default function LpEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [html, setHtml] = useState("");
  const [css, setCss] = useState(DEFAULT_CSS);
  const [activeTab, setActiveTab] = useState("html");

  // Preview ref
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Auto-save timer
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch project and sections
  useEffect(() => {
    async function fetchData() {
      try {
        const [projRes, secRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/sections`),
        ]);
        const projData = await projRes.json();
        const secData = await secRes.json();

        if (!projData.ok) {
          router.push("/projects");
          return;
        }

        setProject(projData.project);

        if (secData.ok) {
          setSections(secData.sections);

          // Load saved HTML/CSS or generate from sections
          if (projData.project.lp_html) {
            setHtml(projData.project.lp_html);
          } else {
            // Generate initial HTML from sections
            const initialHtml = generateHtmlFromSections(secData.sections);
            setHtml(initialHtml);
          }

          if (projData.project.lp_css) {
            setCss(projData.project.lp_css);
          }
        }
      } catch (err) {
        console.error("Fetch error:", err);
        router.push("/projects");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [projectId, router]);

  // Generate HTML from sections
  const generateHtmlFromSections = (secs: Section[]): string => {
    if (secs.length === 0) {
      return `<div class="lp-container">
  <p style="text-align: center; padding: 40px; color: #666;">
    セクションがありません。<br>
    プロジェクト詳細からセクションを追加してください。
  </p>
</div>`;
    }

    const sectionsHtml = secs
      .map((sec) => {
        const imgSrc = sec.image_path
          ? `/api/images/${sec.image_path.split("/").pop()}`
          : "";
        return `  <!-- ${sec.name} -->
  <section class="lp-section" id="section-${sec.id}">
    ${imgSrc ? `<img src="${imgSrc}" alt="${sec.name}" />` : `<div style="padding: 40px; background: #f5f5f5; text-align: center;">${sec.name}</div>`}
  </section>`;
      })
      .join("\n\n");

    return `<div class="lp-container">
${sectionsHtml}
</div>`;
  };

  // Update preview
  const updatePreview = useCallback(() => {
    if (!previewRef.current) return;

    const previewDoc = previewRef.current.contentDocument;
    if (!previewDoc) return;

    previewDoc.open();
    previewDoc.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${css}</style>
</head>
<body>
${html}
</body>
</html>
    `);
    previewDoc.close();
  }, [html, css]);

  // Update preview when HTML/CSS changes
  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  // Auto-save with debounce
  const triggerAutoSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lpHtml: html, lpCss: css }),
        });
      } catch (err) {
        console.error("Auto-save error:", err);
      } finally {
        setSaving(false);
      }
    }, 1000);
  }, [projectId, html, css]);

  // Trigger auto-save on changes
  useEffect(() => {
    if (project) {
      triggerAutoSave();
    }
  }, [html, css, project, triggerAutoSave]);

  // Insert section image at cursor
  const insertSection = (section: Section) => {
    const imgSrc = section.image_path
      ? `/api/images/${section.image_path.split("/").pop()}`
      : "";

    const newHtml = `\n<!-- ${section.name} -->
<section class="lp-section">
  <img src="${imgSrc}" alt="${section.name}" />
</section>\n`;

    setHtml((prev) => prev + newHtml);
    setActiveTab("html");
  };

  // Regenerate HTML from current sections
  const regenerateHtml = () => {
    if (confirm("現在のHTMLを破棄して、セクションから再生成しますか？")) {
      setHtml(generateHtmlFromSections(sections));
    }
  };

  // Export as HTML file
  const exportHtml = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project?.name || "LP"}</title>
  <style>
${css}
  </style>
</head>
<body>
${html}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name || "lp"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get image URL
  const getImageUrl = (imagePath: string | null): string | null => {
    if (!imagePath) return null;
    const filename = imagePath.split("/").pop();
    return `/api/images/${filename}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects/${projectId}`}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← {project.name}
          </Link>
          <span className="text-sm font-medium">LPエディタ</span>
          {saving && <span className="text-xs text-muted-foreground">保存中...</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={regenerateHtml}>
            再生成
          </Button>
          <Button variant="default" size="sm" onClick={exportHtml}>
            HTMLエクスポート
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Section List */}
        <div className="w-48 border-r bg-card flex flex-col shrink-0">
          <div className="p-2 border-b">
            <span className="text-xs font-medium text-muted-foreground">セクション素材</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {sections.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                セクションなし
              </p>
            ) : (
              sections.map((section) => {
                const imageUrl = getImageUrl(section.image_path);
                return (
                  <div
                    key={section.id}
                    className="rounded border bg-muted/50 overflow-hidden cursor-pointer hover:border-primary transition-colors"
                    onClick={() => insertSection(section)}
                    title="クリックでHTMLに挿入"
                  >
                    {imageUrl ? (
                      <div className="aspect-[4/3] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={section.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        No Image
                      </div>
                    )}
                    <div className="p-1">
                      <p className="text-xs truncate">{section.name}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              クリックで挿入
            </p>
          </div>
        </div>

        {/* Center - Code Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mx-2 mt-2 shrink-0 w-fit">
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="css">CSS</TabsTrigger>
            </TabsList>

            <TabsContent value="html" className="flex-1 m-0 p-2 min-h-0">
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="w-full h-full p-3 font-mono text-sm bg-muted/30 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="HTMLを入力..."
                spellCheck={false}
              />
            </TabsContent>

            <TabsContent value="css" className="flex-1 m-0 p-2 min-h-0">
              <textarea
                value={css}
                onChange={(e) => setCss(e.target.value)}
                className="w-full h-full p-3 font-mono text-sm bg-muted/30 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="CSSを入力..."
                spellCheck={false}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right - Preview */}
        <div className="w-[400px] border-l bg-muted/30 flex flex-col shrink-0">
          <div className="p-2 border-b bg-card">
            <span className="text-xs font-medium text-muted-foreground">プレビュー</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <iframe
              ref={previewRef}
              className="w-full h-full bg-white"
              title="LP Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
