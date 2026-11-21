import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { otherLocale, SITE_PHONE_HREF, sitePath } from "./content";
import { PhoneIcon, PillIcon } from "./icons";
import { MobileNav } from "./mobile-nav";
import { Logo } from "./photo";

export type SitePage = "home" | "about" | "services" | "work" | "contact" | "blogs" | "documents";

/** Path of each page without the locale, used for links and the language switch. */
export const PAGE_PATH: Record<SitePage, string> = {
  home: "",
  about: "/about",
  services: "/services",
  work: "/our-work",
  contact: "/contact",
  blogs: "/blogs",
  documents: "/resources",
};

/** Menu order, as in the design. */
const MENU: SitePage[] = ["home", "about", "services", "work", "blogs", "documents", "contact"];

/** "Book a consultation" goes to the form on the Contact page. */
export function consultationHref(locale: Locale) {
  return sitePath(locale, PAGE_PATH.contact, "consultation");
}

export async function SiteHeader({ locale, current, path }: { locale: Locale; current: SitePage; path?: string }) {
  const t = await getTranslations({ locale, namespace: "site" });
  const other = otherLocale(locale);
  const otherHref = sitePath(other, path ?? PAGE_PATH[current]);
  const links = MENU.map((page) => ({ href: sitePath(locale, PAGE_PATH[page]), label: t(`nav.${page}`), current: current === page }));

  return (
    <header className="site-header">
      <div className="site-header__bar">
        <nav className="nav" aria-label={t("nav.main")}>
          <Link className="logo" href={sitePath(locale)}>
            <Logo alt={t("logoAlt")} />
          </Link>
          <div className="nav__links">
            {links.map((link) => (
              <Link key={link.href} href={link.href} aria-current={link.current ? "page" : undefined}>{link.label}</Link>
            ))}
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
          <Link className="pill pill--dark" href={consultationHref(locale)}>
            {t("book")}
            <PillIcon />
          </Link>
          <MobileNav
            links={links}
            language={{ current: t("lang.current"), other: t("lang.other"), otherHref, otherLang: other }}
            phone={{ href: SITE_PHONE_HREF, label: t("phone") }}
            cta={{ href: consultationHref(locale), label: t("book") }}
            labels={{ open: t("nav.openMenu"), close: t("nav.closeMenu"), menu: t("nav.menu"), language: t("nav.language") }}
          />
        </div>
      </div>
    </header>
  );
}
