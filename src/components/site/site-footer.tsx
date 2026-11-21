import Link from "next/link";
import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { mailto, otherLocale, SITE_EMAIL, SITE_PHONE_HREF, sitePath } from "./content";
import { Logo } from "./photo";
import { PAGE_PATH, type SitePage } from "./site-header";

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function SiteFooter({ locale, current, path }: { locale: Locale; current: SitePage; path?: string }) {
  const t = await getTranslations({ locale, namespace: "site" });
  const year = await currentYear();
  const home = (hash: string) => sitePath(locale, "", hash);
  const other = otherLocale(locale);

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer__top">
          <a className="footer__email" href={mailto()}>{SITE_EMAIL}</a>
          <p className="footer__tag">
            {t("footer.tag")}
            <span className="alt" lang={other}>{t("footer.tagAlt")}</span>
          </p>
        </div>
        <div className="footer__cols">
          <Link className="logo" href={sitePath(locale)}>
            <Logo alt={t("logoAlt")} />
          </Link>
          <div>
            <h4>{t("footer.navigate")}</h4>
            <ul>
              <li><Link href={sitePath(locale)}>{t("nav.home")}</Link></li>
              <li><Link href={home("services")}>{t("nav.services")}</Link></li>
              <li><Link href={sitePath(locale, "/our-work")}>{t("nav.work")}</Link></li>
              <li><Link href={home("about")}>{t("nav.about")}</Link></li>
              <li><Link href={home("contact")}>{t("nav.contact")}</Link></li>
              <li>
                <Link href={sitePath(locale, "/blogs")}>{t("nav.blogs")}</Link> &nbsp;·&nbsp;{" "}
                <Link href={sitePath(locale, "/resources")}>{t("nav.documents")}</Link>
              </li>
              <li><a href={sitePath(locale, "/sign-in")}>{t("nav.signIn")}</a></li>
            </ul>
          </div>
          <div>
            <h4>{t("footer.services")}</h4>
            <ul>
              {(t.raw("footer.serviceList") as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>{t("footer.visit")}</h4>
            <ul>
              <li>{t("footer.address1")}</li>
              <li>{t("footer.address2")}</li>
              <li><a href={SITE_PHONE_HREF} dir="ltr">{t("phone")}</a></li>
              <li>{t("footer.hours")}</li>
            </ul>
          </div>
        </div>
        <div className="footer__bottom">
          <span>{t("footer.copyright", { year })}</span>
          <span>
            {t("lang.current")} ·{" "}
            <a className="alt" href={sitePath(other, path ?? PAGE_PATH[current])} lang={other} hrefLang={other}>{t("lang.other")}</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
