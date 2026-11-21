import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { sitePath } from "@/components/site/content";
import { PillIcon } from "@/components/site/icons";
import { ProjectCard, ProjectImage } from "@/components/site/project-card";
import { SiteEffects } from "@/components/site/site-effects";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { routing, type Locale } from "@/i18n/routing";
import { projectSlugs, siteProjects } from "@/server/site-content";

type Params = { params: Promise<{ locale: string; slug: string }> };

/** New projects render on their first visit (their slugs are not known at build time). */
export const instant = false;

export async function generateStaticParams() {
  return (await projectSlugs()).map((slug) => ({ slug }));
}

async function load(locale: string, slug: string) {
  const t = await getTranslations({ locale, namespace: "site" });
  const { projects } = await siteProjects(locale, (kind) => t(`work.kinds.${kind}`));
  const index = projects.findIndex((project) => project.slug === slug);
  if (index < 0) return null;
  const project = projects[index];
  const more = [
    ...projects.filter((item, i) => i !== index && item.kind === project.kind),
    ...projects.filter((item, i) => i !== index && item.kind !== project.kind),
  ].slice(0, 2);
  return { project, more, t };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const found = await load(locale, slug);
  if (!found) return {};
  const meta = await getTranslations({ locale, namespace: "site.meta" });
  return {
    title: `${found.project.name} — ${meta("workTitle")}`,
    description: found.project.summary,
    alternates: {
      canonical: sitePath(locale as Locale, `/our-work/${slug}`),
      languages: Object.fromEntries(routing.locales.map((l) => [l, sitePath(l, `/our-work/${slug}`)])),
    },
    icons: { icon: "/site/logo.png" },
  };
}

export default async function ProjectPage({ params }: Params) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const found = await load(locale, slug);
  if (!found) notFound();
  const { project, more, t } = found;

  return (
    <>
      <SiteHeader locale={locale} current="work" path={`/our-work/${project.slug}`} />
      <main>
        <section className="page-hero post-hero">
          <div className="post-hero__inner">
            <nav className="label post-crumbs" aria-label={t("work.breadcrumb")}>
              <Link href={sitePath(locale, "/our-work")}>{t("work.breadcrumb")}</Link>
              <span aria-hidden="true">&nbsp;/&nbsp;</span>
              <span>{project.scope}</span>
            </nav>
            <h1 className="display">{project.name}</h1>
            <p className="post-hero__meta">{[project.location, project.year].filter(Boolean).join("  ·  ")}</p>
          </div>
        </section>

        <figure className="post-cover">
          <div className="post-cover__frame">
            <ProjectImage cover={project.cover} alt={project.coverAlt} sizes="(max-width: 1440px) 100vw, 1272px" eager />
          </div>
          <figcaption className="post-cover__note">{project.coverAlt}</figcaption>
        </figure>

        <section className="post-body">
          <aside className="post-aside">
            <dl className="post-facts">
              <div><dt>{t("work.factType")}</dt><dd>{project.scope}</dd></div>
              {project.location ? <div><dt>{t("work.factLocation")}</dt><dd>{project.location}</dd></div> : null}
              {project.year ? <div><dt>{t("work.factYear")}</dt><dd>{project.year}</dd></div> : null}
            </dl>
            <Link className="post-back" href={sitePath(locale, "/our-work")}>
              <span aria-hidden="true" className="post-back__arrow">←</span> {t("work.back")}
            </Link>
          </aside>
          <article className="post-article">
            <p>{project.summary}</p>
            <p>{t("work.closing")}</p>
          </article>
        </section>

        {more.length > 0 ? (
          <section className="collection post-more">
            <div className="wrap">
              <div className="post-more__head">
                <h2 className="display reveal">{t("work.more")}</h2>
                <Link className="pill pill--dark" href={sitePath(locale, "/our-work")}>
                  {t("work.all")}
                  <PillIcon />
                </Link>
              </div>
              <div className="work-grid">
                {more.map((item, i) => <ProjectCard key={item.slug} project={item} locale={locale} index={i} />)}
              </div>
            </div>
          </section>
        ) : null}

        <section className="cta-band">
          <div className="wrap">
            <div>
              <h2 className="display">{t("work.ctaTitle")}</h2>
              <p>{t("work.ctaText")}</p>
            </div>
            <Link className="pill pill--light" href={sitePath(locale, "", "contact")}>
              {t("book")}
              <PillIcon />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} current="work" path={`/our-work/${project.slug}`} />
      <SiteEffects />
    </>
  );
}
