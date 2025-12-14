"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/projects", label: "プロジェクト", icon: "📁" },
  { href: "/swipe-files", label: "スワイプ", icon: "🖼️" },
];

const DEV_ITEMS: NavItem[] = [
  { href: "/dev/magic-pen", label: "Magic Pen", icon: "🪄" },
  { href: "/dev/scraper", label: "Scraper", icon: "🔍" },
  { href: "/dev/gemini", label: "Gemini", icon: "🤖" },
];

interface GlobalNavProps {
  projectId?: string;
  projectName?: string;
  sectionId?: string;
  sectionName?: string;
}

export function GlobalNav({ projectId, projectName, sectionId, sectionName }: GlobalNavProps) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-12 items-center justify-between">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-sm">
              LP Builder
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    pathname === item.href
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Center: Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            {projectId && (
              <>
                <span className="text-muted-foreground">/</span>
                <Link
                  href={`/projects/${projectId}`}
                  className="text-muted-foreground hover:text-foreground truncate max-w-[150px]"
                  title={projectName}
                >
                  {projectName || "プロジェクト"}
                </Link>
              </>
            )}
            {sectionId && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="truncate max-w-[120px]" title={sectionName}>
                  {sectionName || "セクション"}
                </span>
              </>
            )}
          </div>

          {/* Right: Dev Tools */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2 hidden lg:block">Dev:</span>
            {DEV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  pathname.startsWith(item.href)
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                title={item.label}
              >
                {item.icon}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Dev Info Bar */}
      <div className="bg-muted/30 border-t px-4 py-1 text-[10px] text-muted-foreground flex items-center justify-between">
        <span>
          📍 {pathname}
        </span>
        <span>
          localhost:{typeof window !== "undefined" ? window.location.port : "3003"}
        </span>
      </div>
    </nav>
  );
}
