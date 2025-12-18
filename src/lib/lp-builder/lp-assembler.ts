/**
 * LP Assembler
 * 採用セクションを連結してLPを組み立て、エクスポートする
 */

import {
  getSectionManager,
  type LPSectionItem,
  type LPProject,
  LPSection,
  SECTION_LABELS,
  SectionStatus,
} from "./section-manager";

// =============================================================================
// Types
// =============================================================================

export interface AssembledLP {
  projectId: string;
  projectName: string;
  sections: LPSectionItem[];
  html: string;
  createdAt: string;
}

export interface ExportOptions {
  viewMode: "desktop" | "mobile";
  includeStyles: boolean;
  customCss?: string;
}

// =============================================================================
// LP Assembler Class
// =============================================================================

export class LPAssembler {
  private manager = getSectionManager();

  /**
   * Get approved sections in order
   */
  getApprovedSections(projectId: string): LPSectionItem[] {
    const project = this.manager.getProject(projectId);
    if (!project) return [];

    const allSections = this.manager.getSectionsByProject(projectId);
    const approvedSections = allSections.filter(
      (s) => s.status === SectionStatus.APPROVED
    );

    // Sort by project's approved section IDs order
    if (project.approvedSectionIds.length > 0) {
      return project.approvedSectionIds
        .map((id) => approvedSections.find((s) => s.id === id))
        .filter((s): s is LPSectionItem => s !== undefined);
    }

    // If no order specified, use default section order
    return approvedSections.sort((a, b) => {
      const orderA = Object.values(LPSection).indexOf(a.type);
      const orderB = Object.values(LPSection).indexOf(b.type);
      return orderA - orderB;
    });
  }

