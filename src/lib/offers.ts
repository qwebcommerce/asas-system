import { boqEntryCount, boqPlace, boqRows, boqSectionName, boqWorkName } from "@/lib/boq";

export const offerStatuses = ["draft", "sent", "accepted", "rejected", "expired"] as const;
/** "boq": items of the construction bill of quantities (see src/lib/boq.ts) */
export const offerTrades = ["paint", "gyp", "floor", "kitchen", "design", "boq"] as const;
/** m3, kg, nr (number) and item are used by the construction BOQ only */
export const offerUnits = ["m2", "lm", "pcs", "set", "m3", "kg", "nr", "item"] as const;
/** Units offered in the fit-out measurement table */
export const fitoutUnits = ["m2", "lm", "pcs", "set"] as const;
/**
 * How a row's quantity is measured: wall area 2(L+W)×H, floor area L×W, a length,
 * a count, or "direct" (the quantity is typed in, e.g. an architecture area in m²).
 */
export const measureShapes = ["walls", "area", "length", "count", "direct"] as const;
/** Offer types, in the order they are offered when creating an offer. */
export const offerKinds = ["architecture", "fitout", "interior", "construction"] as const;

export type OfferStatus = (typeof offerStatuses)[number];
export type OfferTrade = (typeof offerTrades)[number];
export type OfferUnit = (typeof offerUnits)[number];
export type MeasureShape = (typeof measureShapes)[number];
export type OfferKind = (typeof offerKinds)[number];

export function isOfferKind(value: unknown): value is OfferKind {
  return offerKinds.some((kind) => kind === value);
}

/** Offers saved before the four types existed used "finishing", which is fit-out work. */
function storedKind(value: unknown): OfferKind {
  if (isOfferKind(value)) return value;
  return "fitout";
}

export type OfferStage = {
  titleEn: string;
  titleAr: string;
  detailEn: string;
  detailAr: string;
};

export type OfferPayment = {
  labelEn: string;
  labelAr: string;
  percent: number;
  whenEn: string;
  whenAr: string;
};

/** Discount on an offer: a percentage of the subtotal or a fixed amount in QAR. */
export const discountTypes = ["percent", "amount"] as const;
export type DiscountType = (typeof discountTypes)[number];
export type OfferDiscount = { type: DiscountType; value: number };

/** Offer types priced per m² of design area, with the same form and documents (architecture layout). */
export const designKinds = ["architecture", "interior"] as const;
export type DesignKind = (typeof designKinds)[number];

export function isDesignKind(kind: OfferKind): kind is DesignKind {
  return designKinds.some((item) => item === kind);
}

/**
 * Unit price (QAR per m²) of design offers, set by the offer's TOTAL area.
 * PLACEHOLDER RATES until the final price lists for architecture and interior design are shared:
 * below 500 m² → 20, 500 m² and above → 25.
 */
export const designRates: Record<DesignKind, { below: number | null; rate: number }[]> = {
  architecture: [{ below: 500, rate: 20 }, { below: null, rate: 25 }],
  interior: [{ below: 500, rate: 20 }, { below: null, rate: 25 }],
};

export function designRate(kind: DesignKind, area: number) {
  const tiers = designRates[kind];
  return (tiers.find((tier) => tier.below !== null && area < tier.below) ?? tiers[tiers.length - 1]).rate;
}

/** Price item used by the area rows of a design offer. */
export function designPriceId(kind: DesignKind) {
  return kind === "interior" ? "int-design" : "arch-design";
}

/** Design offers: every row takes the unit price of the offer's total area (rows count once each). */
export function withDesignRates(kind: OfferKind, lines: OfferLine[]): OfferLine[] {
  if (!isDesignKind(kind)) return lines;
  const rows = lines.map((line) => ({ ...line, units: 1 }));
  const rate = designRate(kind, totalArea(rows));
  return rows.map((line) => ({ ...line, rate }));
}

