import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConsultForm } from "@/components/site/consult-form";
import { mailto, SITE_EMAIL, SITE_PHONE_HREF, otherLocale, sitePath } from "@/components/site/content";
import { formText, siteMetadata } from "@/components/site/page-text";
import { ArrowIcon, DocIcon, LongArrowIcon, PillIcon } from "@/components/site/icons";
import { Photo, type PhotoName } from "@/components/site/photo";
import { richTags } from "@/components/site/rich";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteEffects } from "@/components/site/site-effects";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return siteMetadata(locale as Locale, "home");
}

const SERVICE_PHOTOS: PhotoName[] = ["svc-plans", "svc-construction", "svc-interior", "svc-finishing", "svc-furniture"];
const PROJECT_PHOTOS: PhotoName[] = ["project-modern-interior", "project-stone-villa", "project-family-lounge", "project-media-wall"];
const ABOUT_PHOTOS: PhotoName[] = ["about-dining", "about-villa", "about-construction", "about-lounge"];
const STORY_PHOTOS: PhotoName[] = ["blog-brief", "blog-details", "blog-team"];

export default async function HomePage({ params }: Params) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "site" });
  const form = await formText(locale);
  const other = otherLocale(locale);

  const stats = t.raw("hero.stats") as [string, string][];
  const values = t.raw("values.items") as string[];
  const valuesAlt = t.raw("values.alt") as string[];
  const services = t.raw("services.items") as [string, string, string][];
  const projects = t.raw("work.projects") as [string, string, string][];
  const aboutAlts = t.raw("about.imgAlts") as string[];
  const reasons = t.raw("why.items") as [string, string][];
  const steps = t.raw("steps.items") as [string, string][];
  const stories = t.raw("journal.stories") as [string, string, string, string][];
  const docs = (t.raw("docs.items") as [string, string, string][]).slice(0, 3);

  const project = (i: number) => (
    <article className="project reveal">
      <Photo name={PROJECT_PHOTOS[i]} alt={projects[i][2]} sizes="(max-width: 1024px) 100vw, 60vw" />
      <span className="project__num">P-0{i + 1}</span>
      <div className="project__caption">
        <h3 className="project__title">{projects[i][0]}</h3>
        <p className="project__meta">{projects[i][1]}</p>
      </div>
    </article>
  );

  const eyebrowAlt = (key: string) => (
    <span className="alt" lang={other}>{t(key)}</span>
  );

  return (
    <>
      <SiteHeader locale={locale} current="home" />
      <main>
        {/* Hero */}
        <section className="hero" id="home">
          <div className="hero__media">
            <Photo name="hero-villa" alt={t("hero.imgAlt")} sizes="100vw" eager />
          </div>
          <div className="hero__veil" />
          <div className="hero__inner">
            <div className="hero__intro">
              <p className="eyebrow eyebrow--light">{t("hero.eyebrow")}</p>
              <h1>
                <span className="line"><span>{t("hero.line1")}</span></span>
                <span className="line"><span>{t.rich("hero.line2", richTags)}</span></span>
                <span className="line"><span>{t("hero.line3")}</span></span>
              </h1>
              <p className="hero__ar alt" lang={other}>{t("hero.alt")}</p>
              <p className="hero__sub">{t("hero.sub")}</p>
              <a className="pill pill--light" href="#contact">
                {t("book")}
                <PillIcon />
              </a>
              <div className="stats">
                {stats.map(([value, label]) => (
                  <div className="stat" key={label}>
                    <div className="stat__value">{value}</div>
                    <div className="stat__label">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <p className="hero__form-title">{t("hero.formTitle")}</p>
            <ConsultForm text={{ ...form, label: t("form.quickLabel") }} locale={locale} source="hero" className="form hero__form" />
            <p className="hero__caption">{t("hero.caption")}</p>
            <p className="hero__index">{t("hero.index")}</p>
          </div>
        </section>

        {/* Values marquee: repeated three times so the loop is seamless */}
        <section className="values" aria-label={t("values.label")}>
          <ul className="values__track">
            {[0, 1, 2].flatMap((round) =>
              values.flatMap((value, i) => [
                <li key={`${round}-${i}`} aria-hidden={round > 0 ? true : undefined}>
                  {value} <span className="alt" lang={round === 0 ? other : undefined}>{valuesAlt[i]}</span>
                </li>,
                <li key={`${round}-${i}-dot`} className="dot" aria-hidden="true" />,
              ]),
            )}
          </ul>
        </section>

        {/* Services */}
        <section className="services" id="services">
          <div className="wrap services__grid">
            <div className="services__intro reveal">
              <p className="eyebrow">{t("services.eyebrow")} · {eyebrowAlt("services.eyebrowAlt")}</p>
              <h2 className="h2">{t.rich("services.title", richTags)}</h2>
              <p className="services__lead">{t("services.lead")}</p>
              <figure className="services__photo" style={{ margin: 0 }}>
                <Photo name="services-villa" alt={t("services.imgAlt")} />
                <figcaption className="services__badge">
                  <b>{t("services.badge")}</b>
                  <span>{t("services.badgeSub")}</span>
                </figcaption>
              </figure>
            </div>
            <div className="service-list reveal">
              {services.map(([kicker, title, body], i) => (
                <a className="service" href="#contact" key={title}>
                  <span className="service__photo"><Photo name={SERVICE_PHOTOS[i]} alt="" sizes="120px" /></span>
                  <div className="service__text">
                    <span className="service__kicker">{kicker}</span>
                    <h3 className="service__title">{title}</h3>
                    <p className="service__body">{body}</p>
                  </div>
                  <span className="service__icon"><ArrowIcon /></span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Selected work */}
        <section className="work" id="work">
          <div className="wrap">
            <div className="work__head reveal">
              <div>
                <p className="eyebrow eyebrow--light">{t("work.eyebrow")} · {eyebrowAlt("work.eyebrowAlt")}</p>
                <h2 className="h2 h2--md">{t.rich("work.title", richTags)}</h2>
              </div>
              <p className="work__note"><b>{t("work.noteTitle")}</b>{t("work.note")}</p>
            </div>
            <div className="mosaic">
              <div className="mosaic__row">{project(0)}{project(1)}</div>
              <div className="mosaic__row">{project(2)}{project(3)}</div>
            </div>
            <div className="work__foot">
              <a className="pill pill--light" href="#work">
                {t("work.all")}
                <PillIcon />
              </a>
              <p className="work__disclosure">{t("work.disclosure")}</p>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="about" id="about">
          <div className="wrap about__grid">
            <div className="collage reveal">
              {ABOUT_PHOTOS.map((name, i) => (
                <figure key={name}><Photo name={name} alt={aboutAlts[i]} sizes="300px" /></figure>
              ))}
              <div className="seal"><b>10+</b><span>{t("about.seal")}</span></div>
            </div>
            <div className="about__text reveal">
              <p className="eyebrow">{t("about.eyebrow")} · {eyebrowAlt("about.eyebrowAlt")}</p>
              <h2 className="h2">{t.rich("about.title", richTags)}</h2>
              <p className="about__lead">{t("about.lead")}</p>
              <div className="vm">
                <div className="vm__card">
                  <div className="vm__head"><b>{t("about.vision")}</b><span className="alt" lang={other}>{t("about.visionAlt")}</span></div>
                  <p>{t("about.visionText")}</p>
                </div>
                <div className="vm__card vm__card--dark">
                  <div className="vm__head"><b>{t("about.mission")}</b><span className="alt" lang={other}>{t("about.missionAlt")}</span></div>
                  <p>{t("about.missionText")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why ASAS */}
        <section className="why">
          <div className="wrap">
            <h2 className="h2 h2--md reveal">{t.rich("why.title", richTags)}</h2>
            <div className="reasons">
              {reasons.map(([title, body], i) => (
                <div className={`reason${i % 2 ? " reason--dark" : ""} reveal`} key={title}>
                  <h3>{title}</h3>
                  <p>{body}</p>
                  <span className="reason__icon"><ArrowIcon /></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="steps">
          <div className="wrap">
            <h2 className="h2 h2--md reveal">{t.rich("steps.title", richTags)}</h2>
            <ol className="steps__list" style={{ listStyle: "none", padding: 0 }}>
              {steps.map(([title, body], i) => (
                <li className="step reveal" key={title}>
                  <div className="step__head"><span className="step__num">{i + 1}</span><h3 className="step__title">{title}</h3></div>
                  <div className="step__bar"><span /></div>
                  <p>{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Journal preview */}
        <section className="journal">
          <div className="wrap">
            <div className="journal__head reveal">
              <div>
                <p className="label">{t("journal.label")}</p>
                <h2 className="display">{t.rich("journal.title", richTags)}</h2>
              </div>
              <Link className="pill pill--dark" href={sitePath(locale, "/blogs")}>
                {t("journal.all")}
                <PillIcon />
              </Link>
            </div>
            <div className="stories">
              {stories.map(([label, title, body, alt], i) => (
                <Link className="story reveal" href={sitePath(locale, "/blogs")} key={title}>
                  <div className="story__photo"><Photo name={STORY_PHOTOS[i]} alt={alt} sizes="(max-width: 1024px) 100vw, 33vw" /></div>
                  <p className="label">{label}</p>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Documents teaser */}
        <section className="resources">
          <div className="wrap resources__grid">
            <div className="reveal">
              <p className="label">{t("resources.label")}</p>
              <h2 className="display">{t.rich("resources.title", richTags)}</h2>
              <p className="resources__intro">{t("resources.intro")}</p>
              <Link className="pill pill--light" href={sitePath(locale, "/resources")}>
                {t("resources.all")}
                <PillIcon />
              </Link>
            </div>
            <div className="doc-list reveal">
              {docs.map(([, title]) => (
                <Link className="doc" href={sitePath(locale, "/resources")} key={title}>
                  <DocIcon />
                  <span>
                    <span className="doc__title">{title}</span>
                    <span className="doc__meta" style={{ display: "block" }}>{t("resources.onRequest")}</span>
                  </span>
                  <LongArrowIcon />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Consultation */}
        <section className="consult" id="contact">
          <div className="consult__lines" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="consult__grid">
            <div className="consult__intro reveal">
              <p className="eyebrow eyebrow--muted">{t("consult.eyebrow")} · {eyebrowAlt("consult.eyebrowAlt")}</p>
              <h2 className="h2 h2--md">{t.rich("consult.title", richTags)}</h2>
              <p>{t("consult.intro")}</p>
              <div className="contact-info">
                <div><small>{t("consult.office")}</small><span>{t.rich("consult.officeText", richTags)}</span></div>
                <div><small>{t("consult.hours")}</small><span>{t.rich("consult.hoursText", richTags)}</span></div>
                <div><small>{t("consult.phone")}</small><span><a href={SITE_PHONE_HREF} dir="ltr">{t("phone")}</a></span></div>
                <div><small>{t("consult.email")}</small><span><a href={mailto()}>{SITE_EMAIL}</a></span></div>
              </div>
            </div>
            <ConsultForm text={form} locale={locale} source="contact" className="form form--rounded reveal" />
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} current="home" />
      <SiteEffects />
    </>
  );
}
