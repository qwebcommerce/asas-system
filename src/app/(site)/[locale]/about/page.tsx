import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { otherLocale } from "@/components/site/content";
import { siteMetadata } from "@/components/site/page-text";
import { Photo } from "@/components/site/photo";
import { richTags } from "@/components/site/rich";
import { CtaBand, PageHero } from "@/components/site/sections";
import { SiteEffects } from "@/components/site/site-effects";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return siteMetadata(locale as Locale, "about");
}

export default async function AboutPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "site" });
  const other = otherLocale(locale);
  const numbers = t.raw("aboutPage.numbers") as [string, string][];
  const drives = t.raw("aboutPage.drives") as [string, string, string][];
  const values = t.raw("aboutPage.values") as [string, string, string][];
  const track = t.raw("aboutPage.track") as [string, string][];
  const commits = t.raw("aboutPage.commits") as [string, string, string][];

  return (
    <>
      <SiteHeader locale={locale} current="about" />
      <main>
        <PageHero
          locale={locale}
          label={t("aboutPage.label")}
          lines={t.raw("aboutPage.lines") as string[]}
          alt={t("aboutPage.alt")}
          intro={t("aboutPage.intro")}
          photo="about-hero"
          photoAlt={t("aboutPage.heroAlt")}
          note={t("aboutPage.note")}
        />

        {/* Who we are */}
        <section className="who">
          <div className="wrap">
            <div className="who__label reveal">
              <p className="label">{t("aboutPage.whoLabel")}</p>
              <span className="alt" lang={other}>{t("aboutPage.whoAlt")}</span>
            </div>
            <p className="statement reveal">{t.rich("aboutPage.statement", richTags)}</p>
            <figure className="photo kb kb--alt pano reveal">
              <figcaption className="caption-card">
                <b>{t("aboutPage.captionTitle")}</b>
                <span>{t("aboutPage.captionText")}</span>
              </figcaption>
              <Photo name="about-pano" alt={t("aboutPage.panoAlt")} sizes="(max-width: 1440px) 100vw, 1272px" />
            </figure>
          </div>
        </section>

        {/* Numbers */}
        <section className="numbers">
          <div className="wrap numbers__grid reveal">
            {numbers.map(([value, label]) => {
              const count = /^(\d+)(\+?)$/.exec(value);
              return (
                <div className="numbers__item" key={label}>
                  <b data-count={count?.[1]} data-suffix={count?.[2] || undefined}>{value}</b>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Vision, mission, goal */}
        <section className="drives">
          <div className="wrap drives__grid">
            <figure className="photo kb drives__photo reveal">
              <Photo name="about-columns" alt={t("aboutPage.drivesAlt")} sizes="(max-width: 1280px) 100vw, 560px" />
            </figure>
            <div className="reveal">
              <p className="label">{t("aboutPage.drivesLabel")}</p>
              <h2 className="display">{t.rich("aboutPage.drivesTitle", richTags)}</h2>
              <div className="drives__list">
                {drives.map(([title, alt, body], i) => (
                  <div className="drives__row" key={title}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{title} <span className="alt" lang={other}>{alt}</span></h3>
                      <p>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="values-dark">
          <div className="wrap">
            <div className="split-head reveal">
              <div>
                <p className="label label--light">{t("aboutPage.valuesLabel")}</p>
                <h2 className="display">{t.rich("aboutPage.valuesTitle", richTags)}</h2>
              </div>
              <p>{t("aboutPage.valuesText")}</p>
            </div>
            <div className="values-cols">
              {values.map(([title, alt, body], i) => (
                <div className="value reveal" key={title}>
                  <small>{String(i + 1).padStart(2, "0")}</small>
                  <span className="alt" lang={other}>{alt}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How we work */}
        <section className="oneline">
          <div className="wrap">
            <div className="split-head reveal">
              <div>
                <p className="label">{t("aboutPage.trackLabel")}</p>
                <h2 className="display">{t.rich("aboutPage.trackTitle", richTags)}</h2>
              </div>
              <p>{t("aboutPage.trackText")}</p>
            </div>
            <ol className="track">
              {track.map(([title, body], i) => (
                <li key={title}>
                  <span className="track__dot">{i + 1}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Safety and quality */}
        <section className="commit">
          <div className="wrap commit__grid">
            {commits.map(([title, body, alt], i) => (
              <div className="reveal" key={title}>
                <figure className={`photo kb${i ? "" : " kb--alt"} commit__photo`}>
                  <Photo name={i ? "about-quality" : "about-safety"} alt={alt} sizes="(max-width: 720px) 100vw, 50vw" />
                </figure>
                <small>{String(i + 1).padStart(2, "0")}</small>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <CtaBand locale={locale} title={t("aboutPage.ctaTitle")} text={t("aboutPage.ctaText")} button={t("book")} />
      </main>
      <SiteFooter locale={locale} current="about" />
      <SiteEffects />
    </>
  );
}
