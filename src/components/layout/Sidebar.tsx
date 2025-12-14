"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FolderOpen, 
  Images, 
  Wand2, 
  Search, 
  Settings,
  BookOpen,
  ChevronLeft, 
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "ホーム", icon: LayoutDashboard },
  { href: "/projects", label: "プロジェクト", icon: FolderOpen },
  { href: "/swipe-files", label: "スワイプ", icon: Images },
];

const TOOL_ITEMS: NavItem[] = [
  { href: "/dev/magic-pen", label: "Magic Pen (Dev)", icon: Wand2 },
  { href: "/dev/scraper", label: "Scraper (Dev)", icon: Search },
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: "/settings", label: "設定", icon: Settings },
  { href: "/docs", label: "ドキュメント", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // モバイル判定
  useEffect(() => {
    const checkMobile = () => {
      const nextIsMobile = window.innerWidth < 768;
      setIsMobile(nextIsMobile);
      if (nextIsMobile) setCollapsed(true);

      // #region agent log (uiux)
      fetch("/api/dev/debug-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "uiux-pre",
          hypothesisId: "H2",
          location: "src/components/layout/Sidebar.tsx:checkMobile",
          message: "sidebar-mobile-check",
          data: { pathname, innerWidth: window.innerWidth, nextIsMobile },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [pathname]);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);

    // #region agent log (uiux)
    fetch("/api/dev/debug-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "uiux-pre",
        hypothesisId: "H2",
        location: "src/components/layout/Sidebar.tsx:toggleSidebar",
        message: "sidebar-toggle",
        data: { pathname, isMobile, collapsed: next },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  };

  return (
    <TooltipProvider>
      <nav
        className={cn(
          "relative flex flex-col h-screen bg-[#19182D] text-white transition-all duration-300 ease-in-out z-50",
          collapsed ? "w-20" : "w-72"
        )}
      >
        {/* Header */}
        <div className="flex items-center h-16 px-4 mb-6">
          <div className={cn("flex items-center gap-3 overflow-hidden", collapsed && "justify-center w-full")}>
            <div className="min-w-8 h-8 rounded bg-gradient-to-tr from-[#9290FF] to-[#90DEFF] flex items-center justify-center font-bold text-[#131524]">
              LP
            </div>
            {!collapsed && (
              <span className="font-bold text-lg whitespace-nowrap text-[#E0EAFF] animate-in fade-in duration-300">
                LP Builder
              </span>
            )}
          </div>
          
          {/* Toggle Button (Desktop) */}
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className="absolute -right-3 top-6 bg-[#1C2035] border border-[#303651] rounded-lg p-1 text-[#F4F6F9] hover:text-white transition-colors"
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          )}
        </div>

        {/* Search (Mock) */}
        <div className={cn("px-4 mb-6", collapsed ? "flex justify-center" : "")}>
          <div className={cn(
            "flex items-center bg-[#1C2035] rounded-lg h-10 transition-all",
            collapsed ? "w-10 justify-center cursor-pointer" : "w-full px-3"
          )}>
            <Search className="text-[#989EB3]" size={18} />
            {!collapsed && (
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-sm ml-2 text-[#E6E8F0] placeholder-[#989EB3] w-full"
              />
            )}
          </div>
        </div>

        {/* Main Nav */}
        <div className="flex-1 overflow-y-auto px-3 space-y-6">
          {/* Main Group */}
          <div>
            {!collapsed && <h3 className="px-3 mb-2 text-xs font-medium text-[#9FAEE1] uppercase">Main</h3>}
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <NavItem key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
              ))}
            </div>
          </div>

          {/* Tools Group */}
          <div>
            {!collapsed && <h3 className="px-3 mb-2 text-xs font-medium text-[#9FAEE1] uppercase">Tools (Dev)</h3>}
            <div className="space-y-1">
              {TOOL_ITEMS.map((item) => (
                <NavItem key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions (local app: no user profile) */}
        <div className="p-3 border-t border-[#303651] mt-auto space-y-1">
          {BOTTOM_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
          ))}
          {!collapsed && (
            <div className="pt-2 px-2 text-[10px] text-[#9FAEE1] opacity-80">
              ローカル版（買い切り）
            </div>
          )}
        </div>
      </nav>
    </TooltipProvider>
  );
}

function NavItem({ item, collapsed, pathname }: { item: NavItem; collapsed: boolean; pathname: string }) {
  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          className={cn(
            "flex items-center h-11 px-3 rounded-lg transition-all duration-200 group relative",
            isActive 
              ? "bg-[#605DFF1A] text-[#E6E8F0]" 
              : "text-[#9FAEE1] hover:bg-[#605DFF10] hover:text-[#E6E8F0]",
            collapsed && "justify-center px-0"
          )}
        >
          <item.icon size={20} className={cn("shrink-0", isActive && "text-[#9290FF]")} />
          {!collapsed && (
            <span className="ml-3 text-sm font-medium whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
              {item.label}
            </span>
          )}
          {isActive && !collapsed && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#9290FF] rounded-r-full" />
          )}
        </Link>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent side="right" className="bg-[#131524] text-white border-[#303651]">
          {item.label}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

