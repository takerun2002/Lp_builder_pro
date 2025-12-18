/**
 * LP制作ヒアリングシートテンプレート
 * N1顧客を意識した質問設計
 */

export interface HearingQuestion {
  id: string;
  section: string;
  question: string;
  description?: string;
  type: "text" | "textarea" | "select" | "multiselect" | "number" | "url";
  options?: string[];
  required: boolean;
  n1Related: boolean;
  placeholder?: string;
}

export interface HearingSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  questions: HearingQuestion[];
}

export interface HearingSheetTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  sections: HearingSection[];
}

/**
 * LP制作用ヒアリングシートテンプレート
 */
export const LP_HEARING_TEMPLATE: HearingSheetTemplate = {
  id: "lp-hearing-v1",
  name: "LP制作ヒアリングシート",
  description: "ランディングページ制作のための包括的なヒアリングテンプレート",
  version: "1.0",
  sections: [
    {
      id: "basic_info",
      title: "基本情報",
      description: "プロジェクトの基本的な情報",
      icon: "📋",
      questions: [
        {
          id: "project_name",
          section: "basic_info",
          question: "プロジェクト名・商品名",
          type: "text",
          required: true,
          n1Related: false,
          placeholder: "例: 〇〇ダイエットプログラム",
        },
        {
          id: "client_name",
          section: "basic_info",
          question: "クライアント名（会社名）",
          type: "text",
          required: true,
          n1Related: false,
        },
        {
          id: "contact_person",
          section: "basic_info",
          question: "担当者名",
          type: "text",
          required: true,
          n1Related: false,
        },
        {
          id: "deadline",
          section: "basic_info",
          question: "希望納期",
          type: "text",
          required: false,
          n1Related: false,
          placeholder: "例: 2024年3月末まで",
        },
        {
          id: "budget",
          section: "basic_info",
          question: "予算感",
          type: "select",
          options: ["〜30万円", "30〜50万円", "50〜100万円", "100万円以上", "未定"],
          required: false,
          n1Related: false,
        },
      ],
    },
    {
      id: "target_customer",
      title: "ターゲット顧客",
      description: "商品・サービスのターゲット層",
      icon: "🎯",
      questions: [
        {
          id: "target_gender",
          section: "target_customer",
          question: "主なターゲットの性別",
          type: "select",
          options: ["男性", "女性", "両方", "その他"],
          required: true,
          n1Related: false,
        },
        {
          id: "target_age",
          section: "target_customer",
          question: "主なターゲットの年齢層",
          type: "multiselect",
          options: ["10代", "20代", "30代", "40代", "50代", "60代以上"],
          required: true,
          n1Related: false,
        },
        {
          id: "target_occupation",
          section: "target_customer",
          question: "ターゲットの職業・属性",
          type: "textarea",
          required: false,
          n1Related: false,
          placeholder: "例: 会社員、主婦、経営者など",
        },
        {
          id: "target_location",
          section: "target_customer",
          question: "地域性はありますか？",
          type: "textarea",
          required: false,
          n1Related: false,
          placeholder: "例: 全国、首都圏のみ、オンラインのみなど",
        },
      ],
    },
    {
      id: "n1_customer",
      title: "N1顧客像（最重要）",
      description: "最も買ってほしい理想の1人の顧客を具体的に",
      icon: "⭐",
      questions: [
        {
          id: "n1_name",
          section: "n1_customer",
          question: "その人に名前をつけるとしたら？",
          description: "架空でOK。人物像を具体化するため",
          type: "text",
          required: true,
          n1Related: true,
          placeholder: "例: 田中美咲さん（35歳）",
        },
        {
          id: "n1_situation",
          section: "n1_customer",
          question: "今どんな状況にいますか？",
          description: "日常生活、仕事、家庭環境など",
          type: "textarea",
          required: true,
          n1Related: true,
          placeholder: "例: 共働きで2人の子供を育てながら、自分の時間がほとんど取れない状況...",
        },
        {
          id: "n1_pain",
          section: "n1_customer",
          question: "最も深刻な悩み・痛みは？",
          description: "夜も眠れないほど悩んでいること",
          type: "textarea",
          required: true,
          n1Related: true,
          placeholder: "例: 毎日の料理に時間がかかりすぎて、子供との時間が取れない...",
        },
        {
          id: "n1_desire",
          section: "n1_customer",
          question: "本当に望んでいることは？",
          description: "表面的なものではなく、根本的な願望",
          type: "textarea",
          required: true,
          n1Related: true,
          placeholder: "例: 家族との時間を大切にしながら、自分らしく生きたい",
        },
        {
          id: "n1_fear",
          section: "n1_customer",
          question: "最も恐れていることは？",
          description: "このままだとどうなることを恐れている？",
          type: "textarea",
          required: true,
          n1Related: true,
          placeholder: "例: 子供の成長を見逃してしまうこと、自分の健康を損なうこと",
        },
        {
          id: "n1_tried",
          section: "n1_customer",
          question: "これまで試したことは？",
          description: "解決のために試した方法とその結果",
          type: "textarea",
          required: false,
          n1Related: true,
          placeholder: "例: 時短レシピ本を買ったが続かなかった...",
        },
        {
          id: "n1_objection",
          section: "n1_customer",
          question: "購入をためらう理由は？",
          description: "価格、効果への疑い、時間など",
          type: "textarea",
          required: true,
          n1Related: true,
          placeholder: "例: 本当に効果があるのか不安、価格が高いと感じる...",
        },
        {
          id: "n1_trigger",
          section: "n1_customer",
          question: "何があったら「今すぐ買おう」と思う？",
          description: "購入の決め手になるもの",
          type: "textarea",
          required: true,
          n1Related: true,
          placeholder: "例: 返金保証があれば、実際に使った人の声を見れば...",
        },
      ],
    },
    {
      id: "product_info",
      title: "商品・サービス情報",
      description: "提供する商品・サービスの詳細",
      icon: "📦",
      questions: [
        {
          id: "product_description",
          section: "product_info",
          question: "商品・サービスの概要",
          type: "textarea",
          required: true,
          n1Related: false,
          placeholder: "どんな商品・サービスか簡潔に説明してください",
        },
        {
          id: "product_features",
          section: "product_info",
          question: "主な特徴・機能（箇条書き）",
          type: "textarea",
          required: true,
          n1Related: false,
          placeholder: "・特徴1\n・特徴2\n・特徴3",
        },
        {
          id: "product_benefits",
          section: "product_info",
          question: "お客様が得られるベネフィット",
          description: "特徴ではなく、お客様にとっての価値",
          type: "textarea",
          required: true,
          n1Related: true,
          placeholder: "例: 毎日30分の時短で、月に15時間の自由時間が生まれる",
        },
        {
          id: "product_price",
          section: "product_info",
          question: "価格・料金体系",
          type: "textarea",
          required: true,
          n1Related: false,
          placeholder: "例: 月額9,800円（税込）、年払いで20%オフ",
        },
        {
          id: "product_guarantee",
          section: "product_info",
          question: "保証・サポート内容",
          type: "textarea",
          required: false,
          n1Related: false,
          placeholder: "例: 30日間返金保証、24時間サポート対応",
        },
        {
          id: "product_usp",
          section: "product_info",
          question: "競合と比べた独自の強み（USP）",
          description: "なぜあなたの商品を選ぶべきか",
          type: "textarea",
          required: true,
          n1Related: true,
          placeholder: "例: 業界唯一の〇〇機能、10年の実績...",
        },
      ],
    },
    {
      id: "competitor_info",
      title: "競合情報",
      description: "競合他社の状況",
      icon: "🔍",
      questions: [
        {
          id: "main_competitors",
          section: "competitor_info",
          question: "主な競合他社（3社程度）",
          type: "textarea",
          required: false,
          n1Related: false,
          placeholder: "会社名やサービス名、URLがあれば記載",
        },
        {
          id: "competitor_weakness",
          section: "competitor_info",
          question: "競合の弱点・不満点",
          description: "お客様が競合に感じている不満",
          type: "textarea",
          required: false,
          n1Related: true,
          placeholder: "例: サポートが遅い、使い方が難しい...",
        },
        {
          id: "differentiation",
          section: "competitor_info",
          question: "競合との差別化ポイント",
          type: "textarea",
          required: false,
          n1Related: false,
          placeholder: "あなたの商品が競合より優れている点",
        },
      ],
    },
    {
      id: "existing_materials",
      title: "既存素材・実績",
      description: "使用可能な素材や実績データ",
      icon: "📁",
      questions: [
        {
          id: "testimonials",
          section: "existing_materials",
          question: "お客様の声・体験談",
          description: "実名・写真付きだと効果的",
          type: "textarea",
          required: false,
          n1Related: true,
          placeholder: "既存のお客様の声があれば記載、または参照URL",
        },
        {
          id: "social_proof",
          section: "existing_materials",
          question: "実績・数字",
          description: "販売数、会員数、満足度など",
          type: "textarea",
          required: false,
          n1Related: false,
          placeholder: "例: 累計10万本販売、満足度97.3%",
        },
        {
          id: "media_coverage",
          section: "existing_materials",
          question: "メディア掲載・受賞歴",
          type: "textarea",
          required: false,
          n1Related: false,
          placeholder: "例: 〇〇雑誌掲載、〇〇アワード受賞",
        },
        {
          id: "existing_lp_url",
          section: "existing_materials",
          question: "既存のLP・WebサイトURL",
          type: "url",
          required: false,
          n1Related: false,
          placeholder: "https://example.com",
        },
        {
          id: "brand_assets",
          section: "existing_materials",
          question: "使用可能な画像・動画素材",
          description: "ロゴ、商品画像、イメージ写真など",
          type: "textarea",
          required: false,
          n1Related: false,
          placeholder: "使用可能な素材の説明やリンク",
        },
      ],
    },
    {
      id: "additional_info",
      title: "その他・要望",
      description: "追加情報や特別な要望",
      icon: "💬",
      questions: [
        {
          id: "tone_style",
          section: "additional_info",
          question: "希望するトーン・雰囲気",
          type: "multiselect",
          options: [
            "信頼感・専門的",
            "親しみやすい・カジュアル",
            "高級感・プレミアム",
            "緊急性・限定感",
            "ストーリー性",
            "論理的・データ重視",
          ],
          required: false,
          n1Related: false,
        },
        {
          id: "reference_lp",
          section: "additional_info",
          question: "参考にしたいLP・デザイン",
          type: "textarea",
          required: false,
          n1Related: false,
          placeholder: "参考URLや具体的なイメージ",
        },
        {
          id: "ng_items",
          section: "additional_info",
          question: "避けたい表現・NG事項",
          type: "textarea",
          required: false,
          n1Related: false,
          placeholder: "例: 過度な煽り表現は避けたい、競合名は出さない",
        },
        {
          id: "additional_requests",
          section: "additional_info",
          question: "その他ご要望・補足事項",
          type: "textarea",
          required: false,
          n1Related: false,
          placeholder: "何でもお気軽にご記入ください",
        },
      ],
    },
  ],
};

