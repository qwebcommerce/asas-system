import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { sitePath } from "@/components/site/content";
import { FilterButtons } from "@/components/site/filter-buttons";
import { PillIcon } from "@/components/site/icons";
import { siteMetadata } from "@/components/site/page-text";
import { Photo, type PhotoName } from "@/components/site/photo";
import { richTags } from "@/components/site/rich";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteEffects } from "@/components/site/site-effects";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return siteMetadata(locale as Locale, "blogs");
}

const ARTICLE_PHOTOS: PhotoName[] = ["article-office", "article-bathroom", "article-staircase", "article-villa", "article-dining", "article-wood"];
const READ_MINUTES = [5, 4, 6, 4, 5, 4];
const FILTERS = ["all", "planning", "construction", "interiors", "materials"] as const;

export default async function BlogsPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "site" });
  const articles = t.raw("blogs.articles") as [string, string, string][];
  const contact = sitePath(locale, "", "contact");

  return (
    <>
      <SiteHeader locale={locale} current="blogs" />
      <main>
        {/* Journal hero */}
        <section className="page-hero journal-hero">
          <div className="journal-hero__copy">
            <p className="label">{t("blogs.label")}</p>
            <h1 className="display">{t.rich("blogs.title", richTags)}</h1>
            <p className="journal-hero__intro">{t("blogs.intro")}</p>
          </div>
          <figure className="journal-hero__photo" style={{ margin: 0 }}>
            <Photo name="journal-hero" alt={t("blogs.heroAlt")} sizes="(max-width: 1024px) 100vw, 600px" eager />
            <figcaption className="journal-hero__note">{t("blogs.heroNote")}</figcaption>
          </figure>
        </section>

        {/* Featured story */}
        <section className="featured">
          <div className="wrap featured__grid">
            <div className="featured__photo reveal">
              <Photo name="journal-featured" alt={t("blogs.featuredAlt")} sizes="(max-width: 1024px) 100vw, 60vw" />
            </div>
            <div className="featured__text reveal">
              <p className="label">{t("blogs.featuredLabel")}</p>
              <h2 className="display">{t.rich("blogs.featuredTitle", richTags)}</h2>
              <p className="featured__desc">{t("blogs.featuredDesc")}</p>
              <p className="featured__meta">{t("blogs.featuredMeta")}</p>
              <Link className="pill pill--dark" href="#stories">
                {t("blogs.read")}
                <PillIcon />
              </Link>
            </div>
          </div>
        </section>

        {/* Article collection */}
        <section className="collection" id="stories">
          <div className="wrap">
            <h2 className="display reveal">{t("blogs.collection")}</h2>
            <FilterButtons
              scope=".articles"
              buttonClass="filter"
              label={t("blogs.filterLabel")}
              options={FILTERS.map((key) => ({ key, label: t(`blogs.filters.${key}`) }))}
            />
            <div className="articles">
              {articles.map(([cat, title, alt], i) => (
                <div className="article reveal" data-cat={cat} key={title}>
                  <div className="article__photo">
                    <Photo name={ARTICLE_PHOTOS[i]} alt={alt} sizes="(max-width: 1024px) 100vw, 33vw" />
                  </div>
                  <p className="label">{t(`blogs.filters.${cat}`)}</p>
                  <h3>{title}</h3>
                  <p className="article__time">{t("blogs.minRead", { n: READ_MINUTES[i] })}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-band">
          <div className="wrap">
            <div>
              <h2 className="display">{t("blogs.ctaTitle")}</h2>
              <p>{t("blogs.ctaText")}</p>
            </div>
            <Link className="pill pill--light" href={contact}>
              {t("book")}
              <PillIcon />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} current="blogs" />
      <SiteEffects />
    </>
  );
}
