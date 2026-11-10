export const offerStatuses = ["draft", "sent", "accepted", "rejected", "expired"] as const;
export const offerTrades = ["paint", "gyp", "floor", "kitchen"] as const;
export const offerUnits = ["m2", "lm", "pcs", "set"] as const;
export const measureShapes = ["walls", "area", "length", "count"] as const;
export const offerKinds = ["finishing", "architecture"] as const;

export type OfferStatus = (typeof offerStatuses)[number];
export type OfferTrade = (typeof offerTrades)[number];
export type OfferUnit = (typeof offerUnits)[number];
export type MeasureShape = (typeof measureShapes)[number];
export type OfferKind = (typeof offerKinds)[number];

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

export const priceList: PriceItem[] = [
  { id: "paint", trade: "paint", nameEn: "Painting", nameAr: "دهان", unit: "m2", shape: "walls", rate: 28 },
  { id: "gyp", trade: "gyp", nameEn: "Gypsum ceiling", nameAr: "سقف جبس", unit: "m2", shape: "area", rate: 95 },
  { id: "floor", trade: "floor", nameEn: "Porcelain flooring", nameAr: "أرضية بورسلان", unit: "m2", shape: "area", rate: 165 },
  { id: "kitchen", trade: "kitchen", nameEn: "Kitchen cabinets", nameAr: "خزائن المطبخ", unit: "lm", shape: "length", rate: 2400 },
];

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
  issuedOn: string;
  areaFrom: number | null;
  areaTo: number | null;
  packageAmount: number;
  scopeEn: string;
  scopeAr: string;
  stages: OfferStage[];
  payments: OfferPayment[];
  status: OfferStatus;
  discountPct: number;
  validUntil: string;
  lines: OfferLine[];
};

export type OfferInput = Omit<Offer, "id" | "number">;

export function defaultPayments(): OfferPayment[] {
  return [
    { labelEn: "Down payment", labelAr: "الدفعة المقدمة", percent: 50, whenEn: "Upon signing this agreement", whenAr: "عند توقيع هذه الاتفاقية" },
    { labelEn: "Second payment", labelAr: "الدفعة الثانية", percent: 25, whenEn: "Upon completion of stage one", whenAr: "عند اكتمال المرحلة الأولى" },
    { labelEn: "Third payment", labelAr: "الدفعة الثالثة", percent: 15, whenEn: "Upon completion of stage two", whenAr: "عند اكتمال المرحلة الثانية" },
    { labelEn: "Final payment", labelAr: "الدفعة الأخيرة", percent: 10, whenEn: "Before the final stage submission", whenAr: "قبل تسليم المرحلة الأخيرة" },
  ];
}

export function architectureStages(): OfferStage[] {
  return [
    { titleEn: "Stage one", titleAr: "المرحلة الأولى", detailEn: "Architectural plans and elevation plans", detailAr: "المخططات المعمارية ومخططات الواجهات" },
    { titleEn: "Stage two", titleAr: "المرحلة الثانية", detailEn: "Structural and MEP plans", detailAr: "المخططات الإنشائية ومخططات الخدمات" },
    { titleEn: "Stage three", titleAr: "المرحلة الثالثة", detailEn: "3D renders", detailAr: "الإظهار الثلاثي الأبعاد" },
  ];
}

export function priceById(id: string) {
  return priceList.find((item) => item.id === id) ?? null;
}

export function defaultShape(unit: OfferUnit, trade?: OfferTrade): MeasureShape {
  if (unit === "pcs" || unit === "set") return "count";
  if (unit === "lm") return "length";
  return trade === "paint" ? "walls" : "area";
}

export function inferShape(unit: OfferUnit, trade: OfferTrade | undefined, h: number | null, stored: unknown): MeasureShape {
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
  return round1(qty);
}

export function lineAmount(line: Pick<OfferLine, "shape" | "l" | "w" | "h" | "qty" | "rate">) {
  return Math.round(measureQty(line.shape, line.l, line.w, line.h, line.qty) * line.rate);
}

export function offerTotals(lines: OfferLine[], discountPct: number, packageAmount = 0) {
  const subtotal = lines.reduce((sum, line) => sum + lineAmount(line), 0) + Math.max(0, packageAmount);
  const discount = Math.round(subtotal * discountPct / 100);
  return { subtotal, discount, total: subtotal - discount };
}

export function paymentAmounts(total: number, payments: { percent: number }[]) {
  const amounts = payments.map((payment) => Math.round(total * payment.percent / 100));
  const drift = total - amounts.reduce((sum, amount) => sum + amount, 0);
  if (amounts.length > 0) amounts[amounts.length - 1] += drift;
  return amounts;
}

function validArea(value: number | null) {
  return value === null || (Number.isInteger(value) && value >= 1 && value <= 1_000_000);
}

export function offerProblem(input: OfferInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.issuedOn)) return "off.needDate";
  if (input.phone && !/^[0-9+\s()-]{6,20}$/.test(input.phone)) return "off.needPhone";
  if (input.clientId && !/^[0-9]{5,20}$/.test(input.clientId)) return "off.needId";
  if (!validArea(input.areaFrom) || !validArea(input.areaTo)) return "off.needArea";
  if (input.areaFrom !== null && input.areaTo !== null && input.areaFrom > input.areaTo) return "off.needArea";
  if (!Number.isInteger(input.packageAmount) || input.packageAmount < 0 || input.packageAmount > 100_000_000) return "off.needPackage";
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
    if (!unit || !trade || !text(row.roomEn) || !text(row.workEn)) return [];
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
    kind: offerKinds.find((item) => item === data.kind) ?? "finishing",
    issuedOn: /^\d{4}-\d{2}-\d{2}$/.test(text(data.issuedOn)) ? text(data.issuedOn) : "",
    areaFrom: area(data.areaFrom),
    areaTo: area(data.areaTo),
    packageAmount: money(data.packageAmount),
    scopeEn: text(data.scopeEn),
    scopeAr: text(data.scopeAr),
    stages: mapStages(data.stages),
    payments: mapPayments(data.payments),
    status,
    discountPct: typeof data.discountPct === "number" ? data.discountPct : 0,
    validUntil: /^\d{4}-\d{2}-\d{2}$/.test(text(data.validUntil)) ? text(data.validUntil) : "",
    lines,
  };
}

function area(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 1_000_000 ? value : null;
}

function money(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100_000_000 ? value : 0;
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
