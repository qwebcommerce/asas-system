import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { sitePath } from "@/components/site/content";
import { PillIcon } from "@/components/site/icons";
import { PostCard, PostImage, formatDate } from "@/components/site/post-card";
import { SiteEffects } from "@/components/site/site-effects";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { routing, type Locale } from "@/i18n/routing";
import { bodyBlocks } from "@/lib/website";
import { postSlugs, sitePost } from "@/server/site-content";

type Params = { params: Promise<{ locale: string; slug: string }> };

/** New posts render on their first visit (their slugs are not known at build time). */
export const instant = false;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

export async function generateStaticParams() {
  return (await postSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const found = await sitePost(locale, slug);
  if (!found) return {};
  const t = await getTranslations({ locale, namespace: "site.meta" });
  return {
    title: `${found.post.title} — ${t("blogsTitle")}`,
    description: found.post.excerpt,
    alternates: {
      canonical: sitePath(locale as Locale, `/blogs/${slug}`),
      languages: Object.fromEntries(routing.locales.map((l) => [l, sitePath(l, `/blogs/${slug}`)])),
    },
    openGraph: { title: found.post.title, description: found.post.excerpt, type: "article" },
    icons: { icon: "/site/logo.png" },
  };
}

export default async function BlogPostPage({ params }: Params) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const found = await sitePost(locale, slug);
  if (!found) notFound();
  const { post, related } = found;
  const t = await getTranslations({ locale, namespace: "site" });
  const category = t(`blogs.filters.${post.category}`);
  const path = sitePath(locale, `/blogs/${post.slug}`);
  const shareText = encodeURIComponent(post.title);

  return (
    <>
      <SiteHeader locale={locale} current="blogs" path={`/blogs/${post.slug}`} />
      <main>
        {/* Story hero */}
        <section className="page-hero post-hero">
          <div className="post-hero__inner">
            <nav className="label post-crumbs" aria-label={t("post.breadcrumb")}>
              <Link href={sitePath(locale, "/blogs")}>{t("post.breadcrumb")}</Link>
              <span aria-hidden="true">&nbsp;/&nbsp;</span>
              <span>{category}</span>
            </nav>
            <h1 className="display">{post.title}</h1>
            <p className="post-hero__intro">{post.excerpt}</p>
            <p className="post-hero__meta">
              <time dateTime={post.publishedOn}>{formatDate(post.publishedOn, locale)}</time>
              &nbsp;·&nbsp; {t("blogs.minRead", { n: post.readMinutes })}
            </p>
          </div>
        </section>

        {/* Cover */}
        <figure className="post-cover">
          <div className="post-cover__frame">
            <PostImage cover={post.cover} alt={post.coverAlt} sizes="(max-width: 1440px) 100vw, 1272px" eager />
          </div>
          <figcaption className="post-cover__note">{post.coverAlt}</figcaption>
        </figure>

        {/* Body */}
        <section className="post-body">
          <aside className="post-aside">
            <dl className="post-facts">
              <div><dt>{t("post.category")}</dt><dd>{category}</dd></div>
              <div><dt>{t("post.published")}</dt><dd>{formatDate(post.publishedOn, locale)}</dd></div>
              <div><dt>{t("post.readTime")}</dt><dd>{t("post.minutes", { n: post.readMinutes })}</dd></div>
            </dl>
            {SITE_URL ? (
              <div className="post-share">
                <p className="label">{t("post.share")}</p>
                <ShareLinks url={`${SITE_URL}${path}`} text={shareText} labels={[t("post.shareWhatsapp"), t("post.shareLinkedin"), t("post.shareEmail")]} />
              </div>
            ) : null}
            <Link className="post-back" href={sitePath(locale, "/blogs")}>
              <span aria-hidden="true" className="post-back__arrow">←</span> {t("post.back")}
            </Link>
          </aside>

          <article className="post-article">
            {bodyBlocks(post.body).map((block, i) =>
              block.kind === "h2" ? (
                <h2 key={i}>{block.text}</h2>
              ) : block.kind === "quote" ? (
                <blockquote key={i}><p>{block.text}</p></blockquote>
              ) : (
                <p key={i}>{block.text}</p>
              ),
            )}
          </article>
        </section>

        {/* More stories */}
        {related.length > 0 ? (
          <section className="collection post-more">
            <div className="wrap">
              <div className="post-more__head">
                <h2 className="display reveal">{t("post.more")}</h2>
                <Link className="pill pill--dark" href={sitePath(locale, "/blogs")}>
                  {t("post.moreAll")}
                  <PillIcon />
                </Link>
              </div>
              <div className="articles">
                {related.map((item) => (
                  <PostCard
                    key={item.slug}
                    post={item}
                    locale={locale}
                    categoryLabel={t(`blogs.filters.${item.category}`)}
                    minutesLabel={t("blogs.minRead", { n: item.readMinutes })}
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
            <Link className="pill pill--light" href={sitePath(locale, "", "contact")}>
              {t("book")}
              <PillIcon />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} current="blogs" path={`/blogs/${post.slug}`} />
      <SiteEffects />
    </>
  );
}

/** Share links need the public address of the site (NEXT_PUBLIC_SITE_URL); hidden when it is not set. */
function ShareLinks({ url: address, text, labels }: { url: string; text: string; labels: [string, string, string] }) {
  const url = encodeURIComponent(address);
  return (
    <ul className="post-share__links">
      <li><a href={`https://wa.me/?text=${text}%20${url}`} target="_blank" rel="noopener noreferrer">{labels[0]}</a></li>
      <li><a href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`} target="_blank" rel="noopener noreferrer">{labels[1]}</a></li>
      <li><a href={`mailto:?subject=${text}&body=${url}`}>{labels[2]}</a></li>
    </ul>
  );
}
