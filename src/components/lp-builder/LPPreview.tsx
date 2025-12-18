"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type LPSectionItem,
  SECTION_LABELS,
} from "@/lib/lp-builder/section-manager";

interface LPPreviewProps {
  sections: LPSectionItem[];
  projectName?: string;
  onExportHTML?: (html: string) => void;
}

export function LPPreview({
  sections,
  projectName = "LP Preview",
  onExportHTML,
}: LPPreviewProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const previewHTML = useMemo(() => {
    if (sections.length === 0) return null;

    return sections.map((section, index) => (
      <PreviewSection key={section.id} section={section} index={index} />
    ));
  }, [sections]);

  const handleExport = () => {
    if (!onExportHTML) return;

    // Generate full HTML
    const sectionsHTML = sections
      .map((section) => sectionToHTML(section))
      .join("\n");

    const fullHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <style>
    ${getPreviewCSS()}
  </style>
</head>
<body>
  <div class="lp-container">
    ${sectionsHTML}
  </div>
</body>
</html>`;

    onExportHTML(fullHTML);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">LPプレビュー</CardTitle>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex border rounded-md overflow-hidden">
              <button
                className={`px-3 py-1 text-sm ${
                  viewMode === "desktop"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setViewMode("desktop")}
              >
                PC
              </button>
              <button
                className={`px-3 py-1 text-sm ${
                  viewMode === "mobile"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setViewMode("mobile")}
              >
                モバイル
              </button>
            </div>
            {onExportHTML && (
              <Button size="sm" variant="outline" onClick={handleExport}>
                HTMLエクスポート
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-2">
        {sections.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-4xl mb-2">📄</div>
              <p>採用されたセクションがありません</p>
              <p className="text-sm">セクションを「採用」するとここに表示されます</p>
            </div>
          </div>
        ) : (
          <div
            className={`h-full overflow-auto border rounded-lg bg-white ${
              viewMode === "mobile" ? "mx-auto" : ""
            }`}
            style={{
              maxWidth: viewMode === "mobile" ? "375px" : "100%",
            }}
          >
            {previewHTML}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Preview Section Component
 */
interface PreviewSectionProps {
  section: LPSectionItem;
  index: number;
}

function PreviewSection({ section, index }: PreviewSectionProps) {
  const isHero = section.type === "hero";
  const isCTA = section.type === "cta";

  const bgClass = isHero
    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
    : isCTA
      ? "bg-primary text-primary-foreground"
      : index % 2 === 0
        ? "bg-white"
        : "bg-gray-50";

  return (
    <div className={`p-6 ${bgClass}`}>
      {/* Section Label */}
      <Badge variant="outline" className="mb-4 text-xs opacity-60">
        {SECTION_LABELS[section.type]}
      </Badge>

      {/* Image */}
      {section.content.image && (
        <div className="mb-4 rounded-lg overflow-hidden">
          <img
            src={section.content.image}
            alt={section.content.headline}
            className="w-full h-auto"
          />
        </div>
      )}

      {/* Headline */}
      <h2
        className={`font-bold mb-2 ${
          isHero ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"
        }`}
      >
        {section.content.headline}
      </h2>

      {/* Subheadline */}
      {section.content.subheadline && (
        <p
          className={`mb-4 ${
            isHero ? "text-lg opacity-90" : "text-muted-foreground"
          }`}
        >
          {section.content.subheadline}
        </p>
      )}

      {/* Body */}
      <div className="mb-4 space-y-3">
        {section.content.body.split("\n\n").map((paragraph, idx) => (
          <p key={idx} className="leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Bullets */}
      {section.content.bullets && section.content.bullets.length > 0 && (
        <ul className="mb-4 space-y-2">
          {section.content.bullets.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className={isHero || isCTA ? "text-white" : "text-green-600"}>
                ✓
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA Button */}
      {section.content.cta && (
        <button
          className={`w-full max-w-md mx-auto block py-3 px-6 rounded-lg font-bold text-center transition-colors ${
            isHero || isCTA
              ? "bg-white text-primary hover:bg-gray-100"
              : "bg-primary text-white hover:bg-primary/90"
          }`}
        >
          {section.content.cta}
        </button>
      )}
    </div>
  );
}

/**
 * Convert section to HTML string
 */
function sectionToHTML(section: LPSectionItem): string {
  const bullets = section.content.bullets
    ? `<ul class="lp-bullets">
        ${section.content.bullets.map((b) => `<li>${escapeHTML(b)}</li>`).join("\n")}
      </ul>`
    : "";

  const cta = section.content.cta
    ? `<a href="#" class="lp-cta-button">${escapeHTML(section.content.cta)}</a>`
    : "";

  const image = section.content.image
    ? `<img src="${section.content.image}" alt="${escapeHTML(section.content.headline)}" class="lp-image" />`
    : "";

  return `
  <section class="lp-section lp-section--${section.type}">
    ${image}
    <h2 class="lp-headline">${escapeHTML(section.content.headline)}</h2>
    ${section.content.subheadline ? `<p class="lp-subheadline">${escapeHTML(section.content.subheadline)}</p>` : ""}
    <div class="lp-body">
      ${section.content.body
        .split("\n\n")
        .map((p) => `<p>${escapeHTML(p)}</p>`)
        .join("\n")}
    </div>
    ${bullets}
    ${cta}
  </section>`;
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getPreviewCSS(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; line-height: 1.8; color: #1f2937; }
    .lp-container { max-width: 800px; margin: 0 auto; }
    .lp-section { padding: 60px 20px; }
    .lp-section:nth-child(even) { background: #f9fafb; }
    .lp-section--hero { background: linear-gradient(135deg, #667eea, #764ba2); color: white; text-align: center; padding: 100px 20px; }
    .lp-section--cta { background: #2563eb; color: white; text-align: center; }
    .lp-headline { font-size: 2rem; font-weight: 700; margin-bottom: 1rem; }
    .lp-subheadline { font-size: 1.125rem; opacity: 0.9; margin-bottom: 2rem; }
    .lp-body p { margin-bottom: 1rem; }
    .lp-bullets { list-style: none; margin: 1.5rem 0; }
    .lp-bullets li { padding: 0.5rem 0; padding-left: 1.5rem; position: relative; }
    .lp-bullets li::before { content: "✓"; position: absolute; left: 0; color: #22c55e; }
    .lp-cta-button { display: inline-block; padding: 1rem 2rem; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 700; }
    .lp-section--hero .lp-cta-button, .lp-section--cta .lp-cta-button { background: white; color: #2563eb; }
    .lp-image { width: 100%; height: auto; border-radius: 8px; margin-bottom: 1.5rem; }
  `;
}

/**
 * Mini Preview for sidebar
 */
interface MiniPreviewProps {
  sections: LPSectionItem[];
  onClick?: () => void;
}

export function MiniPreview({ sections, onClick }: MiniPreviewProps) {
  return (
    <div
      className="border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow bg-white"
      onClick={onClick}
    >
      <div className="text-xs text-muted-foreground mb-2">
        プレビュー ({sections.length}セクション)
      </div>
      <div className="space-y-1">
        {sections.slice(0, 5).map((section) => (
          <div
            key={section.id}
            className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded text-[8px] px-1 truncate flex items-center"
          >
            {SECTION_LABELS[section.type]}
          </div>
        ))}
        {sections.length > 5 && (
          <div className="text-[10px] text-muted-foreground text-center">
            +{sections.length - 5} more
          </div>
        )}
      </div>
    </div>
  );
}
