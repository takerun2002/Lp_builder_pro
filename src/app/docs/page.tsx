import fs from "fs/promises";
import path from "path";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DOCS: Record<
  string,
  { label: string; description: string; filePath: string }
> = {
  overview: {
    label: "プロジェクト概要",
    description: "docs/project_overview.md",
    filePath: "docs/project_overview.md",
  },
  tech: {
    label: "技術スタック",
    description: "docs/tech_stack.md",
    filePath: "docs/tech_stack.md",
  },
  conventions: {
    label: "コーディング規約",
    description: "docs/coding_conventions.md",
    filePath: "docs/coding_conventions.md",
  },
  prd: {
    label: "要件定義書 v1.1",
    description: "LP_Builder_Pro_要件定義書_v1.1.md",
    filePath: "LP_Builder_Pro_要件定義書_v1.1.md",
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function DocsPage({ searchParams }: { searchParams: SearchParams }) {
  const key = typeof searchParams.doc === "string" ? searchParams.doc : "overview";
  const entry = DOCS[key] ?? DOCS.overview;
  const absPath = path.join(process.cwd(), entry.filePath);

  let content = "";
  try {
    content = await fs.readFile(absPath, "utf8");
  } catch {
    content = `ドキュメントを読み込めませんでした: ${entry.filePath}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">ドキュメント</h1>
          <p className="text-sm text-muted-foreground">
            アプリ内で要件・使い方・技術情報を確認できます
          </p>
        </div>
        <Link href="/settings">
          <Button variant="outline">設定へ</Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">目次</CardTitle>
            <CardDescription>クリックで切り替え</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(DOCS).map(([k, d]) => {
              const active = (DOCS[key] ?? DOCS.overview) === d;
              return (
                <Link key={k} href={`/docs?doc=${encodeURIComponent(k)}`}>
                  <div
                    className={[
                      "rounded-md border p-3 transition-colors",
                      active ? "border-primary/50 bg-primary/5" : "hover:bg-muted/30",
                    ].join(" ")}
                  >
                    <div className="text-sm font-medium">{d.label}</div>
                    <div className="text-xs text-muted-foreground">{d.description}</div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">{entry.label}</CardTitle>
            <CardDescription>{entry.filePath}</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/20 border rounded-lg p-4 overflow-auto max-h-[70vh]">
{content}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}





