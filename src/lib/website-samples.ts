import type { OfferKind } from "@/lib/offers";
import type { BlogCategory, SiteDocCategory } from "@/lib/website";

/*
 * Sample website content. The public pages show these until the first real
 * blog post / document is published from the system's Website module.
 * Images are from /public/site.
 */

export type SamplePhoto =
  | "journal-featured"
  | "article-office"
  | "article-bathroom"
  | "article-staircase"
  | "article-villa"
  | "article-dining"
  | "article-wood";

export type SamplePost = {
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string;
  excerptAr: string;
  bodyEn: string;
  bodyAr: string;
  category: BlogCategory;
  readMinutes: number;
  publishedOn: string;
  featured: boolean;
  photo: SamplePhoto;
  coverAltEn: string;
  coverAltAr: string;
};

export const samplePosts: SamplePost[] = [
  {
    slug: "before-the-first-drawing",
    titleEn: "Before the first drawing, ask the right questions",
    titleAr: "قبل الرسم الأول، اطرح الأسئلة الصحيحة",
    excerptEn: "A thoughtful brief is the foundation of a thoughtful space. Begin with the way you live, what you value and what your project needs to achieve.",
    excerptAr: "الموجز المدروس هو أساس المساحة المدروسة. ابدأ بأسلوب حياتك، وما تقدّره، وما يحتاج مشروعك إلى تحقيقه.",
    bodyEn: `Every project we deliver starts long before a line is drawn. It starts with a conversation about how a family wakes up, where guests are welcomed, and which rooms need light in the afternoon.

## Start with how you live

Write down a normal weekday and a busy weekend. Who is at home, where do they gather, and what gets in the way today? These notes shape the plan far more than a list of room sizes.

## Decide what matters most

Most briefs hold more wishes than the budget allows. Rank them: the majlis that must impress, the kitchen that must work hard, the storage that must hide everything. A clear order makes every later decision faster.

> A good brief does not describe a building. It describes a life, and lets the building follow.

## Share the numbers early

Plot size, budget range and the date you would like to move in are not details for later. Sharing them at the first meeting lets our team propose plans that are realistic from day one, and saves weeks of redesign.`,
    bodyAr: `يبدأ كل مشروع ننفّذه قبل رسم أي خط بوقت طويل. يبدأ بحوار حول كيف تستيقظ العائلة، وأين يُستقبل الضيوف، وأي الغرف تحتاج إلى الضوء بعد الظهر.

## ابدأ بأسلوب حياتك

اكتب يوماً عادياً من أيام الأسبوع وعطلة نهاية أسبوع مزدحمة. من يكون في المنزل، وأين يجتمعون، وما الذي يعيقهم اليوم؟ هذه الملاحظات تشكّل المخطط أكثر بكثير من قائمة بمساحات الغرف.

## حدّد الأهم

تحمل معظم الموجزات أمنيات أكثر مما تسمح به الميزانية. رتّبها: المجلس الذي يجب أن يُبهر، والمطبخ الذي يجب أن يعمل بكفاءة، والتخزين الذي يجب أن يُخفي كل شيء. الترتيب الواضح يجعل كل قرار لاحق أسرع.

> الموجز الجيد لا يصف مبنى. إنه يصف حياة، ويترك المبنى يتبعها.

## شارك الأرقام مبكراً

مساحة الأرض ونطاق الميزانية وموعد الانتقال المرغوب ليست تفاصيل مؤجلة. مشاركتها في اللقاء الأول تتيح لفريقنا اقتراح مخططات واقعية منذ اليوم الأول، وتوفّر أسابيع من إعادة التصميم.`,
    category: "planning",
    readMinutes: 6,
    publishedOn: "2026-10-28",
    featured: true,
    photo: "journal-featured",
    coverAltEn: "Double-height living room with a floating staircase",
    coverAltAr: "صالة معيشة بارتفاع مزدوج ودرج معلّق",
  },
  {
    slug: "a-better-brief-for-your-next-space",
    titleEn: "A better brief for your next space",
    titleAr: "موجز أفضل لمساحتك القادمة",
    excerptEn: "Five questions that turn a wish list into a plan our designers can build on.",
    excerptAr: "خمسة أسئلة تحوّل قائمة الأمنيات إلى خطة يبني عليها مصممونا.",
    bodyEn: `A brief does not need to be long. It needs to be honest about how the space will be used, and by whom.

## Five questions to answer

Who will use the space every day? What must it hold that it cannot hold today? Which rooms deserve the best light and views? What finish quality do you expect in each area? And when must it be ready?

> The clearer the brief, the fewer surprises on site.

Bring photos of spaces you love, and of spaces you do not. Both tell our designers as much as any drawing.`,
    bodyAr: `لا يحتاج الموجز إلى أن يكون طويلاً. يحتاج إلى أن يكون صادقاً بشأن كيفية استخدام المساحة، ومن سيستخدمها.

## خمسة أسئلة للإجابة عنها

من سيستخدم المساحة كل يوم؟ ما الذي يجب أن تستوعبه ولا تستوعبه اليوم؟ أي الغرف تستحق أفضل إضاءة وإطلالة؟ ما مستوى التشطيب المتوقع في كل منطقة؟ ومتى يجب أن تكون جاهزة؟

> كلما كان الموجز أوضح، قلّت المفاجآت في الموقع.

أحضر صوراً لمساحات تحبها، وأخرى لا تحبها. كلاهما يخبر مصممينا بقدر ما يخبرهم أي رسم.`,
    category: "planning",
    readMinutes: 5,
    publishedOn: "2026-10-14",
    featured: false,
    photo: "article-office",
    coverAltEn: "Executive office with lit shelving",
    coverAltAr: "مكتب تنفيذي برفوف مضاءة",
  },
  {
    slug: "where-stone-meets-wood",
    titleEn: "Where stone meets wood",
    titleAr: "حيث يلتقي الحجر بالخشب",
    excerptEn: "How we pair cool marble with warm timber so a room feels calm, not cold.",
    excerptAr: "كيف نمزج الرخام البارد بالخشب الدافئ لتبدو الغرفة هادئة لا باردة.",
    bodyEn: `Stone brings weight and permanence. Wood brings warmth and touch. Used together with care, they give a room both.

## Let one material lead

We choose one material to set the tone and let the other support it. A marble bathroom gains warmth from a single timber vanity; a wooden majlis gains depth from a stone threshold.

> The joint between two materials is where quality is judged.

## Detail the meeting

Where stone meets wood we use shadow gaps and clean edges, so each material can move with the heat of a Qatari summer without cracking the other.`,
    bodyAr: `يمنح الحجر ثقلاً وديمومة، ويمنح الخشب دفئاً وملمساً. وعند استخدامهما معاً بعناية، يمنحان الغرفة الأمرين معاً.

## دع مادة واحدة تقود

نختار مادة واحدة تحدد الطابع وندع الأخرى تدعمها. يكتسب الحمام الرخامي دفئاً من مغسلة خشبية واحدة، ويكتسب المجلس الخشبي عمقاً من عتبة حجرية.

> نقطة التقاء مادتين هي المكان الذي تُقاس فيه الجودة.

## اعتنِ بنقطة الالتقاء

حيث يلتقي الحجر بالخشب نستخدم فواصل ظلية وحوافاً نظيفة، كي تتمدد كل مادة مع حرارة الصيف القطري دون أن تُتلف الأخرى.`,
    category: "materials",
    readMinutes: 4,
    publishedOn: "2026-09-30",
    featured: false,
    photo: "article-bathroom",
    coverAltEn: "Marble bathroom with glass shower",
    coverAltAr: "حمام رخامي بفاصل زجاجي",
  },
  {
    slug: "one-team-a-clearer-journey",
    titleEn: "One team. A clearer journey.",
    titleAr: "فريق واحد. رحلة أوضح.",
    excerptEn: "Why keeping plans, construction and interiors under one roof saves time and money.",
    excerptAr: "لماذا يوفّر جمع المخططات والإنشاء والتصميم الداخلي تحت سقف واحد الوقت والمال.",
    bodyEn: `When the architect, the builder and the interior designer work for different companies, every handover is a chance for detail to be lost.

## One schedule, one point of contact

At ASAS one project manager owns the whole schedule. Site teams know what the interior team needs before the walls are closed, so sockets, lighting and joinery are right the first time.

> Fewer handovers mean fewer surprises, and fewer surprises mean a home on time.

Clients see one weekly update covering every discipline, and make decisions with the full picture in front of them.`,
    bodyAr: `عندما يعمل المهندس المعماري والمقاول ومصمم الديكور لشركات مختلفة، يصبح كل تسليم فرصة لضياع التفاصيل.

## جدول واحد ونقطة تواصل واحدة

في أساس يتولى مدير مشروع واحد الجدول الزمني بالكامل. تعرف فرق الموقع ما يحتاجه فريق التصميم الداخلي قبل إغلاق الجدران، فتكون المقابس والإضاءة والنجارة صحيحة من المرة الأولى.

> تسليمات أقل تعني مفاجآت أقل، ومفاجآت أقل تعني منزلاً في موعده.

يتلقى العملاء تحديثاً أسبوعياً واحداً يغطي كل التخصصات، ويتخذون قراراتهم والصورة كاملة أمامهم.`,
    category: "construction",
    readMinutes: 6,
    publishedOn: "2026-09-16",
    featured: false,
    photo: "article-staircase",
    coverAltEn: "Curved staircase with lit steps",
    coverAltAr: "درج منحني بدرجات مضاءة",
  },
  {
    slug: "a-home-shaped-by-light",
    titleEn: "A home shaped by light",
    titleAr: "منزل يشكّله الضوء",
    excerptEn: "Planning windows, courtyards and shade for Qatar’s strong sun.",
    excerptAr: "تخطيط النوافذ والأفنية والظل لشمس قطر القوية.",
    bodyEn: `In Qatar, light is both a gift and a challenge. The right opening fills a room with soft daylight; the wrong one turns it into an oven.

## Orient first, decorate later

We study the plot’s orientation before placing a single room. Living spaces face north where possible, deep balconies shade the south, and courtyards pull light into the heart of the house.

> Good daylight is designed, not added.

Arched windows, mashrabiya screens and light stone facades are not only beautiful. They are tools that keep a home bright and cool at the same time.`,
    bodyAr: `في قطر، الضوء نعمة وتحدٍّ في آن واحد. الفتحة الصحيحة تملأ الغرفة بضوء نهار ناعم، والخاطئة تحوّلها إلى فرن.

## التوجيه أولاً والزخرفة لاحقاً

ندرس اتجاه الأرض قبل وضع أي غرفة. تتجه مساحات المعيشة شمالاً قدر الإمكان، وتظلل الشرفات العميقة الجهة الجنوبية، وتجلب الأفنية الضوء إلى قلب المنزل.

> ضوء النهار الجيد يُصمَّم، ولا يُضاف.

النوافذ المقوّسة والمشربيات والواجهات الحجرية الفاتحة ليست جميلة فحسب، بل أدوات تُبقي المنزل مضيئاً وبارداً في الوقت نفسه.`,
    category: "architecture",
    readMinutes: 4,
    publishedOn: "2026-08-31",
    featured: false,
    photo: "article-villa",
    coverAltEn: "Stone villa with balcony",
    coverAltAr: "فيلا حجرية بشرفة",
  },
  {
    slug: "comfort-is-in-the-details",
    titleEn: "Comfort is in the details",
    titleAr: "الراحة تكمن في التفاصيل",
    excerptEn: "Small decisions about height, texture and light that make a room easy to live in.",
    excerptAr: "قرارات صغيرة حول الارتفاع والملمس والإضاءة تجعل الغرفة مريحة للعيش.",
    bodyEn: `Comfort is rarely one big gesture. It is the chair at the right height, the switch where your hand expects it, the curtain that closes without a sound.

## Design for the hand and the eye

We check every touch point: handles, switches, worktops and seating. Then we layer light so each room has a bright mode for work and a soft mode for evenings.

> A room feels finished when nothing asks for your attention.

These details cost little at design stage and a great deal to fix later, which is why we settle them before the first order is placed.`,
    bodyAr: `نادراً ما تكون الراحة لفتة واحدة كبيرة. إنها الكرسي بالارتفاع المناسب، والمفتاح حيث تتوقعه يدك، والستارة التي تُغلق دون صوت.

## صمّم لليد والعين

نراجع كل نقطة لمس: المقابض والمفاتيح وأسطح العمل والجلسات. ثم ننسّق الإضاءة طبقات كي تحظى كل غرفة بوضع ساطع للعمل ووضع هادئ للأمسيات.

> تبدو الغرفة مكتملة عندما لا يطلب منك فيها شيء انتباهك.

تكلّف هذه التفاصيل القليل في مرحلة التصميم والكثير لإصلاحها لاحقاً، ولهذا نحسمها قبل تقديم أول طلب شراء.`,
    category: "interiors",
    readMinutes: 5,
    publishedOn: "2026-08-17",
    featured: false,
    photo: "article-dining",
    coverAltEn: "Bright dining room",
    coverAltAr: "غرفة طعام مشرقة",
  },
  {
    slug: "the-art-of-a-seamless-finish",
    titleEn: "The art of a seamless finish",
    titleAr: "فن التشطيب المتقن",
    excerptEn: "What separates a good finish from an exceptional one, from ceilings to skirting.",
    excerptAr: "ما الذي يميّز التشطيب الجيد عن الاستثنائي، من الأسقف إلى الوزرات.",
    bodyEn: `An exceptional finish is mostly invisible. Lines run straight, joints align, and light falls evenly across every surface.

## Plan the lines

Before finishing starts we set out ceiling slats, tile joints and lighting on one drawing, so every line continues from one room to the next.

> Precision you cannot see is what makes a space feel calm.

Our finishing teams work to tight tolerances and inspect each room in daylight and at night before handover.`,
    bodyAr: `التشطيب الاستثنائي في معظمه غير مرئي. الخطوط مستقيمة، والفواصل متطابقة، والضوء يسقط بالتساوي على كل سطح.

## خطط للخطوط

قبل بدء التشطيب نرسم شرائح السقف وفواصل البلاط والإضاءة على مخطط واحد، كي يمتد كل خط من غرفة إلى أخرى.

> الدقة التي لا تراها هي ما يجعل المساحة هادئة.

تعمل فرق التشطيب لدينا بتفاوتات دقيقة، وتعاين كل غرفة في ضوء النهار وفي الليل قبل التسليم.`,
    category: "finishing",
    readMinutes: 4,
    publishedOn: "2026-08-03",
    featured: false,
    photo: "article-wood",
    coverAltEn: "Wooden slat ceiling with downlight",
    coverAltAr: "سقف بشرائح خشبية وإضاءة مخفية",
  },
];