export const letterhead = {
  company: "ASAS EXECUTION TRADING & CONTRACTING W.L.L.",
  companyAr: "شركة أساس التنفيذية للتجارة والمقاولات",
  web: "www.asasqa.com",
  email: "info@asasqa.com",
  cr: "139215",
  mobile: "66111817",
  addressEn: "Al Rafal Towers, Marina Lusail",
  addressAr: "أبراج الرافال – مارينا لوسيل",
  cityEn: "Lusail, Qatar",
  cityAr: "لوسيل – قطر",
  officeEn: "Fourth floor",
  officeAr: "الطابق الرابع",
  representativeAr: "السيد/ المهندس سعد سلطان سعد آل مانع الكعبي",
  representativeRoleEn: "Owner of the company, authorized to sign",
  representativeRoleAr: "بصفته مالك الشركة والمخول بالتوقيع",
};

export type PriceItem = {
  id: string;
  trade: OfferTrade;
  nameEn: string;
  nameAr: string;
  unit: OfferUnit;
  shape: MeasureShape;
  rate: number;
};

/**
 * Price list. PLACEHOLDER RATES: the real measurement and price lists per offer type
 * will replace these.
 */
export const priceList: PriceItem[] = [
  { id: "arch-design", trade: "design", nameEn: "Architectural design", nameAr: "تصميم معماري", unit: "m2", shape: "direct", rate: 20 },
  { id: "int-design", trade: "design", nameEn: "Interior design", nameAr: "تصميم داخلي", unit: "m2", shape: "direct", rate: 20 },
  { id: "paint", trade: "paint", nameEn: "Painting", nameAr: "دهان", unit: "m2", shape: "walls", rate: 28 },
  { id: "gyp", trade: "gyp", nameEn: "Gypsum ceiling", nameAr: "سقف جبس", unit: "m2", shape: "area", rate: 95 },
  { id: "floor", trade: "floor", nameEn: "Porcelain flooring", nameAr: "أرضية بورسلان", unit: "m2", shape: "area", rate: 165 },
  { id: "kitchen", trade: "kitchen", nameEn: "Kitchen cabinets", nameAr: "خزائن المطبخ", unit: "lm", shape: "length", rate: 2400 },
  // Construction bill of quantities (rates from the company BOQ)
  ...boqRows.map((place) => {
    const name = boqWorkName(place);
    return { id: place.row.id, trade: "boq" as const, nameEn: name.en, nameAr: name.ar, unit: place.row.unit, shape: "direct" as const, rate: place.row.rate };
  }),
];

/** A construction offer line for a BOQ row (the section is kept as the line's area, e.g. "Sub structure"). */
export function boqLine(id: string, qty: number, rate: number, extras: Partial<Pick<OfferLine, "wastePct" | "profitPct" | "manpower">> = {}): OfferLine | null {
  const place = boqPlace(id);
  const price = priceById(id);
  if (!place || !price) return null;
  const section = boqSectionName(place.section);
  return {
    roomEn: section.en,
    roomAr: section.ar,
    priceId: id,
    workEn: price.nameEn,
    workAr: price.nameAr,
    trade: "boq",
    l: null,
    w: null,
    h: null,
    qty,
    unit: price.unit,
    shape: "direct",
    rate,
    units: 1,
    wastePct: extras.wastePct ?? 0,
    profitPct: extras.profitPct ?? 0,
    manpower: extras.manpower ?? 0,
  };
}

export type OfferLine = {
  roomEn: string;
  roomAr: string;
  priceId: string;
  workEn: string;
  workAr: string;
  trade: OfferTrade;
  l: number | null;
  w: number | null;
  h: number | null;
  qty: number;
  unit: OfferUnit;
  shape: MeasureShape;
  rate: number;
  /** How many identical units the row covers (e.g. 2 identical floors). */
  units: number;
  /** Construction BOQ rows: waste (% of cost), manpower (QAR) and profit (% of cost + waste + manpower) */
  wastePct?: number;
  profitPct?: number;
  manpower?: number;
};

export type Offer = {
  id: string;
  number: string;
  clientEn: string;
  clientAr: string;
  phone: string;
  clientId: string;
  addressEn: string;
  addressAr: string;
  capacityEn: string;
  capacityAr: string;
  projectEn: string;
  projectAr: string;
  reference: string;
  kind: OfferKind;
  /** Project this offer belongs to ("" when not linked yet). */
  projectId: string;
  issuedOn: string;
  scopeEn: string;
  scopeAr: string;
  stages: OfferStage[];
  payments: OfferPayment[];
  status: OfferStatus;
  discount: OfferDiscount;
  validUntil: string;
  lines: OfferLine[];
  /** Construction: the project has a basement (recorded only for now) */
  basement: boolean;
  /** Construction: duration of the works in months (0 when not set) */
  durationMonths: number;
  /** Construction: the manpower helper (men × rate per man per month × duration ÷ BOQ items) */
  costing: OfferCosting;
};