  /**
   * Assemble LP from approved sections
   */
  assemble(projectId: string, options?: Partial<ExportOptions>): AssembledLP {
    const project = this.manager.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const sections = this.getApprovedSections(projectId);
    const html = this.generateHTML(project, sections, options);

    return {
      projectId,
      projectName: project.name,
      sections,
      html,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Generate HTML from sections
   */
  generateHTML(
    project: LPProject,
    sections: LPSectionItem[],
    options?: Partial<ExportOptions>
  ): string {
    const viewMode = options?.viewMode || "desktop";
    const includeStyles = options?.includeStyles !== false;

    const sectionsHTML = sections
      .map((section) => this.sectionToHTML(section, viewMode))
      .join("\n");

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  ${includeStyles ? this.getStyles(viewMode, options?.customCss) : ""}
</head>
<body>
  <div class="lp-container ${viewMode}">
    ${sectionsHTML}
  </div>
</body>
</html>`;
  }

  /**
   * Convert a section to HTML
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private sectionToHTML(section: LPSectionItem, viewMode: string): string {
    const { type, content } = section;
    const sectionClass = `lp-section lp-section--${type}`;

    let bulletsHTML = "";
    if (content.bullets && content.bullets.length > 0) {
      bulletsHTML = `
        <ul class="lp-bullets">
          ${content.bullets.map((b) => `<li>${this.escapeHTML(b)}</li>`).join("\n")}
        </ul>`;
    }

    let ctaHTML = "";
    if (content.cta) {
      ctaHTML = `<a href="#" class="lp-cta-button">${this.escapeHTML(content.cta)}</a>`;
    }

    let imageHTML = "";
    if (content.image) {
      imageHTML = `<img src="${content.image}" alt="${SECTION_LABELS[type]}" class="lp-section-image" />`;
    }

    return `
  <section class="${sectionClass}" data-section-type="${type}">
    <div class="lp-section-inner">
      ${imageHTML}
      <h2 class="lp-headline">${this.escapeHTML(content.headline)}</h2>
      ${content.subheadline ? `<p class="lp-subheadline">${this.escapeHTML(content.subheadline)}</p>` : ""}
      <div class="lp-body">${this.formatBody(content.body)}</div>
      ${bulletsHTML}
      ${ctaHTML}
    </div>
  </section>`;
  }

  /**
   * Format body text to HTML paragraphs
   */
  private formatBody(body: string): string {
    return body
      .split("\n\n")
      .map((p) => `<p>${this.escapeHTML(p.trim())}</p>`)
      .join("\n");
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Get CSS styles
   */
  private getStyles(viewMode: string, customCss?: string): string {
    return `<style>
:root {
  --primary-color: #2563eb;
  --primary-dark: #1d4ed8;
  --text-color: #1f2937;
  --text-muted: #6b7280;
  --bg-color: #ffffff;
  --bg-alt: #f9fafb;
  --border-color: #e5e7eb;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text-color);
  line-height: 1.8;
  background: var(--bg-color);
}

.lp-container {
  max-width: ${viewMode === "mobile" ? "375px" : "1200px"};
  margin: 0 auto;
}

.lp-container.mobile {
  font-size: 14px;
}

.lp-section {
  padding: ${viewMode === "mobile" ? "40px 20px" : "80px 40px"};
}

.lp-section:nth-child(even) {
  background: var(--bg-alt);
}

.lp-section-inner {
  max-width: 800px;
  margin: 0 auto;
}

.lp-headline {
  font-size: ${viewMode === "mobile" ? "1.5rem" : "2.5rem"};
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 1rem;
  text-align: center;
}

.lp-subheadline {
  font-size: ${viewMode === "mobile" ? "1rem" : "1.25rem"};
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 2rem;
}

.lp-body {
  margin-bottom: 2rem;
}

.lp-body p {
  margin-bottom: 1.5rem;
}

.lp-bullets {
  list-style: none;
  margin-bottom: 2rem;
}

.lp-bullets li {
  padding: 0.75rem 0;
  padding-left: 2rem;
  position: relative;
  border-bottom: 1px solid var(--border-color);
}

.lp-bullets li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: var(--primary-color);
  font-weight: bold;
}

.lp-cta-button {
  display: block;
  width: 100%;
  max-width: 400px;
  margin: 2rem auto;
  padding: 1.25rem 2rem;
  background: var(--primary-color);
  color: white;
  text-align: center;
  text-decoration: none;
  font-size: 1.125rem;
  font-weight: 700;
  border-radius: 8px;
  transition: background 0.3s;
}

.lp-cta-button:hover {
  background: var(--primary-dark);
}

.lp-section-image {
  width: 100%;
  height: auto;
  border-radius: 8px;
  margin-bottom: 2rem;
}

/* Hero Section */
.lp-section--hero {
  text-align: center;
  padding: ${viewMode === "mobile" ? "60px 20px" : "120px 40px"};
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.lp-section--hero .lp-headline {
  font-size: ${viewMode === "mobile" ? "1.75rem" : "3rem"};
}

.lp-section--hero .lp-subheadline {
  color: rgba(255, 255, 255, 0.9);
}

.lp-section--hero .lp-cta-button {
  background: white;
  color: var(--primary-color);
}

/* CTA Section */
.lp-section--cta {
  text-align: center;
  background: var(--primary-color);
  color: white;
}

.lp-section--cta .lp-cta-button {
  background: white;
  color: var(--primary-color);
}

/* Testimonials */
.lp-section--testimonials .lp-body {
  background: var(--bg-color);
  padding: 2rem;
  border-radius: 8px;
  border-left: 4px solid var(--primary-color);
}

${customCss || ""}
</style>`;
  }

  /**
   * Export to Figma-compatible format (simplified)
   */
  exportToFigmaJSON(projectId: string): object {
    const sections = this.getApprovedSections(projectId);

    return {
      name: "LP Export",
      type: "FRAME",
      children: sections.map((section, index) => ({
        name: SECTION_LABELS[section.type],
        type: "FRAME",
        order: index,
        content: {
          headline: section.content.headline,
          subheadline: section.content.subheadline,
          body: section.content.body,
          cta: section.content.cta,
        },
      })),
    };
  }

  /**
   * Get completion status
   */
  getCompletionStatus(projectId: string): {
    complete: boolean;
    approvedCount: number;
    totalRequired: number;
    missingSections: { type: LPSection; label: string }[];
  } {
    const sections = this.getApprovedSections(projectId);
    const approvedTypes = new Set(sections.map((s) => s.type));

    // Required sections for a complete LP
    const requiredSections: LPSection[] = [
      LPSection.HERO,
      LPSection.PROBLEM,
      LPSection.SOLUTION,
      LPSection.BENEFITS,
      LPSection.CTA,
    ];

    const missingSections = requiredSections
      .filter((type) => !approvedTypes.has(type))
      .map((type) => ({ type, label: SECTION_LABELS[type] }));

    return {
      complete: missingSections.length === 0,
      approvedCount: sections.length,
      totalRequired: requiredSections.length,
      missingSections,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let instance: LPAssembler | null = null;

export function getLPAssembler(): LPAssembler {
  if (!instance) {
    instance = new LPAssembler();
  }
  return instance;
}
