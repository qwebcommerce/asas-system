import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { otherLocale, SITE_PHONE_HREF, sitePath } from "./content";
import { PhoneIcon, PillIcon } from "./icons";
import { Logo } from "./photo";

export type SitePage = "home" | "blogs" | "documents";

/** Path of each page without the locale, used for the language switch. */
export const PAGE_PATH: Record<SitePage, string> = { home: "", blogs: "/blogs", documents: "/resources" };

export async function SiteHeader({ locale, current }: { locale: Locale; current: SitePage }) {
  const t = await getTranslations({ locale, namespace: "site" });
  const home = (hash: string) => sitePath(locale, "", hash);
  const other = otherLocale(locale);

  return (
    <header className="site-header">
      <div className="site-header__bar">
        <nav className="nav" aria-label={t("nav.main")}>
          <Link className="logo" href={sitePath(locale)}>
            <Logo alt={t("logoAlt")} />
          </Link>
          <div className="nav__links">
            <Link href={sitePath(locale)} aria-current={current === "home" ? "page" : undefined}>{t("nav.home")}</Link>
            <Link href={home("about")}>{t("nav.about")}</Link>
            <Link href={home("services")}>{t("nav.services")}</Link>
            <Link href={home("work")}>{t("nav.work")}</Link>
            <Link href={sitePath(locale, "/blogs")} aria-current={current === "blogs" ? "page" : undefined}>{t("nav.blogs")}</Link>
            <Link href={sitePath(locale, "/resources")} aria-current={current === "documents" ? "page" : undefined}>{t("nav.documents")}</Link>
            <Link href={home("contact")}>{t("nav.contact")}</Link>
          </div>
        </nav>
        <div className="header-actions">
          <div className="lang">
            <b>{t("lang.current")}</b>
            <i />
            <a className="alt" href={sitePath(other, PAGE_PATH[current])} lang={other} hrefLang={other} aria-label={t("lang.otherLabel")}>
              {t("lang.other")}
            </a>
          </div>
          <a className="phone" href={SITE_PHONE_HREF} dir="ltr">
            <PhoneIcon />
            {t("phone")}
          </a>
          <Link className="pill pill--dark" href={home("contact")}>
            {t("book")}
            <PillIcon />
          </Link>
        </div>
      </div>
    </header>
  );
}