/**
 * N1関連の質問のみを抽出
 */
export function getN1Questions(): HearingQuestion[] {
  return LP_HEARING_TEMPLATE.sections.flatMap((section) =>
    section.questions.filter((q) => q.n1Related)
  );
}

/**
 * 必須質問のみを抽出
 */
export function getRequiredQuestions(): HearingQuestion[] {
  return LP_HEARING_TEMPLATE.sections.flatMap((section) =>
    section.questions.filter((q) => q.required)
  );
}

/**
 * セクション別に質問を取得
 */
export function getQuestionsBySection(sectionId: string): HearingQuestion[] {
  const section = LP_HEARING_TEMPLATE.sections.find((s) => s.id === sectionId);
  return section?.questions || [];
}

/**
 * 完了度を計算
 */
export function calculateCompletion(responses: { questionId: string; value: string | string[] }[]): {
  total: number;
  answered: number;
  required: number;
  requiredAnswered: number;
  percentage: number;
  requiredPercentage: number;
} {
  const allQuestions = LP_HEARING_TEMPLATE.sections.flatMap((s) => s.questions);
  const requiredQuestions = allQuestions.filter((q) => q.required);
  const responseMap = new Map(responses.map((r) => [r.questionId, r.value]));

  const isAnswered = (value: string | string[] | undefined): boolean => {
    if (!value) return false;
    if (Array.isArray(value)) return value.length > 0;
    return value.trim().length > 0;
  };

  const answered = allQuestions.filter((q) => isAnswered(responseMap.get(q.id))).length;
  const requiredAnswered = requiredQuestions.filter((q) => isAnswered(responseMap.get(q.id))).length;

  return {
    total: allQuestions.length,
    answered,
    required: requiredQuestions.length,
    requiredAnswered,
    percentage: Math.round((answered / allQuestions.length) * 100),
    requiredPercentage: requiredQuestions.length > 0
      ? Math.round((requiredAnswered / requiredQuestions.length) * 100)
      : 100,
  };
}
