export const offerStatuses = ["draft", "sent", "accepted", "rejected", "expired"] as const;
export const offerTrades = ["paint", "gyp", "floor", "kitchen"] as const;
export const offerUnits = ["m2", "lm", "pcs", "set"] as const;

export type OfferStatus = (typeof offerStatuses)[number];
export type OfferTrade = (typeof offerTrades)[number];
export type OfferUnit = (typeof offerUnits)[number];

export type PriceItem = {
  id: string;
  trade: OfferTrade;
  nameEn: string;
  nameAr: string;
  unit: OfferUnit;
  rate: number;
};

export const priceList: PriceItem[] = [
  { id: "paint", trade: "paint", nameEn: "Painting", nameAr: "دهان", unit: "m2", rate: 28 },
  { id: "gyp", trade: "gyp", nameEn: "Gypsum ceiling", nameAr: "سقف جبس", unit: "m2", rate: 95 },
  { id: "floor", trade: "floor", nameEn: "Porcelain flooring", nameAr: "أرضية بورسلان", unit: "m2", rate: 165 },
  { id: "kitchen", trade: "kitchen", nameEn: "Kitchen cabinets", nameAr: "خزائن المطبخ", unit: "lm", rate: 2400 },
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
  rate: number;
};

export type Offer = {
  id: string;
  number: string;
  clientEn: string;
  clientAr: string;
  projectEn: string;
  projectAr: string;
  status: OfferStatus;
  discountPct: number;
  validUntil: string;
  lines: OfferLine[];
};

export type OfferInput = {
  clientEn: string;
  clientAr: string;
  projectEn: string;
  projectAr: string;
  status: OfferStatus;
  discountPct: number;
  validUntil: string;
  lines: OfferLine[];
};

export function priceById(id: string) {
  return priceList.find((item) => item.id === id) ?? null;
}

export function measureQty(unit: OfferUnit, l: number | null, w: number | null, h: number | null, qty: number) {
  const length = l ?? 0;
  const width = w ?? 0;
  const height = h ?? 0;
  if (unit === "m2") {
    if (height > 0 && length > 0 && width > 0) return round1(2 * (length + width) * height);
    if (length > 0 && width > 0) return round1(length * width);
    return 0;
  }
  if (unit === "lm") return round1(length);
  return round1(qty);
}

export function lineAmount(line: Pick<OfferLine, "unit" | "l" | "w" | "h" | "qty" | "rate">) {
  return Math.round(measureQty(line.unit, line.l, line.w, line.h, line.qty) * line.rate);
}

export function offerTotals(lines: OfferLine[], discountPct: number) {
  const subtotal = lines.reduce((sum, line) => sum + lineAmount(line), 0);
  const discount = Math.round(subtotal * discountPct / 100);
  return { subtotal, discount, total: subtotal - discount };
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
      rate,
    }];
  }) : [];
  return {
    id,
    number,
    clientEn,
    clientAr: text(data.clientAr),
    projectEn: text(data.projectEn),
    projectAr: text(data.projectAr),
    status,
    discountPct: typeof data.discountPct === "number" ? data.discountPct : 0,
    validUntil: /^\d{4}-\d{2}-\d{2}$/.test(text(data.validUntil)) ? text(data.validUntil) : "",
    lines,
  };
}
