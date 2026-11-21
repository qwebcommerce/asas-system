import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FilteredGrid } from "@/components/site/filtered-grid";
import { siteMetadata } from "@/components/site/page-text";
import { ProjectCard } from "@/components/site/project-card";
import { CtaBand, PageHero } from "@/components/site/sections";
import { SiteEffects } from "@/components/site/site-effects";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";
import type { OfferKind } from "@/lib/offers";

const FILTER_ORDER: OfferKind[] = ["construction", "architecture", "interior", "fitout"];
import { siteProjects } from "@/server/site-content";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return siteMetadata(locale as Locale, "work");
}

export default async function ProjectsPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "site" });
  const { projects, samples } = await siteProjects(locale, (kind) => t(`work.kinds.${kind}`));
  // Filter order as in the design (villas and construction first, then interiors and finishing)
  const kinds = FILTER_ORDER.filter((kind) => projects.some((project) => project.kind === kind));

  return (
    <>
      <SiteHeader locale={locale} current="work" />
      <main>
        <PageHero
          locale={locale}
          label={t("work.pageLabel")}
          lines={t.raw("work.pageLines") as string[]}
          alt={t("work.pageAlt")}
          intro={t("work.pageIntro")}
          photo="projects-hero"
          photoAlt={t("work.heroAlt")}
          photoAltMotion
          note={t("work.pageNote", { projects: projects.length })}
        />

        <section className="collection" id="collection">
          <div className="wrap">
            <h2 className="display reveal">{t("work.collection", { count: projects.length })}</h2>
            <FilteredGrid
              gridClass="projects"
              pageSize={8}
              filterLabel={t("work.filterLabel")}
              pagesLabel={t("pages.label")}
              nextLabel={t("pages.next")}
              previousLabel={t("pages.previous")}
              filters={[{ key: "all", label: t("work.allProjects") }, ...kinds.map((kind) => ({ key: kind, label: t(`work.filters.${kind}`) }))]}
              items={projects.map((project, index) => ({
                key: project.slug,
                cat: project.kind,
                node: <ProjectCard project={project} locale={locale} index={index} />,
              }))}
            />
            {samples ? <p className="disclosure" style={{ color: "var(--grey)" }}>{t("work.disclosure")}</p> : null}
          </div>
        </section>

        <CtaBand locale={locale} title={t("work.ctaTitle")} text={t("work.ctaText")} button={t("book")} />
      </main>
      <SiteFooter locale={locale} current="work" />
      <SiteEffects />
    </>
  );
}