export type SampleDocument = {
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  category: SiteDocCategory;
};

export const sampleDocuments: SampleDocument[] = [
  {
    titleEn: "ASAS company profile",
    titleAr: "ملف شركة أساس",
    descEn: "An introduction to ASAS Executive Contracting, our values and our approach.",
    descAr: "تعريف بشركة أساس للمقاولات التنفيذية وقيمنا ونهجنا.",
    category: "company",
  },
  {
    titleEn: "Our five disciplines",
    titleAr: "تخصصاتنا الخمسة",
    descEn: "Architectural plans, construction, interiors, finishing and furniture.",
    descAr: "المخططات المعمارية، والإنشاءات، والتصميم الداخلي، والتشطيبات، والأثاث.",
    category: "services",
  },
  {
    titleEn: "Project brief checklist",
    titleAr: "قائمة تحقق موجز المشروع",
    descEn: "A starting point for defining your needs, priorities, budget and timeline.",
    descAr: "نقطة انطلاق لتحديد احتياجاتك وأولوياتك وميزانيتك وجدولك الزمني.",
    category: "planning",
  },
  {
    titleEn: "Your first consultation",
    titleAr: "استشارتك الأولى",
    descEn: "What to prepare before meeting the ASAS team.",
    descAr: "ما يجب تحضيره قبل لقاء فريق أساس.",
    category: "planning",
  },
];

