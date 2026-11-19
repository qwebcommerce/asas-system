import type { Locale } from "@/i18n/routing";

export const SITE_EMAIL = "info@asasqa.com";
export const SITE_PHONE_HREF = "tel:+97466111817";

/** Discipline keys used by the consultation form chips (also validated by the API). */
export const DISCIPLINES = ["plans", "construction", "interior", "finishing", "furniture"] as const;
export type Discipline = (typeof DISCIPLINES)[number];

/** Chips that start selected, as in the original design. */
export const DEFAULT_DISCIPLINES: Discipline[] = ["interior", "finishing"];

export function otherLocale(locale: Locale): Locale {
  return locale === "ar" ? "en" : "ar";
}

/** Path for a public page, e.g. sitePath("ar", "/blogs") -> "/ar/blogs" */
export function sitePath(locale: Locale, path = "", hash = "") {
  return `/${locale}${path}${hash ? `#${hash}` : ""}`;
}

export function mailto(subject?: string) {
  return subject ? `mailto:${SITE_EMAIL}?subject=${encodeURIComponent(subject)}` : `mailto:${SITE_EMAIL}`;
}
