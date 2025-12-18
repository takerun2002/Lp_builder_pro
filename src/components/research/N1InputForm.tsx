"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  N1Basic,
  N1BeforePurchase,
  N1DecisionPoint,
  N1AfterPurchase,
  N1Meta,
} from "@/lib/research/n1-manager";

interface N1InputFormProps {
  projectId: string;
  onSubmit: (data: {
    basic: N1Basic;
    beforePurchase: N1BeforePurchase;
    decisionPoint: N1DecisionPoint;
    afterPurchase: N1AfterPurchase;
    meta: N1Meta;
  }) => void;
  onCancel?: () => void;
  initialData?: {
    basic?: Partial<N1Basic>;
    beforePurchase?: Partial<N1BeforePurchase>;
    decisionPoint?: Partial<N1DecisionPoint>;
    afterPurchase?: Partial<N1AfterPurchase>;
    meta?: Partial<N1Meta>;
  };
  loading?: boolean;
}

export function N1InputForm({
  onSubmit,
  onCancel,
  initialData,
  loading = false,
}: N1InputFormProps) {
  // Basic info state
  const [name, setName] = useState(initialData?.basic?.name || "");
  const [age, setAge] = useState(initialData?.basic?.age?.toString() || "");
  const [occupation, setOccupation] = useState(initialData?.basic?.occupation || "");
  const [familyStructure, setFamilyStructure] = useState(initialData?.basic?.familyStructure || "");
  const [purchasedProduct, setPurchasedProduct] = useState(initialData?.basic?.purchasedProduct || "");
  const [purchaseDate, setPurchaseDate] = useState(initialData?.basic?.purchaseDate || "");
  const [purchaseAmount, setPurchaseAmount] = useState(initialData?.basic?.purchaseAmount?.toString() || "");
  const [discoveryChannel, setDiscoveryChannel] = useState(initialData?.basic?.discoveryChannel || "");

  // Before purchase state
  const [painPoint, setPainPoint] = useState(initialData?.beforePurchase?.painPoint || "");
  const [painDuration, setPainDuration] = useState(initialData?.beforePurchase?.painDuration || "");
  const [triedSolutions, setTriedSolutions] = useState(
    initialData?.beforePurchase?.triedSolutions?.join("\n") || ""
  );
  const [whyNotWorked, setWhyNotWorked] = useState(initialData?.beforePurchase?.whyNotWorked || "");

  // Decision point state
  const [triggerMoment, setTriggerMoment] = useState(initialData?.decisionPoint?.triggerMoment || "");
  const [hesitation, setHesitation] = useState(initialData?.decisionPoint?.hesitation || "");
  const [finalPush, setFinalPush] = useState(initialData?.decisionPoint?.finalPush || "");
  const [pricePerception, setPricePerception] = useState(initialData?.decisionPoint?.pricePerception || "");

  // After purchase state
  const [transformation, setTransformation] = useState(initialData?.afterPurchase?.transformation || "");
  const [recommendation, setRecommendation] = useState(initialData?.afterPurchase?.recommendation || "");
  const [wouldRepurchase, setWouldRepurchase] = useState(initialData?.afterPurchase?.wouldRepurchase || false);

  // Meta state
  const [interviewDate, setInterviewDate] = useState(
    initialData?.meta?.interviewDate || new Date().toISOString().split("T")[0]
  );
  const [interviewer, setInterviewer] = useState(initialData?.meta?.interviewer || "");
  const [rawTranscript, setRawTranscript] = useState(initialData?.meta?.rawTranscript || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      basic: {
        name,
        age: parseInt(age) || 0,
        occupation,
        familyStructure,
        purchasedProduct,
        purchaseDate,
        purchaseAmount: parseInt(purchaseAmount) || 0,
        discoveryChannel,
      },
      beforePurchase: {
        painPoint,
        painDuration,
        triedSolutions: triedSolutions.split("\n").filter((s) => s.trim()),
        whyNotWorked,
      },
      decisionPoint: {
        triggerMoment,
        hesitation,
        finalPush,
        pricePerception,
      },
      afterPurchase: {
        transformation,
        recommendation,
        wouldRepurchase,
      },
      meta: {
        interviewDate,
        interviewer,
        rawTranscript: rawTranscript || undefined,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-green-600">🟢</span>
            基本情報
          </CardTitle>
          <CardDescription>
            実在する顧客の基本情報（仮名でOK）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">お名前（仮名可）*</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 山田花子"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">年齢 *</label>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="例: 38"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">職業 *</label>
              <Input
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="例: 会社員（事務職）"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">家族構成</label>
              <Input
                value={familyStructure}
                onChange={(e) => setFamilyStructure(e.target.value)}
                placeholder="例: 夫、子供2人（小学生）"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">購入した商品/サービス *</label>
              <Input
                value={purchasedProduct}
                onChange={(e) => setPurchasedProduct(e.target.value)}
                placeholder="例: 時短料理講座"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">購入日</label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">購入金額（円）</label>
              <Input
                type="number"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                placeholder="例: 29800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">どこで知ったか</label>
              <Input
                value={discoveryChannel}
                onChange={(e) => setDiscoveryChannel(e.target.value)}
                placeholder="例: Instagram広告"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Before Purchase */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-green-600">🟢</span>
            購入前の状態
          </CardTitle>
          <CardDescription>
            購入前に抱えていた悩みや課題（核心部分）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">何に困っていましたか？ *</label>
            <Textarea
              value={painPoint}
              onChange={(e) => setPainPoint(e.target.value)}
              placeholder="例: 仕事と育児の両立で毎日の夕食作りが大きな負担になっていた。帰宅してから料理を始めると、子供たちの宿題を見る時間がなくなり、罪悪感を感じていた。"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">いつから悩んでいましたか？</label>
            <Input
              value={painDuration}
              onChange={(e) => setPainDuration(e.target.value)}
              placeholder="例: 2年前、下の子が小学校に入学してから"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">他に試したことは？（1行に1つ）</label>
            <Textarea
              value={triedSolutions}
              onChange={(e) => setTriedSolutions(e.target.value)}
              placeholder="例:&#10;冷凍食品を増やした&#10;料理本を買った&#10;週末の作り置き"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">なぜそれらでは解決しなかったのですか？</label>
            <Textarea
              value={whyNotWorked}
              onChange={(e) => setWhyNotWorked(e.target.value)}
              placeholder="例: 冷凍食品は罪悪感があり、作り置きは週末の貴重な時間を奪われて続かなかった"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Decision Point */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-green-600">🟢</span>
            購入の決め手
          </CardTitle>
          <CardDescription>
            なぜこの商品を選んだのか（最も重要な情報）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">「これだ」と思った瞬間は？ *</label>
            <Textarea
              value={triggerMoment}
              onChange={(e) => setTriggerMoment(e.target.value)}
              placeholder="例: 「平日10分で栄養満点の夕食」というキャッチコピーを見た瞬間。これなら子供との時間も確保できると思った。"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">迷った瞬間はありましたか？</label>
            <Textarea
              value={hesitation}
              onChange={(e) => setHesitation(e.target.value)}
              placeholder="例: 価格が高いと感じた。本当に10分でできるのか疑問だった。"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">最後の一押しになったことは？</label>
            <Textarea
              value={finalPush}
              onChange={(e) => setFinalPush(e.target.value)}
              placeholder="例: 30日間返金保証があったこと。同じような境遇のママの体験談。"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">価格についてどう感じましたか？</label>
            <Input
              value={pricePerception}
              onChange={(e) => setPricePerception(e.target.value)}
              placeholder="例: 最初は高いと思ったが、外食費を考えるとすぐに元が取れると思った"
            />
          </div>
        </CardContent>
      </Card>

      {/* After Purchase */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-green-600">🟢</span>
            購入後の変化
          </CardTitle>
          <CardDescription>
            商品を使ってどう変わったか
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">どのように変わりましたか？ *</label>
            <Textarea
              value={transformation}
              onChange={(e) => setTransformation(e.target.value)}
              placeholder="例: 夕食の準備時間が30分から10分に短縮。子供の宿題を見る時間ができ、家族との会話も増えた。「ママ、最近笑顔が多いね」と言われた。"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">人に勧めるとしたら何と言いますか？</label>
            <Textarea
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              placeholder="例: 「料理の時間を減らして、大切な人との時間を増やせるよ。私は子供との時間が3倍になった」"
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="wouldRepurchase"
              checked={wouldRepurchase}
              onCheckedChange={(checked) => setWouldRepurchase(!!checked)}
            />
            <label htmlFor="wouldRepurchase" className="text-sm cursor-pointer">
              また購入したい / 継続したい
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Meta Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">インタビュー情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">インタビュー日</label>
              <Input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">インタビュアー</label>
              <Input
                value={interviewer}
                onChange={(e) => setInterviewer(e.target.value)}
                placeholder="例: 田中"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">インタビュー全文（任意）</label>
            <Textarea
              value={rawTranscript}
              onChange={(e) => setRawTranscript(e.target.value)}
              placeholder="インタビューの録音を文字起こしした内容を貼り付け..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "保存中..." : "N1データを保存"}
        </Button>
      </div>
    </form>
  );
}
