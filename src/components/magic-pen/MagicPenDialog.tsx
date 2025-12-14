"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MagicPenEditor } from "./MagicPenEditor";

interface MagicPenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageDataUrl: string | null;
  projectId: string;
  onApply: (imageDataUrl: string, width: number, height: number) => Promise<void>;
}

export function MagicPenDialog({
  open,
  onOpenChange,
  imageDataUrl,
  projectId,
  onApply,
}: MagicPenDialogProps) {
  if (!imageDataUrl) return null;

  const handleApply = async (dataUrl: string, width: number, height: number) => {
    await onApply(dataUrl, width, height);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle>Magic Pen 編集</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <MagicPenEditor
            initialImageDataUrl={imageDataUrl}
            projectId={projectId}
            onApply={handleApply}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
