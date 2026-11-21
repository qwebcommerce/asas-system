import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DISCIPLINES, otherLocale } from "@/components/site/content";
import { PillIcon } from "@/components/site/icons";
import { siteMetadata } from "@/components/site/page-text";
import { Photo, type PhotoName } from "@/components/site/photo";
import { richTags } from "@/components/site/rich";
import { CtaBand, PageHero, Steps } from "@/components/site/sections";
import { SiteEffects } from "@/components/site/site-effects";
import { SiteFooter } from "@/components/site/site-footer";
import { consultationHref, SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return siteMetadata(locale as Locale, "services");
}

const ROW_PHOTOS: Record<(typeof DISCIPLINES)[number], PhotoName> = {
  plans: "row-plans",
  construction: "row-construction",
  interior: "row-interior",
  finishing: "row-finishing",
  furniture: "row-furniture",
};

type Row = { kicker: string; alt: string; body: string; points: string[]; cta: string };

export default async function ServicesPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "site" });
  const other = otherLocale(locale);
  const rows = t.raw("servicesPage.rows") as Record<string, Row>;

  return (
    <>
      <SiteHeader locale={locale} current="services" />
      <main>
        <PageHero
          locale={locale}
          label={t("servicesPage.label")}
          lines={t.raw("servicesPage.lines") as string[]}
          alt={t("servicesPage.alt")}
          intro={t("servicesPage.intro")}
          photo="services-hero"
          photoAlt={t("servicesPage.heroAlt")}
          note={t("servicesPage.note")}
        />

        <nav className="svc-index" aria-label={t("servicesPage.indexLabel")}>
          <div className="wrap">
            <ul>
              {DISCIPLINES.map((key, i) => (
                <li key={key}>
                  <a href={`#${key}`}><small>{String(i + 1).padStart(2, "0")}</small>{t(`servicesPage.names.${key}`)}</a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {DISCIPLINES.map((key, i) => {
          const row = rows[key];
          return (
            <section className={`svc-row${i % 2 ? " svc-row--flip" : ""}`} id={key} key={key}>
              <div className="wrap">
                <figure className={`photo kb${i % 2 ? "" : " kb--alt"} svc-row__photo reveal`}>
                  <Photo name={ROW_PHOTOS[key]} alt={t(`servicesPage.names.${key}`)} sizes="(max-width: 1024px) 100vw, 640px" />
                </figure>
                <div className="reveal">
                  <p className="svc-row__kicker"><span>{row.kicker}</span><span className="alt" lang={other}>{row.alt}</span></p>
                  <h2 className="display">{t(`servicesPage.names.${key}`)}</h2>
                  <p className="svc-row__body">{row.body}</p>
                  <ol>
                    {row.points.map((point, n) => (
                      <li key={point}><small>{String(n + 1).padStart(2, "0")}</small>{point}</li>
                    ))}
                  </ol>
                  <Link className="pill pill--dark" href={consultationHref(locale)}>
                    {row.cta}
                    <PillIcon />
                  </Link>
                </div>
              </div>
            </section>
          );
        })}

        <Steps title={t.rich("steps.title", richTags)} steps={t.raw("steps.items") as [string, string][]} />

        <CtaBand locale={locale} title={t("servicesPage.ctaTitle")} text={t("servicesPage.ctaText")} button={t("book")} />
      </main>
      <SiteFooter locale={locale} current="services" />
      <SiteEffects />
    </>
  );
}