export type SampleProjectPhoto = "project-modern-interior" | "project-stone-villa" | "project-family-lounge" | "project-media-wall";

/** Sample projects (concept imagery), shown until the first project is published from the system. */
export type SampleProject = {
  slug: string;
  nameEn: string;
  nameAr: string;
  kind: OfferKind;
  scopeEn: string;
  scopeAr: string;
  locationEn: string;
  locationAr: string;
  summaryEn: string;
  summaryAr: string;
  year: string;
  photo: SampleProjectPhoto;
  altEn: string;
  altAr: string;
};

export const sampleProjects: SampleProject[] = [
  {
    slug: "modern-interior-luxury-and-comfort",
    nameEn: "Modern interior that reflects luxury and comfort",
    nameAr: "تصميم داخلي عصري يعكس الفخامة والراحة",
    kind: "interior",
    scopeEn: "Residential · Full interior renovation",
    scopeAr: "سكني · تجديد داخلي كامل",
    locationEn: "Qatar",
    locationAr: "قطر",
    summaryEn: "A family majlis reworked from the ceiling down: layered lighting, a statement chandelier, wall panelling and furniture made to measure.",
    summaryAr: "مجلس عائلي أُعيد تصميمه من السقف حتى الأرض: إضاءة متدرجة، وثريا لافتة، وتكسيات جدارية، وأثاث مصمم حسب المقاس.",
    year: "2026",
    photo: "project-modern-interior",
    altEn: "Modern majlis interior with chandelier",
    altAr: "مجلس عصري بثريا",
  },
  {
    slug: "stone-villa",
    nameEn: "Stone villa",
    nameAr: "فيلا حجرية",
    kind: "architecture",
    scopeEn: "Plans · Construction",
    scopeAr: "مخططات · إنشاءات",
    locationEn: "Qatar",
    locationAr: "قطر",
    summaryEn: "A two-storey family villa with a natural stone facade, deep shaded balconies and a plan arranged around a cool central hall.",
    summaryAr: "فيلا عائلية من طابقين بواجهة من الحجر الطبيعي وشرفات مظللة عميقة، ومخطط ينتظم حول صالة مركزية باردة.",
    year: "2025",
    photo: "project-stone-villa",
    altEn: "Stone villa facade with balcony",
    altAr: "واجهة فيلا حجرية بشرفة",
  },
  {
    slug: "family-lounge",
    nameEn: "Family lounge",
    nameAr: "صالة عائلية",
    kind: "interior",
    scopeEn: "Interior · Furniture",
    scopeAr: "تصميم داخلي · أثاث",
    locationEn: "Qatar",
    locationAr: "قطر",
    summaryEn: "Long, low seating and warm materials turn a large living room into a comfortable space for everyday family life and guests.",
    summaryAr: "جلسات طويلة منخفضة ومواد دافئة تحوّل صالة المعيشة الكبيرة إلى مساحة مريحة للحياة العائلية اليومية والضيوف.",
    year: "2025",
    photo: "project-family-lounge",
    altEn: "Family lounge with long seating",
    altAr: "صالة عائلية بجلسة ممتدة",
  },
  {
    slug: "media-wall",
    nameEn: "Media wall",
    nameAr: "جدار تلفاز",
    kind: "fitout",
    scopeEn: "Finishing",
    scopeAr: "تشطيبات",
    locationEn: "Qatar",
    locationAr: "قطر",
    summaryEn: "A timber media wall with concealed storage and lighting, detailed to line up with the majlis ceiling and joinery.",
    summaryAr: "جدار تلفاز خشبي بتخزين وإضاءة مخفيين، مُفصّل ليتطابق مع سقف المجلس وأعمال النجارة.",
    year: "2024",
    photo: "project-media-wall",
    altEn: "Majlis with wooden media wall",
    altAr: "مجلس بجدار تلفاز خشبي",
  },
];
