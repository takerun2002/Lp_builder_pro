"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface N1WarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceedAnyway?: () => void;
  onAddN1Data?: () => void;
  context?: "persona" | "copy" | "lp" | "general";
}

const contextMessages = {
  persona: {
    title: "N1データがありません",
    description:
      "現在、実在顧客のインタビューデータ（N1データ）が登録されていません。N1データなしで生成されるペルソナはAIによる仮説であり、実際の顧客像と大きく異なる可能性があります。",
    warning:
      "架空のペルソナに基づいたLPは、ターゲットに響かないリスクがあります。",
  },
  copy: {
    title: "N1データなしでコピー作成",
    description:
      "N1データがないため、生成されるコピーはAIの推測に基づいています。実在顧客の言葉や感情を反映していないため、コンバージョン率が低くなる可能性があります。",
    warning:
      "「刺さる」コピーは、実在顧客の生の声から生まれます。",
  },
  lp: {
    title: "N1データなしでLP作成",
    description:
      "N1データがない状態でLPを作成しようとしています。ターゲット像が不明確なままでは、訴求ポイントがぼやけてしまいます。",
    warning:
      "LPの成果は、ターゲット理解の深さに比例します。",
  },
  general: {
    title: "N1データの入力を推奨",
    description:
      "このツールは「N1ファースト」の哲学に基づいています。実在顧客1名でも深くインタビューすることで、より精度の高いマーケティング施策が可能になります。",
    warning:
      "架空のペルソナよりも、たった1人の実在顧客（N1）を理解することが重要です。",
  },
};

export function N1WarningModal({
  open,
  onOpenChange,
  onProceedAnyway,
  onAddN1Data,
  context = "general",
}: N1WarningModalProps) {
  const messages = contextMessages[context];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            {messages.title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>{messages.description}</p>

              {/* Data Level Legend */}
              <div className="p-4 rounded-lg bg-muted space-y-2">
                <p className="text-sm font-medium text-foreground">
                  データ信頼度レベル:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    🟢 事実（N1データ）
                  </Badge>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    🟡 高確度仮説
                  </Badge>
                  <Badge variant="outline" className="bg-red-100 text-red-800">
                    🔴 仮説（AI生成）
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  N1データがない場合、すべてのデータは🔴仮説レベルになります。
                </p>
              </div>

              {/* Warning Box */}
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-800 font-medium">
                  💡 {messages.warning}
                </p>
              </div>

              {/* N1 Benefits */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  N1データを入力するメリット:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>ターゲットの本当の悩みがわかる</li>
                  <li>購入の決め手が明確になる</li>
                  <li>響くメッセージが見つかる</li>
                  <li>CVR向上に直結する</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {onProceedAnyway && (
            <AlertDialogCancel
              onClick={onProceedAnyway}
              className="text-muted-foreground"
            >
              仮説のまま続行
            </AlertDialogCancel>
          )}
          {onAddN1Data && (
            <AlertDialogAction
              onClick={onAddN1Data}
              className="bg-green-600 hover:bg-green-700"
            >
              🟢 N1データを入力する
            </AlertDialogAction>
          )}
          {!onProceedAnyway && !onAddN1Data && (
            <AlertDialogAction>閉じる</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Simple hook to check N1 data status and show warning
 */
export function useN1Warning() {
  const checkN1AndWarn = async (projectId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/n1/check?projectId=${projectId}`);
      const data = await response.json();
      return data.hasN1Data;
    } catch {
      return false;
    }
  };

  return { checkN1AndWarn };
}
