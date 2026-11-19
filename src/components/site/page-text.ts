import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import type { ConsultFormText } from "./consult-form";
import { DISCIPLINES, sitePath, type Discipline } from "./content";
import { PAGE_PATH, type SitePage } from "./site-header";

const META_KEYS: Record<SitePage, [string, string]> = {
  home: ["homeTitle", "homeDesc"],
  blogs: ["blogsTitle", "blogsDesc"],
  documents: ["docsTitle", "docsDesc"],
};

/** Title, description and EN/AR alternates for a public page. */
export async function siteMetadata(locale: Locale, page: SitePage): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "site.meta" });
  const [title, description] = META_KEYS[page];
  return {
    title: t(title),
    description: t(description),
    alternates: {
      canonical: sitePath(locale, PAGE_PATH[page]),
      languages: Object.fromEntries(routing.locales.map((l) => [l, sitePath(l, PAGE_PATH[page])])),
    },
    icons: { icon: "/site/logo.png" },
  };
}

/** Labels for the consultation form, passed to the client component as plain strings. */
export async function formText(locale: Locale): Promise<ConsultFormText> {
  const t = await getTranslations({ locale, namespace: "site" });
  const disciplines = Object.fromEntries(DISCIPLINES.map((k) => [k, t(`disciplines.${k}`)])) as Record<Discipline, string>;
  return {
    label: t("form.label"),
    name: t("form.name"),
    namePh: t("form.namePh"),
    phone: t("form.phone"),
    phonePh: t("form.phonePh"),
    help: t("form.help"),
    project: t("form.project"),
    projectPh: t("form.projectPh"),
    submit: t("form.submit"),
    sending: t("form.sending"),
    note: t("form.note"),
    thanks: t("form.thanks"),
    invalid: t("form.invalid"),
    failed: t("form.failed"),
    disciplines,
  };
}
