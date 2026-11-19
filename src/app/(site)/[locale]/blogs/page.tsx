import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { sitePath } from "@/components/site/content";
import { FilterButtons } from "@/components/site/filter-buttons";
import { PillIcon } from "@/components/site/icons";
import { siteMetadata } from "@/components/site/page-text";
import { Photo } from "@/components/site/photo";
import { PostCard, PostImage } from "@/components/site/post-card";
import { richTags } from "@/components/site/rich";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteEffects } from "@/components/site/site-effects";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";
import { blogCategories } from "@/lib/website";
import { featuredPost, sitePosts } from "@/server/site-content";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return siteMetadata(locale as Locale, "blogs");
}

export default async function BlogsPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "site" });
  const { posts } = await sitePosts(locale);
  const featured = featuredPost(posts);
  const rest = posts.filter((post) => post !== featured);
  const categories = blogCategories.filter((cat) => rest.some((post) => post.category === cat));
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
        {featured ? (
          <section className="featured">
            <div className="wrap featured__grid">
              <Link className="featured__photo reveal" href={sitePath(locale, `/blogs/${featured.slug}`)} tabIndex={-1} aria-hidden="true">
                <PostImage cover={featured.cover} alt={featured.coverAlt} sizes="(max-width: 1024px) 100vw, 60vw" />
              </Link>
              <div className="featured__text reveal">
                <p className="label">{t("blogs.editorsPick")} &nbsp;/&nbsp; {t(`blogs.filters.${featured.category}`)}</p>
                <h2 className="display">{featured.title}</h2>
                <p className="featured__desc">{featured.excerpt}</p>
                <p className="featured__meta">{t("blogs.insights")} &nbsp;·&nbsp; {t("blogs.minRead", { n: featured.readMinutes })}</p>
                <Link className="pill pill--dark" href={sitePath(locale, `/blogs/${featured.slug}`)}>
                  {t("blogs.read")}
                  <PillIcon />
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {/* Article collection (hidden while the featured story is the only one) */}
        {rest.length > 0 ? (
        <section className="collection" id="stories">
          <div className="wrap">
            <h2 className="display reveal">{t("blogs.collection")}</h2>
            {categories.length > 1 ? (
              <FilterButtons
                scope=".articles"
                buttonClass="filter"
                label={t("blogs.filterLabel")}
                options={(["all", ...categories] as const).map((key) => ({ key, label: t(`blogs.filters.${key}`) }))}
              />
            ) : null}
            <div className="articles">
              {rest.map((post) => (
                <PostCard
                  key={post.slug}
                  post={post}
                  locale={locale}
                  categoryLabel={t(`blogs.filters.${post.category}`)}
                  minutesLabel={t("blogs.minRead", { n: post.readMinutes })}
                />
              ))}
            </div>
          </div>
        </section>
        ) : null}

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