/**
 * Manpower helper of a construction offer: men × rate per man per month × duration, split
 * equally over the BOQ items fills each item's manpower (which can then be changed per item).
 */
export type OfferCosting = { men: number; manRate: number };

/** Manpower rate per man per month (QAR) offered by default */
export const defaultManRate = 1900;

export function defaultCosting(): OfferCosting {
  return { men: 0, manRate: defaultManRate };
}

export function manpowerTotal(costing: OfferCosting, months: number) {
  return Math.max(0, costing.men) * Math.max(0, costing.manRate) * Math.max(0, months);
}

/** Manpower of each BOQ row when the total is split equally over the numbered items (parts share their item's share). */
export function manpowerShares(total: number) {
  const perItem = total / boqEntryCount;
  return new Map(boqRows.map((place) => [place.row.id, Math.round(perItem / place.entry.rows.length * 100) / 100]));
}

export type OfferInput = Omit<Offer, "id" | "number">;

/** Default payment schedule, worded as in the reference quotation. */
export function defaultPayments(): OfferPayment[] {
  return [
    { labelEn: "Down Payment", labelAr: "الدفعة الأولى", percent: 50, whenEn: "Payment upon signing this Agreement", whenAr: "عند توقيع هذا العرض" },
    { labelEn: "Second Payment", labelAr: "الدفعة الثانية", percent: 25, whenEn: "Upon completion of Stage One", whenAr: "عند الانتهاء من المرحلة الأولى" },
    { labelEn: "Third Payment", labelAr: "الدفعة الثالثة", percent: 15, whenEn: "Upon Completion of Stage Two", whenAr: "عند الانتهاء من المرحلة الثانية" },
    { labelEn: "Final Payment", labelAr: "الدفعة الأخيرة", percent: 10, whenEn: "Before The Final Stage Submission", whenAr: "قبل تسليم المرحلة الثالثة" },
  ];
}

/**
 * Construction payment schedule, used until the client's own schedule is shared; it can be changed
 * per offer with "Edit". Milestones follow the BOQ sections (sub structure, super structure).
 */
export function constructionPayments(): OfferPayment[] {
  return [
    { labelEn: "Down Payment", labelAr: "الدفعة الأولى", percent: 20, whenEn: "Payment upon signing this Agreement", whenAr: "عند توقيع هذا العرض" },
    { labelEn: "Second Payment", labelAr: "الدفعة الثانية", percent: 30, whenEn: "Upon completion of the sub structure works", whenAr: "عند الانتهاء من اعمال ما تحت مستوى الصفر (الأساسات)" },
    { labelEn: "Third Payment", labelAr: "الدفعة الثالثة", percent: 40, whenEn: "Upon completion of the super structure works", whenAr: "عند الانتهاء من اعمال ما فوق مستوى الصفر (البناء)" },
    { labelEn: "Final Payment", labelAr: "الدفعة الأخيرة", percent: 10, whenEn: "Upon handover", whenAr: "عند التسليم" },
  ];
}

/** Standard payment schedule of a type of offer. */
export function defaultPaymentsFor(kind: OfferKind): OfferPayment[] {
  return kind === "construction" ? constructionPayments() : defaultPayments();
}

/** Architecture design package, worded as in the reference quotation (one detail per line). */
export function architectureStages(): OfferStage[] {
  return [
    { titleEn: "Stage One", titleAr: "المرحلة الأولى", detailEn: "Architectural plans\nElevation plans", detailAr: "المخططات المعمارية\nمخططات الواجهات المعمارية" },
    { titleEn: "Stage Two", titleAr: "المرحلة الثانية", detailEn: "Structural & MEP Plans", detailAr: "المخططات الإنشائية والخدمات" },
    { titleEn: "Stage Three", titleAr: "المرحلة الثالثة", detailEn: "3D Renders", detailAr: "الإظهار الثلاثي الأبعاد" },
  ];
}

/**
 * Interior design package (same structure as architecture; the client's own wording can replace it
 * per offer with "Edit").
 */
