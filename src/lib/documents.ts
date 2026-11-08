import { qatarToday } from "@/lib/hr";

export const documentKinds = ["contract", "drawing", "permit", "cert", "policy"] as const;

export type DocumentKind = (typeof documentKinds)[number];

export type LibraryDocument = {
  id: string;
  titleEn: string;
  titleAr: string;
  kind: DocumentKind;
  projectEn: string;
  projectAr: string;
  hasExpiry: boolean;
  expiresOn: string;
  hasFile: boolean;
  contentType: string;
  size: number;
  version: number;
  createdBy: string;
};

export type LibraryDocumentInput = {
  titleEn: string;
  titleAr: string;
  kind: DocumentKind;
  projectEn: string;
  projectAr: string;
  hasExpiry: boolean;
  expiresOn: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function day(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function utcDay(iso: string) {
  const [year, month, date] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, date);
}

export function daysUntil(iso: string) {
  if (!day(iso)) return null;
  return Math.round((utcDay(iso) - utcDay(qatarToday())) / 86_400_000);
}

export function isExpiringSoon(iso: string) {
  const days = daysUntil(iso);
  return days !== null && days >= 0 && days <= 30;
}

export function documentTitle(document: { titleEn: string; titleAr: string }, locale: string) {
  if (locale === "ar") return document.titleAr || document.titleEn;
  return document.titleEn || document.titleAr;
}

export function mapLibraryDocument(id: string, data: Record<string, unknown>): LibraryDocument | null {
  const kind = documentKinds.find((item) => item === data.kind);
  const titleEn = text(data.titleEn);
  if (!kind || !titleEn) return null;
  const expiresOn = day(data.expiresOn);
  return {
    id,
    titleEn,
    titleAr: text(data.titleAr),
    kind,
    projectEn: text(data.projectEn),
    projectAr: text(data.projectAr),
    hasExpiry: data.hasExpiry === true && Boolean(expiresOn),
    expiresOn,
    hasFile: text(data.storagePath).length > 0,
    contentType: text(data.contentType),
    size: typeof data.size === "number" ? data.size : 0,
    version: typeof data.version === "number" && data.version > 0 ? data.version : 1,
    createdBy: text(data.createdBy),
  };
}
