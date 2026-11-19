/*
 * Public website content managed from the system (Website module):
 * blog posts (`blogPosts`) and downloadable documents (`siteDocuments`).
 * Shared by the system screens, the server actions and the public pages.
 */

export const blogCategories = ["planning", "construction", "interiors", "materials", "architecture", "finishing"] as const;
export type BlogCategory = (typeof blogCategories)[number];

export const siteDocCategories = ["company", "services", "planning"] as const;
export type SiteDocCategory = (typeof siteDocCategories)[number];

export const publishStates = ["published", "draft"] as const;
export type PublishState = (typeof publishStates)[number];

/** Limits used by the forms (client) and the server actions alike. */
export const LIMITS = {
  title: 140,
  excerpt: 320,
  body: 20_000,
  docDesc: 240,
  fileName: 80,
  alt: 160,
  readMinutes: 60,
} as const;

/** Public documents must be PDFs of at most 10 MB (kept in step with storage.rules). */
export const siteDocBytes = 10 * 1024 * 1024;

/**
 * PDFs go from the browser straight to Storage under <stagingFolder>/<uid>/<id>.pdf
 * (too large to pass through the app's server), then the server checks and moves them.
 */
export const stagingFolder = "website/staging";

export type BlogPost = {
  id: string;
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
  status: PublishState;
  featured: boolean;
  coverAltEn: string;
  coverAltAr: string;
  hasCover: boolean;
  coverType: string;
  createdBy: string;
};

export type BlogPostInput = Omit<BlogPost, "id" | "slug" | "hasCover" | "coverType" | "createdBy">;

export type SiteDocument = {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  category: SiteDocCategory;
  fileName: string;
  status: PublishState;
  hasFile: boolean;
  size: number;
  order: number;
  createdBy: string;
};

export type SiteDocumentInput = Omit<SiteDocument, "id" | "hasFile" | "size" | "createdBy">;

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function isDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function mapBlogPost(id: string, data: Record<string, unknown>): BlogPost | null {
  const category = blogCategories.find((item) => item === data.category);
  const titleEn = text(data.titleEn);
  const slug = text(data.slug);
  if (!category || !titleEn || !slug) return null;
  const publishedOn = text(data.publishedOn);
  return {
    id,
    slug,
    titleEn,
    titleAr: text(data.titleAr),
    excerptEn: text(data.excerptEn),
    excerptAr: text(data.excerptAr),
    bodyEn: text(data.bodyEn),
    bodyAr: text(data.bodyAr),
    category,
    readMinutes: typeof data.readMinutes === "number" && data.readMinutes > 0 ? Math.round(data.readMinutes) : 1,
    publishedOn: isDay(publishedOn) ? publishedOn : "",
    status: data.status === "published" ? "published" : "draft",
    featured: data.featured === true,
    coverAltEn: text(data.coverAltEn),
    coverAltAr: text(data.coverAltAr),
    hasCover: text(data.coverPath).length > 0,
    coverType: text(data.coverType),
    createdBy: text(data.createdBy),
  };
}

export function mapSiteDocument(id: string, data: Record<string, unknown>): SiteDocument | null {
  const category = siteDocCategories.find((item) => item === data.category);
  const titleEn = text(data.titleEn);
  if (!category || !titleEn) return null;
  return {
    id,
    titleEn,
    titleAr: text(data.titleAr),
    descEn: text(data.descEn),
    descAr: text(data.descAr),
    category,
    fileName: text(data.fileName),
    status: data.status === "published" ? "published" : "draft",
    hasFile: text(data.storagePath).length > 0,
    size: typeof data.size === "number" ? data.size : 0,
    order: typeof data.order === "number" ? data.order : 0,
    createdBy: text(data.createdBy),
  };
}

/** Pick the text for a locale, falling back to the other language. */
export function pick(en: string, ar: string, locale: string) {
  return locale === "ar" ? ar || en : en || ar;
}

/** URL slug from an English title: "A Home Shaped by Light!" -> "a-home-shaped-by-light" */
export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Estimated reading time at ~200 words a minute. */
export function estimateMinutes(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(LIMITS.readMinutes, Math.max(1, Math.round(words / 200)));
}

/**
 * Download name for a public PDF (without extension).
 * Letters in any language, digits, spaces, dots, hyphens and underscores; 3-80 characters.
 */
export function fileNameProblem(name: string): "web.fileNameRequired" | "web.fileNameChars" | "web.fileNameLength" | null {
  const value = stripPdf(name.trim());
  if (!value) return "web.fileNameRequired";
  if (value.length < 3 || value.length > LIMITS.fileName) return "web.fileNameLength";
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(value)) return "web.fileNameChars";
  return null;
}

export function stripPdf(name: string) {
  return name.replace(/\.pdf$/i, "");
}

/** Suggest a download name from an uploaded file: "Company Profile (v3).pdf" -> "Company Profile v3" */
export function suggestFileName(original: string) {
  return stripPdf(original)
    .replace(/[^\p{L}\p{N} ._-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LIMITS.fileName);
}

export function sitePdfProblem(type: string, size: number, name: string): "web.pdfOnly" | "web.pdfSize" | null {
  const isPdf = type === "application/pdf" || ((!type || type === "application/octet-stream") && /\.pdf$/i.test(name));
  if (!isPdf) return "web.pdfOnly";
  if (!Number.isFinite(size) || size <= 0 || size > siteDocBytes) return "web.pdfSize";
  return null;
}

export function formatBytes(size: number, locale: string) {
  const mb = size / (1024 * 1024);
  const value = mb >= 1 ? mb : size / 1024;
  const unit = mb >= 1 ? (locale === "ar" ? "م.ب" : "MB") : locale === "ar" ? "ك.ب" : "KB";
  return `${new Intl.NumberFormat(locale === "ar" ? "ar-QA-u-nu-latn" : "en-GB", { maximumFractionDigits: 1 }).format(value)} ${unit}`;
}

/** Body text blocks: blank-line separated paragraphs, "## " subheadings and "> " quotes. */
export type BodyBlock = { kind: "p" | "h2" | "quote"; text: string };

export function bodyBlocks(body: string): BodyBlock[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      if (chunk.startsWith("## ")) return { kind: "h2" as const, text: chunk.slice(3).trim() };
      if (chunk.startsWith("> ")) return { kind: "quote" as const, text: chunk.replace(/^>\s?/gm, "").trim() };
      return { kind: "p" as const, text: chunk.replace(/\s*\n\s*/g, " ") };
    });
}
