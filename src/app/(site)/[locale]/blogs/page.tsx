import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { sitePath } from "@/components/site/content";
import { FilteredGrid } from "@/components/site/filtered-grid";
import { PillIcon } from "@/components/site/icons";
import { siteMetadata } from "@/components/site/page-text";
import { PostCard, PostImage } from "@/components/site/post-card";
import { CtaBand, PageHero } from "@/components/site/sections";
import { SiteEffects } from "@/components/site/site-effects";
import { SiteFooter } from "@/components/site/site-footer";
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

  return (
    <>
      <SiteHeader locale={locale} current="blogs" />
      <main>
        <PageHero
          locale={locale}
          label={t("blogs.label")}
          lines={t.raw("blogs.lines") as string[]}
          alt={t("blogs.alt")}
          intro={t("blogs.intro")}
          photo="journal-hero"
          photoAlt={t("blogs.heroAlt")}
          photoAltMotion
          note={t("blogs.heroNote")}
        />

        {/* Editor's pick */}
        {featured ? (
          <section className="featured">
            <div className="wrap featured__grid">
              <Link className="reveal" href={sitePath(locale, `/blogs/${featured.slug}`)} tabIndex={-1} aria-hidden="true">
                <span className="photo kb featured__photo">
                  <PostImage cover={featured.cover} alt={featured.coverAlt} sizes="(max-width: 1280px) 100vw, 750px" />
                </span>
              </Link>
              <div className="reveal">
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

        {/* All other stories (hidden while the featured story is the only one) */}
        {rest.length > 0 ? (
          <section className="collection" id="collection">
            <div className="wrap">
              <h2 className="display reveal">{t("blogs.collection")}</h2>
              <FilteredGrid
                gridClass="articles"
                pageSize={6}
                filterLabel={t("blogs.filterLabel")}
                pagesLabel={t("pages.label")}
                nextLabel={t("pages.next")}
                previousLabel={t("pages.previous")}
                filters={(["all", ...categories] as const).map((key) => ({ key, label: t(`blogs.filters.${key}`) }))}
                items={rest.map((post, i) => ({
                  key: post.slug,
                  cat: post.category,
                  node: (
                    <PostCard
                      post={post}
                      locale={locale}
                      categoryLabel={t(`blogs.filters.${post.category}`)}
                      minutesLabel={t("blogs.minRead", { n: post.readMinutes })}
                      photoClass={`photo kb${i % 2 ? "" : " kb--alt"} article__photo`}
                    />
                  ),
                }))}
              />
            </div>
          </section>
        ) : null}

        <CtaBand locale={locale} title={t("blogs.ctaTitle")} text={t("blogs.ctaText")} button={t("book")} />
      </main>
      <SiteFooter locale={locale} current="blogs" />
      <SiteEffects />
    </>
  );
}