export function interiorStages(): OfferStage[] {
  return [
    { titleEn: "Stage One", titleAr: "المرحلة الأولى", detailEn: "Space planning and layout\nConcept design", detailAr: "مخططات توزيع المساحات\nالفكرة التصميمية" },
    { titleEn: "Stage Two", titleAr: "المرحلة الثانية", detailEn: "Ceilings, lighting, flooring and wall details", detailAr: "تفاصيل الأسقف والإضاءة والأرضيات والجدران" },
    { titleEn: "Stage Three", titleAr: "المرحلة الثالثة", detailEn: "3D Renders", detailAr: "الإظهار الثلاثي الأبعاد" },
  ];
}

/** Default design package of a design offer. */
export function designStages(kind: OfferKind): OfferStage[] {
  return kind === "interior" ? interiorStages() : kind === "architecture" ? architectureStages() : [];
}

/** Price items offered for a type of offer. */
export function priceListFor(kind: OfferKind) {
  if (isDesignKind(kind)) return priceList.filter((item) => item.id === designPriceId(kind));
  if (kind === "construction") return priceList.filter((item) => item.trade === "boq");
  return priceList.filter((item) => item.trade !== "design" && item.trade !== "boq");
}

/** Trades shown as filters in the measurement table for a type of offer. */
export function tradesFor(kind: OfferKind) {
  if (isDesignKind(kind)) return offerTrades.filter((trade) => trade === "design");
  if (kind === "construction") return offerTrades.filter((trade) => trade === "boq");
  return offerTrades.filter((trade) => trade !== "design" && trade !== "boq");
}

export function priceById(id: string) {
  return priceList.find((item) => item.id === id) ?? null;
}

export function defaultShape(unit: OfferUnit, trade?: OfferTrade): MeasureShape {
  if (trade === "boq" || unit === "m3" || unit === "kg" || unit === "nr" || unit === "item") return "direct";
  if (unit === "pcs" || unit === "set") return "count";
  if (unit === "lm") return "length";
  return trade === "paint" ? "walls" : "area";
}

export function inferShape(unit: OfferUnit, trade: OfferTrade | undefined, h: number | null, stored: unknown): MeasureShape {
  if (stored === "direct" || trade === "boq" || unit === "m3" || unit === "kg" || unit === "nr" || unit === "item") return "direct";
  if (unit === "pcs" || unit === "set") return "count";
  if (unit === "lm") return "length";
  if (stored === "walls" || stored === "area") return stored;
  if (h && h > 0) return "walls";
  return trade === "paint" ? "walls" : "area";
}

export function measureQty(shape: MeasureShape, l: number | null, w: number | null, h: number | null, qty: number) {
  const length = l ?? 0;
  const width = w ?? 0;
  const height = h ?? 0;
  if (shape === "walls") return length > 0 && width > 0 && height > 0 ? round1(2 * (length + width) * height) : 0;
  if (shape === "area") return length > 0 && width > 0 ? round1(length * width) : 0;
  if (shape === "length") return round1(length);
  return round1(qty); // count and direct
}

export function lineQty(line: Pick<OfferLine, "shape" | "l" | "w" | "h" | "qty" | "units">) {
  return round1(measureQty(line.shape, line.l, line.w, line.h, line.qty) * Math.max(1, line.units || 1));
}

type CostedLine = Pick<OfferLine, "shape" | "l" | "w" | "h" | "qty" | "rate" | "units" | "wastePct" | "profitPct" | "manpower">;

/** Cost of a row and, for construction BOQ rows, its waste, manpower and profit. */
export function lineCosting(line: CostedLine) {
  const cost = lineQty(line) * line.rate;
  const waste = cost * (line.wastePct ?? 0) / 100;
  const manpower = line.manpower ?? 0;
  const profit = (cost + waste + manpower) * (line.profitPct ?? 0) / 100;
  return { cost, waste, manpower, profit, amount: Math.round(cost + waste + manpower + profit) };
}

/** A row's amount in whole QAR (cost, plus waste, manpower and profit on construction BOQ rows). */
export function lineAmount(line: CostedLine) {
  return lineCosting(line).amount;
}

/** Total built area of an architecture offer (m² × units over its rows). */
export function totalArea(lines: OfferLine[]) {
  return round1(lines.filter((line) => line.unit === "m2").reduce((sum, line) => sum + lineQty(line), 0));
}

