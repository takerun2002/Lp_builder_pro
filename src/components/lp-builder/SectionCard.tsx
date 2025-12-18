"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionStatusBadge } from "./SectionStatusBadge";
import {
  type LPSectionItem,
  SectionStatus,
  SECTION_LABELS,
} from "@/lib/lp-builder/section-manager";

interface SectionCardProps {
  section: LPSectionItem;
  onStatusChange?: (sectionId: string, status: SectionStatus) => void;
  onEdit?: (section: LPSectionItem) => void;
  onDelete?: (sectionId: string) => void;
  isSelected?: boolean;
  compact?: boolean;
}

export function SectionCard({
  section,
  onStatusChange,
  onEdit,
  onDelete,
  isSelected = false,
  compact = false,
}: SectionCardProps) {
  const handleStatusChange = (newStatus: SectionStatus) => {
    if (onStatusChange) {
      onStatusChange(section.id, newStatus);
    }
  };

  if (compact) {
    return (
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected ? "ring-2 ring-primary" : ""
        } ${section.status === SectionStatus.APPROVED ? "border-green-300" : ""}`}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <SectionStatusBadge status={section.status} size="sm" />
              <span className="text-sm font-medium truncate">
                {SECTION_LABELS[section.type]}
              </span>
              <span className="text-xs text-muted-foreground">
                v{section.version}
              </span>
            </div>
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(section);
                  }}
                >
                  編集
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`transition-all ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${section.status === SectionStatus.APPROVED ? "border-green-300" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {SECTION_LABELS[section.type]}
              <span className="text-xs text-muted-foreground font-normal">
                Ver.{section.version}
              </span>
            </CardTitle>
          </div>
          <SectionStatusBadge status={section.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Content Preview */}
        <div className="space-y-2">
          <h4 className="font-bold text-lg line-clamp-2">
            {section.content.headline}
          </h4>
          {section.content.subheadline && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {section.content.subheadline}
            </p>
          )}
          <p className="text-sm line-clamp-3">{section.content.body}</p>
          {section.content.bullets && section.content.bullets.length > 0 && (
            <ul className="text-sm space-y-1">
              {section.content.bullets.slice(0, 3).map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="line-clamp-1">{bullet}</span>
                </li>
              ))}
              {section.content.bullets.length > 3 && (
                <li className="text-muted-foreground text-xs">
                  +{section.content.bullets.length - 3} more...
                </li>
              )}
            </ul>
          )}
          {section.content.cta && (
            <div className="pt-2">
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm rounded-md">
                {section.content.cta}
              </span>
            </div>
          )}
        </div>

        {/* Image Preview */}
        {section.content.image && (
          <div className="aspect-video bg-muted rounded-md overflow-hidden">
            <img
              src={section.content.image}
              alt="Section preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {section.status !== SectionStatus.APPROVED && onStatusChange && (
            <Button
              size="sm"
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleStatusChange(SectionStatus.APPROVED)}
            >
              採用
            </Button>
          )}
          {section.status !== SectionStatus.PENDING && onStatusChange && (
            <Button
              size="sm"
              variant="outline"
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              onClick={() => handleStatusChange(SectionStatus.PENDING)}
            >
              保留
            </Button>
          )}
          {section.status !== SectionStatus.REJECTED && onStatusChange && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => handleStatusChange(SectionStatus.REJECTED)}
            >
              没
            </Button>
          )}
          {onEdit && (
            <Button size="sm" variant="ghost" onClick={() => onEdit(section)}>
              編集
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onDelete(section.id)}
            >
              削除
            </Button>
          )}
        </div>

        {/* Timestamps */}
        <div className="text-xs text-muted-foreground">
          生成: {new Date(section.generatedAt).toLocaleString("ja-JP")}
          {section.approvedAt && (
            <> | 採用: {new Date(section.approvedAt).toLocaleString("ja-JP")}</>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Draggable Section Card for reordering
 */
interface DraggableSectionCardProps {
  section: LPSectionItem;
  index: number;
  onRemove?: (sectionId: string) => void;
  onEdit?: (section: LPSectionItem) => void;
}

export function DraggableSectionCard({
  section,
  index,
  onRemove,
  onEdit,
}: DraggableSectionCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-card border rounded-lg group hover:shadow-sm transition-shadow">
      {/* Drag Handle */}
      <div className="cursor-grab text-muted-foreground hover:text-foreground">
        <span className="text-lg">≡</span>
      </div>

      {/* Order Number */}
      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
        {index + 1}
      </div>

      {/* Section Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {SECTION_LABELS[section.type]}
          </span>
          <span className="text-xs text-muted-foreground">
            (Ver.{section.version})
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {section.content.headline}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            onClick={() => onEdit(section)}
          >
            編集
          </Button>
        )}
        {onRemove && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-red-600 hover:text-red-700"
            onClick={() => onRemove(section.id)}
          >
            ×
          </Button>
        )}
      </div>
    </div>
  );
}
