import type { OfferKind } from "@/lib/offers";

export type ContractTerm = {
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  pointsEn?: string[];
  pointsAr?: string[];
};

export function contractTerms(kind: OfferKind): ContractTerm[] {
  const scope = kind === "architecture"
    ? {
      bodyEn: "The company's services are limited to the design stages in the approved quotation, and include the architectural plans and elevations, the structural and MEP plans, and the 3D renders. Any additional work requires a separate agreement and price.",
      bodyAr: "تقتصر خدمات الشركة على مراحل التصميم المحددة في عرض السعر المعتمد، وتشمل المخططات المعمارية والواجهات، والمخططات الإنشائية والخدمات (MEP)، والإظهار ثلاثي الأبعاد (3D Renders). وأي أعمال إضافية تتطلب اتفاقاً وتسعيراً منفصلاً.",
    }
    : {
      bodyEn: "The company's services are limited to the works and quantities in the approved quotation. Any additional work requires a separate agreement and price.",
      bodyAr: "تقتصر خدمات الشركة على الأعمال والكميات المحددة في عرض السعر المعتمد. وأي أعمال إضافية تتطلب اتفاقاً وتسعيراً منفصلاً.",
    };
  return [
    {
      titleEn: "Duration",
      titleAr: "مدة التنفيذ",
      bodyEn: "The company shall complete and deliver the design services within a maximum of 90 days from the date the contract is signed and the down payment and the information required from the client are received, excluding any delay caused by the client.",
      bodyAr: "تلتزم الشركة بتنفيذ وتسليم خدمات التصميم خلال مدة أقصاها (90) يوماً من تاريخ توقيع العقد واستلام الدفعة المقدمة والمعلومات المطلوبة من العميل، مع استثناء أي تأخير ناتج عن العميل.",
    },
    {
      titleEn: "Correspondence",
      titleAr: "المراسلات",
      bodyEn: "All written and electronic correspondence and approvals relating to the project form part of this contract.",
      bodyAr: "تعتبر جميع المراسلات والموافقات الخطية والإلكترونية المتعلقة بالمشروع جزءاً من هذا العقد.",
    },
    { titleEn: "Scope of work", titleAr: "نطاق العمل", ...scope },
    {
      titleEn: "Company's obligations",
      titleAr: "التزامات الشركة",
      bodyEn: "The company shall prepare the designs in accordance with the laws, technical requirements, and construction standards in force in the State of Qatar and the competent authorities.",
      bodyAr: "تلتزم الشركة بإعداد التصاميم وفق القوانين والاشتراطات الفنية ومعايير البناء المعمول بها في دولة قطر والجهات المختصة.",
    },
    {
      titleEn: "Cancellation and change",
      titleAr: "الإلغاء والتغيير",
      bodyEn: "If the client cancels the project after work has started, the company may keep the value of the work already carried out. The company may also reassess the price and the duration if a material change or additional work is requested.",
      bodyAr: "في حال إلغاء المشروع من قبل العميل بعد بدء العمل، يحق للشركة الاحتفاظ بقيمة الأعمال المنفذة. كما يحق للشركة إعادة تقييم السعر والمدة في حال طلب أي تغيير جوهري أو أعمال إضافية.",
    },
    {
      titleEn: "Revisions and approvals",
      titleAr: "التعديلات والاعتمادات",
      bodyEn: "",
      bodyAr: "",
      pointsEn: [
        "The client may request revisions within the agreed design scope.",
        "Any material revision or change to the project scope is subject to additional cost and time.",
        "Each stage must be approved before moving to the next stage.",
        "The company shall correct technical errors arising from its own work at no additional cost.",
      ],
      pointsAr: [
        "يحق للعميل طلب تعديلات ضمن نطاق التصميم المتفق عليه.",
        "أي تعديل جوهري أو تغيير في نطاق المشروع يخضع لتكلفة ومدة إضافيتين.",
        "يجب اعتماد كل مرحلة قبل الانتقال إلى المرحلة التالية.",
        "تلتزم الشركة بتصحيح الأخطاء الفنية الناتجة عن تنفيذها دون تكلفة إضافية.",
      ],
    },
    {
      titleEn: "Payments and late payment",
      titleAr: "الدفعات والتأخير في السداد",
      bodyEn: "The contract price is paid according to the payment schedule in the approved quotation. If the client is late in paying, the company may suspend the work until the payment is received, and the duration is extended by the period of the delay.",
      bodyAr: "تُسدد قيمة العقد وفق جدول الدفعات الوارد في عرض السعر المعتمد، وفي حال تأخر العميل عن السداد يحق للشركة تعليق العمل حتى استلام الدفعة، مع تمديد مدة التنفيذ بقدر فترة التأخير.",
    },
    {
      titleEn: "Final delivery",
      titleAr: "التسليم النهائي",
      bodyEn: "The company shall deliver all agreed design outputs according to the stages in the quotation, and the client's approval of each stage is acceptance of its outputs.",
      bodyAr: "تلتزم الشركة بتسليم جميع المخرجات التصميمية المتفق عليها وفق مراحل العمل المحددة في عرض السعر، ويُعتبر اعتماد العميل لكل مرحلة موافقة على مخرجاتها.",
    },
  ];
}