/** The offer total is always calculated from its measured rows, less the discount (% or QAR). */
export function offerTotals(lines: OfferLine[], discount: OfferDiscount) {
  const subtotal = lines.reduce((sum, line) => sum + lineAmount(line), 0);
  const off = discount.type === "amount"
    ? Math.min(Math.max(0, Math.round(discount.value)), subtotal)
    : Math.round(subtotal * Math.min(Math.max(0, discount.value), 100) / 100);
  return { subtotal, discount: off, total: subtotal - off };
}


export function paymentAmounts(total: number, payments: { percent: number }[]) {
  const amounts = payments.map((payment) => Math.round(total * payment.percent / 100));
  const drift = total - amounts.reduce((sum, amount) => sum + amount, 0);
  if (amounts.length > 0) amounts[amounts.length - 1] += drift;
  return amounts;
}

export function offerProblem(input: OfferInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.issuedOn)) return "off.needDate";
  if (input.phone && !/^[0-9+\s()-]{6,20}$/.test(input.phone)) return "off.needPhone";
  if (input.clientId && !/^[0-9]{5,20}$/.test(input.clientId)) return "off.needId";
  if (input.lines.some((line) => !Number.isInteger(line.units) || line.units < 1 || line.units > 999)) return "off.needUnits";
  if (!discountTypes.includes(input.discount.type) || !Number.isInteger(input.discount.value) || input.discount.value < 0) return "off.badDiscount";
  if (input.discount.type === "percent" && input.discount.value > 100) return "off.badDiscount";
  if (input.discount.type === "amount" && input.discount.value > offerTotals(input.lines, { type: "percent", value: 0 }).subtotal) return "off.discountHigh";
  if (input.kind === "construction") {
    const { men, manRate } = input.costing;
    const percent = (value: number | undefined) => value === undefined || (Number.isFinite(value) && value >= 0 && value <= 100);
    if (input.lines.some((line) => !percent(line.wastePct) || !percent(line.profitPct))) return "off.badCostPct";
    if (input.lines.some((line) => line.manpower !== undefined && (!Number.isFinite(line.manpower) || line.manpower < 0 || line.manpower > 100_000_000))) return "off.badManpower";
    if (!Number.isInteger(men) || men < 0 || men > 999 || !Number.isFinite(manRate) || manRate < 0 || manRate > 100_000) return "off.badManpower";
    if (!input.lines.some((line) => line.trade === "boq" && line.qty > 0)) return "off.needQty";
    if (!Number.isInteger(input.durationMonths) || input.durationMonths < 1 || input.durationMonths > 120) return "off.needDuration";
  }
  if (input.stages.some((stage) => !stage.titleEn.trim() || !stage.titleAr.trim())) return "off.needStage";
  if (input.payments.length < 1 || input.payments.length > 6) return "off.needPay";
  if (input.payments.some((payment) => !payment.labelEn.trim() || !payment.labelAr.trim() || !payment.whenEn.trim() || !payment.whenAr.trim())) return "off.needPay";
  const percents = input.payments.reduce((sum, payment) => sum + payment.percent, 0);
  if (input.payments.some((payment) => !Number.isInteger(payment.percent) || payment.percent < 0 || payment.percent > 100) || percents !== 100) return "off.payTotal";
  return "";
}

export function offerTitle(offer: { clientEn: string; clientAr: string }, locale: string) {
  if (locale === "ar") return offer.clientAr || offer.clientEn;
  return offer.clientEn || offer.clientAr;
}

export function workTitle(line: { workEn: string; workAr: string }, locale: string) {
  if (locale === "ar") return line.workAr || line.workEn;
  return line.workEn || line.workAr;
}

