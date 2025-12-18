"use client";

import { Badge } from "@/components/ui/badge";
import { SectionStatus } from "@/lib/lp-builder/section-manager";

interface SectionStatusBadgeProps {
  status: SectionStatus;
  size?: "sm" | "default";
}

const statusConfig: Record<
  SectionStatus,
  { label: string; emoji: string; className: string }
> = {
  [SectionStatus.DRAFT]: {
    label: "下書き",
    emoji: "📝",
    className: "bg-gray-100 text-gray-800 border-gray-300",
  },
  [SectionStatus.PENDING]: {
    label: "保留",
    emoji: "🟡",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  [SectionStatus.APPROVED]: {
    label: "採用",
    emoji: "🟢",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  [SectionStatus.REJECTED]: {
    label: "没",
    emoji: "🔴",
    className: "bg-red-100 text-red-800 border-red-300",
  },
};

export function SectionStatusBadge({ status, size = "default" }: SectionStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${size === "sm" ? "text-xs py-0 px-1" : ""}`}
    >
      {config.emoji} {config.label}
    </Badge>
  );
}

export function getStatusLabel(status: SectionStatus): string {
  return statusConfig[status].label;
}

export function getStatusEmoji(status: SectionStatus): string {
  return statusConfig[status].emoji;
}
