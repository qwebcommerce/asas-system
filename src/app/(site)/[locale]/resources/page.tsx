import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { mailto, SITE_EMAIL } from "@/components/site/content";
import { FilterButtons } from "@/components/site/filter-buttons";
import { PillIcon } from "@/components/site/icons";
import { siteMetadata } from "@/components/site/page-text";
import { Logo } from "@/components/site/photo";
import { richTags } from "@/components/site/rich";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteEffects } from "@/components/site/site-effects";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return siteMetadata(locale as Locale, "documents");
}

const CATEGORIES = ["all", "company", "services", "planning"] as const;

export default async function ResourcesPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "site" });
  const items = t.raw("docs.items") as [string, string, string][];

  return (
    <>
      <SiteHeader locale={locale} current="documents" />
      <main>
        {/* Resource hero */}
        <section className="page-hero docs-hero">
          <div className="docs-hero__inner">
            <p className="label">{t("docs.label")}</p>
            <h1 className="display">{t.rich("docs.title", richTags)}</h1>
            <p className="docs-hero__intro">{t("docs.intro")}</p>
            <p className="docs-hero__note">{t("docs.note")}</p>
            <div className="cover" aria-hidden="true">
              <span className="logo"><Logo alt="" /></span>
              <p className="cover__eyebrow">{t("docs.coverEyebrow")}</p>
              <h2 className="display">{t.rich("docs.coverTitle", richTags)}</h2>
              <hr />
              <p className="cover__foot">{t.rich("docs.coverFoot", richTags)}</p>
            </div>
          </div>
        </section>

        {/* Library */}
        <section className="library">
          <div className="wrap">
            <h2 className="display reveal">{t("docs.library")}</h2>
            <p className="library__note">{t("docs.libraryNote")}</p>
            <div className="library__grid">
              <aside className="categories">
                <p className="label">{t("docs.browse")}</p>
                <FilterButtons
                  list
                  scope=".library__items"
                  buttonClass="cat"
                  label={t("docs.filterLabel")}
                  options={CATEGORIES.map((key) => ({ key, label: t(`docs.cats.${key}`) }))}
                />
                <div className="categories__help">
                  <b>{t("docs.help")}</b>
                  <a href={mailto()}>{t("docs.ask")}</a>
                </div>
              </aside>
              <div className="library__items">
                {items.map(([cat, title, body], i) => (
                  <div className="resource reveal" data-cat={cat} key={title}>
                    <span className="resource__num">0{i + 1}</span>
                    <div>
                      <p className="label">{t(`docs.cats.${cat}`)} &nbsp;/&nbsp; PDF</p>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </div>
                    <a className="resource__action" href={mailto(t("docs.requestSubject", { title }))}>{t("docs.request")}</a>
                  </div>
                ))}
                <p className="library__contact">
                  {t.rich("docs.contact", { link: (chunks) => <a href={mailto()}>{chunks}</a> })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Support */}
        <section className="support">
          <div className="wrap">
            <div>
              <h2 className="display">{t.rich("docs.supportTitle", richTags)}</h2>
              <p>{t("docs.supportText")}</p>
            </div>
            <div className="support__action">
              <a className="pill pill--dark" href={mailto(t("docs.requestDocsSubject"))}>
                {t("docs.requestDocs")}
                <PillIcon />
              </a>
              <a href={mailto()}>{SITE_EMAIL}</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} current="documents" />
      <SiteEffects />
    </>
  );
}
