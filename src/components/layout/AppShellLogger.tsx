"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AppShellLogger() {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.querySelector("main") as HTMLElement | null;
    const wrapper = (main?.firstElementChild as HTMLElement | null) ?? null;

    const bodyStyle = window.getComputedStyle(document.body);
    const mainStyle = main ? window.getComputedStyle(main) : null;
    const wrapperStyle = wrapper ? window.getComputedStyle(wrapper) : null;

    const mainRect = main ? main.getBoundingClientRect() : null;
    const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : null;

    // #region agent log (uiux)
    fetch("/api/dev/debug-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "uiux-pre",
        hypothesisId: "H1",
        location: "src/components/layout/AppShellLogger.tsx:useEffect",
        message: "app-shell-metrics",
        data: {
          pathname,
          viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
          body: { overflow: bodyStyle.overflow, bg: bodyStyle.backgroundColor },
          main: mainStyle
            ? {
                overflow: mainStyle.overflow,
                overflowX: mainStyle.overflowX,
                overflowY: mainStyle.overflowY,
                padding: mainStyle.padding,
              }
            : null,
          wrapper: wrapperStyle
            ? {
                overflow: wrapperStyle.overflow,
                overflowX: wrapperStyle.overflowX,
                overflowY: wrapperStyle.overflowY,
                padding: wrapperStyle.padding,
              }
            : null,
          rects: {
            main: mainRect
              ? { x: mainRect.x, y: mainRect.y, w: mainRect.width, h: mainRect.height }
              : null,
            wrapper: wrapperRect
              ? { x: wrapperRect.x, y: wrapperRect.y, w: wrapperRect.width, h: wrapperRect.height }
              : null,
          },
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [pathname]);

  return null;
}


