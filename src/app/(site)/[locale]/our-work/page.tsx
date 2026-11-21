import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { sitePath } from "@/components/site/content";
import { FilterButtons } from "@/components/site/filter-buttons";
import { PillIcon } from "@/components/site/icons";
import { siteMetadata } from "@/components/site/page-text";
import { ProjectCard } from "@/components/site/project-card";
import { richTags } from "@/components/site/rich";
import { SiteEffects } from "@/components/site/site-effects";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";
import { offerKinds } from "@/lib/offers";
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
  const kinds = offerKinds.filter((kind) => projects.some((project) => project.kind === kind));

  return (
    <>
      <SiteHeader locale={locale} current="work" />
      <main>
        <section className="page-hero work-hero">
          <div className="work-hero__inner">
            <p className="label">{t("work.pageLabel")}</p>
            <h1 className="display">{t.rich("work.pageTitle", richTags)}</h1>
            <p className="work-hero__intro">{t("work.pageIntro")}</p>
          </div>
        </section>

        <section className="collection" id="projects">
          <div className="wrap">
            <h2 className="display reveal">{t("work.collection")}</h2>
            {kinds.length > 1 ? (
              <FilterButtons
                scope=".work-grid"
                buttonClass="filter"
                label={t("work.filterLabel")}
                options={[{ key: "all", label: t("work.allProjects") }, ...kinds.map((kind) => ({ key: kind, label: t(`work.kinds.${kind}`) }))]}
              />
            ) : null}
            <div className="work-grid">
              {projects.map((project, index) => (
                <ProjectCard key={project.slug} project={project} locale={locale} index={index} />
              ))}
            </div>
            {samples ? <p className="work__disclosure work-grid__note">{t("work.disclosure")}</p> : null}
          </div>
        </section>

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
      <SiteFooter locale={locale} current="work" />
      <SiteEffects />
    </>
  );
}