export function roomTitle(line: { roomEn: string; roomAr: string }, locale: string) {
  if (locale === "ar") return line.roomAr || line.roomEn;
  return line.roomEn || line.roomAr;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function dim(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
}

export function mapOffer(id: string, data: Record<string, unknown>): Offer | null {
  const status = offerStatuses.find((item) => item === data.status) ?? "draft";
  const number = text(data.number);
  const clientEn = text(data.clientEn);
  if (!number || !clientEn) return null;
  const lines = Array.isArray(data.lines) ? data.lines.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const price = priceById(text(row.priceId));
    const unit = offerUnits.find((entry) => entry === row.unit) ?? price?.unit;
    const trade = offerTrades.find((entry) => entry === row.trade) ?? price?.trade;
    // Design lines (total area only) have no area name
    if (!unit || !trade || (!text(row.roomEn) && trade !== "design") || !text(row.workEn)) return [];
    const rate = typeof row.rate === "number" && row.rate >= 0 ? row.rate : price?.rate ?? 0;
    const storedQty = typeof row.qty === "number" && row.qty >= 0 ? row.qty : 0;
    return [{
      roomEn: text(row.roomEn),
      roomAr: text(row.roomAr),
      priceId: price?.id ?? text(row.priceId),
      workEn: text(row.workEn),
      workAr: text(row.workAr),
      trade,
      l: dim(row.l),
      w: dim(row.w),
      h: dim(row.h),
      qty: storedQty,
      unit,
      shape: inferShape(unit, trade, dim(row.h), row.shape),
      rate,
      units: typeof row.units === "number" && Number.isInteger(row.units) && row.units >= 1 ? row.units : 1,
      ...(trade === "boq" ? { wastePct: amount(row.wastePct), profitPct: amount(row.profitPct), manpower: amount(row.manpower) } : {}),
    }];
  }) : [];
  return {
    id,
    number,
    clientEn,
    clientAr: text(data.clientAr),
    phone: text(data.phone),
    clientId: text(data.clientId),
    addressEn: text(data.addressEn),
    addressAr: text(data.addressAr),
    capacityEn: text(data.capacityEn),
    capacityAr: text(data.capacityAr),
    projectEn: text(data.projectEn),
    projectAr: text(data.projectAr),
    reference: text(data.reference),
    kind: storedKind(data.kind),
    projectId: text(data.projectId),
    issuedOn: /^\d{4}-\d{2}-\d{2}$/.test(text(data.issuedOn)) ? text(data.issuedOn) : "",
    scopeEn: text(data.scopeEn),
    scopeAr: text(data.scopeAr),
    stages: mapStages(data.stages),
    payments: mapPayments(data.payments),
    status,
    discount: mapDiscount(data.discount, data.discountPct),
    validUntil: /^\d{4}-\d{2}-\d{2}$/.test(text(data.validUntil)) ? text(data.validUntil) : "",
    lines,
    basement: data.basement === true,
    costing: mapCosting(data.costing),
    durationMonths: typeof data.durationMonths === "number" && Number.isInteger(data.durationMonths) && data.durationMonths > 0 ? data.durationMonths : 0,
  };
}

function amount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function mapCosting(value: unknown): OfferCosting {
  const stored = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const number = (item: unknown, fallback: number) => (typeof item === "number" && Number.isFinite(item) && item >= 0 ? item : fallback);
  return {
    men: Math.round(number(stored.men, 0)),
    manRate: number(stored.manRate, defaultManRate),
  };
}

/** Offers saved before the discount type existed stored only a percentage in discountPct. */
function mapDiscount(value: unknown, legacyPct: unknown): OfferDiscount {
  const stored = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  const type = discountTypes.find((item) => item === stored?.type);
  if (stored && type) return { type, value: typeof stored.value === "number" && stored.value >= 0 ? stored.value : 0 };
  return { type: "percent", value: typeof legacyPct === "number" ? legacyPct : 0 };
}

function mapStages(value: unknown): OfferStage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const titleEn = text(row.titleEn);
    const titleAr = text(row.titleAr);
    if (!titleEn || !titleAr) return [];
    return [{ titleEn, titleAr, detailEn: text(row.detailEn), detailAr: text(row.detailAr) }];
  }).slice(0, 8);
}

function mapPayments(value: unknown): OfferPayment[] {
  if (!Array.isArray(value) || value.length === 0) return defaultPayments();
  const rows = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const labelEn = text(row.labelEn);
    const labelAr = text(row.labelAr);
    const whenEn = text(row.whenEn);
    const whenAr = text(row.whenAr);
    const percent = row.percent;
    if (!labelEn || !labelAr || !whenEn || !whenAr || typeof percent !== "number" || !Number.isInteger(percent)) return [];
    return [{ labelEn, labelAr, whenEn, whenAr, percent }];
  });
  return rows.length > 0 ? rows.slice(0, 6) : defaultPayments();
}
