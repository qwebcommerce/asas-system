import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { otherLocale, SITE_PHONE_HREF, sitePath } from "./content";
import { PhoneIcon, PillIcon } from "./icons";
import { MobileNav } from "./mobile-nav";
import { Logo } from "./photo";

export type SitePage = "home" | "blogs" | "documents";

/** Path of each page without the locale, used for the language switch. */
export const PAGE_PATH: Record<SitePage, string> = { home: "", blogs: "/blogs", documents: "/resources" };

export async function SiteHeader({ locale, current, path }: { locale: Locale; current: SitePage; path?: string }) {
  const t = await getTranslations({ locale, namespace: "site" });
  const home = (hash: string) => sitePath(locale, "", hash);
  const other = otherLocale(locale);
  const otherHref = sitePath(other, path ?? PAGE_PATH[current]);
  const drawerLinks = [
    { href: sitePath(locale), label: t("nav.home"), current: current === "home" },
    { href: home("about"), label: t("nav.about"), current: false },
    { href: home("services"), label: t("nav.services"), current: false },
    { href: home("work"), label: t("nav.work"), current: false },
    { href: sitePath(locale, "/blogs"), label: t("nav.blogs"), current: current === "blogs" },
    { href: sitePath(locale, "/resources"), label: t("nav.documents"), current: current === "documents" },
    { href: home("contact"), label: t("nav.contact"), current: false },
  ];

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
            <a className="alt" href={otherHref} lang={other} hrefLang={other} aria-label={t("lang.otherLabel")}>
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
          <MobileNav
            links={drawerLinks}
            language={{ current: t("lang.current"), other: t("lang.other"), otherHref, otherLang: other }}
            phone={{ href: SITE_PHONE_HREF, label: t("phone") }}
            cta={{ href: home("contact"), label: t("book") }}
            labels={{ open: t("nav.openMenu"), close: t("nav.closeMenu"), menu: t("nav.menu"), language: t("nav.language") }}
          />
        </div>
      </div>
    </header>
  );
}
