"use client";

/**
 * UsageGuide - 機能説明ガイドコンポーネント
 *
 * 「保存したらどうなるの？」「次に何ができるの？」を説明
 * スワイプファイル保存後やLP取り込み後に表示
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ArrowRight,
  Wand2,
  MessageSquare,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { useState } from "react";

type GuideFeature = "swipeFile" | "referenceLP" | "manuscript" | "scraper";

interface UsageGuideProps {
  feature: GuideFeature;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

interface GuideContent {
  title: string;
  description: string;
  items: {
    icon: React.ElementType;
    text: string;
  }[];
  nextSteps?: string[];
}

const GUIDES: Record<GuideFeature, GuideContent> = {
  swipeFile: {
    title: "スワイプファイル保存後の使い方",
    description: "保存したLPは様々な場面で参考として活用できます",
    items: [
      {
        icon: ImageIcon,
        text: "ワークスペースで「参考LP」として表示・比較できます",
      },
      {
        icon: Wand2,
        text: "マジックペンで「このLPのトンマナに合わせて」と編集できます",
      },
      {
        icon: MessageSquare,
        text: "AIアシスタントで「このLPを参考にして」と指示できます",
      },
      {
        icon: FileText,
        text: "新規LP作成時のスタイル参考として選択できます",
      },
    ],
    nextSteps: [
      "ワークスペースで参考LPを選択",
      "AIに「このトンマナで」と指示",
      "マジックペンでスタイルを参照",
    ],
  },
  referenceLP: {
    title: "参考LPの使い方",
    description: "選択したLPのスタイルやトンマナを参考にできます",
    items: [
      {
        icon: Wand2,
        text: "画像生成時にトンマナを自動で参照します",
      },
      {
        icon: MessageSquare,
        text: "AIチャットで「参考LPのように」と指示できます",
      },
      {
        icon: ImageIcon,
        text: "色使いやフォント、レイアウトを分析に活用",
      },
    ],
  },
  manuscript: {
    title: "原稿の使い方",
    description: "インポートした原稿はLP作成の素材として活用できます",
    items: [
      {
        icon: FileText,
        text: "セクションごとに自動分割してLP構成に反映",
      },
      {
        icon: MessageSquare,
        text: "AIが原稿内容を理解してコピー改善を提案",
      },
      {
        icon: Wand2,
        text: "原稿テキストを元にビジュアル生成",
      },
    ],
    nextSteps: [
      "構成タブでセクション分割を確認",
      "プロンプトタブでテキストを調整",
      "生成タブでビジュアル化",
    ],
  },
  scraper: {
    title: "LP取り込み後の使い方",
    description: "取り込んだLPデータは分析や参考として活用できます",
    items: [
      {
        icon: FileText,
        text: "テキスト内容を原稿タブに保存して編集",
      },
      {
        icon: ImageIcon,
        text: "スワイプファイルに保存してトンマナ参考に",
      },
      {
        icon: MessageSquare,
        text: "AIに「このLPの〇〇を参考に」と指示",
      },
      {
        icon: Wand2,
        text: "競合分析や改善提案の素材として活用",
      },
    ],
    nextSteps: [
      "スワイプとして保存",
      "原稿タブにテキストをコピー",
      "ワークスペースで参考LPとして選択",
    ],
  },
};

export function UsageGuide({
  feature,
  collapsible = true,
  defaultOpen = true,
}: UsageGuideProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const guide = GUIDES[feature];

  const content = (
    <>
      <p className="text-xs text-muted-foreground mb-3">{guide.description}</p>

      <ul className="space-y-2">
        {guide.items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <item.icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <span>{item.text}</span>
          </li>
        ))}
      </ul>

      {guide.nextSteps && guide.nextSteps.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs font-medium mb-2 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" />
            次のステップ
          </p>
          <div className="flex flex-wrap gap-2">
            {guide.nextSteps.map((step, index) => (
              <span
                key={index}
                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
              >
                {step}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );

  if (!collapsible) {
    return (
      <Card className="bg-muted/50 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            {guide.title}
          </CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/50 border-dashed">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                {guide.title}
              </span>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{content}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * インラインヒント版（小さいスペース用）
 */
interface UsageHintProps {
  feature: GuideFeature;
}

export function UsageHint({ feature }: UsageHintProps) {
  const guide = GUIDES[feature];

  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
      <Lightbulb className="w-3 h-3 mt-0.5 text-yellow-500 shrink-0" />
      <div>
        <p className="font-medium text-foreground">{guide.title}</p>
        <p className="mt-0.5">{guide.description}</p>
      </div>
    </div>
  );
}

/**
 * 完了メッセージ付きガイド
 */
interface CompletionGuideProps {
  feature: GuideFeature;
  onContinue?: () => void;
  continueLabel?: string;
}

export function CompletionGuide({
  feature,
  onContinue,
  continueLabel = "次へ進む",
}: CompletionGuideProps) {
  const guide = GUIDES[feature];

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-green-700">
          <CheckCircle className="w-4 h-4" />
          保存完了！
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-green-600 mb-3">{guide.description}</p>

        <ul className="space-y-1.5 mb-4">
          {guide.items.slice(0, 3).map((item, index) => (
            <li
              key={index}
              className="flex items-center gap-2 text-xs text-green-700"
            >
              <item.icon className="w-3 h-3" />
              {item.text}
            </li>
          ))}
        </ul>

        {onContinue && (
          <Button size="sm" onClick={onContinue} className="w-full">
            {continueLabel}
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default UsageGuide;
