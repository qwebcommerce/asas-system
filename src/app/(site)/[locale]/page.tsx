import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConsultForm } from "@/components/site/consult-form";
import { DISCIPLINES, otherLocale, sitePath } from "@/components/site/content";
import { formText, siteMetadata } from "@/components/site/page-text";
import { ArrowIcon, DocIcon, LongArrowIcon, PillIcon } from "@/components/site/icons";
import { Photo, type PhotoName } from "@/components/site/photo";
import { PostImage } from "@/components/site/post-card";
import { MosaicCard } from "@/components/site/project-card";
import { richTags } from "@/components/site/rich";
import { ConsultSection, Steps } from "@/components/site/sections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteEffects } from "@/components/site/site-effects";
import { consultationHref, PAGE_PATH, SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";
import { formatBytes } from "@/lib/website";
import { siteDocuments, siteProjects, sitePosts } from "@/server/site-content";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return siteMetadata(locale as Locale, "home");
}

const SERVICE_PHOTOS: PhotoName[] = ["svc-plans", "svc-construction", "svc-interior", "svc-finishing", "svc-furniture"];
const ABOUT_PHOTOS: PhotoName[] = ["about-dining", "about-villa", "about-capital", "about-lounge"];

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
  const { projects, samples: sampleWork } = await siteProjects(locale, (kind) => t(`work.kinds.${kind}`));
  const aboutAlts = t.raw("about.imgAlts") as string[];
  const reasons = t.raw("why.items") as [string, string][];
  const steps = t.raw("steps.items") as [string, string][];
  const stories = (await sitePosts(locale)).posts.slice(0, 3);
  const docs = (await siteDocuments(locale)).documents.slice(0, 3);
  const page = (key: keyof typeof PAGE_PATH, hash = "") => sitePath(locale, PAGE_PATH[key], hash);

  // The four newest projects fill the mosaic (fewer published projects leave the remaining slots out);
  // with the sample projects, the same four as the design (P-01, P-02, P-03, P-05)
  const picks = sampleWork ? [0, 1, 2, 4] : [0, 1, 2, 3];
  const mosaic = (slot: number) => {
    const i = picks[slot];
    return projects[i] ? <MosaicCard project={projects[i]} locale={locale} index={i} /> : null;
  };
  const eyebrowAlt = (key: string) => <span className="alt" lang={other}>{t(key)}</span>;

  return (
    <>
      <SiteHeader locale={locale} current="home" />
      <main>
        {/* Hero */}
        <section className="hero" id="home">
          <figure className="photo kb kb--alt hero__media">
            <Photo name="hero-villa" alt={t("hero.imgAlt")} sizes="100vw" eager />
          </figure>
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
              <Link className="pill pill--light" href={consultationHref(locale)}>
                {t("book")}
                <PillIcon />
              </Link>
              <div className="stats">
                {stats.map(([value, label]) => {
                  const count = /^(\d+)(\+?)$/.exec(value);
                  return (
                    <div className="stat" key={label}>
                      <div className="stat__value" data-count={count?.[1]} data-suffix={count?.[2] || undefined}>{value}</div>
                      <div className="stat__label">{label}</div>
                    </div>
                  );
                })}
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
        <section className="services">
          <div className="wrap services__grid">
            <div className="services__intro reveal">
              <p className="eyebrow">{t("services.eyebrow")} · {eyebrowAlt("services.eyebrowAlt")}</p>
              <h2 className="h2">{t.rich("services.title", richTags)}</h2>
              <p className="lead" style={{ maxWidth: 440, fontSize: 17 }}>{t("services.lead")}</p>
              <Link className="pill pill--dark" href={page("services")}>
                {t("services.explore")}
                <PillIcon />
              </Link>
              <figure className="photo kb services__photo">
                <figcaption className="badge-card">
                  <b>{t("services.badge")}</b>
                  <span>{t("services.badgeSub")}</span>
                </figcaption>
                <Photo name="services-villa" alt={t("services.imgAlt")} />
              </figure>
            </div>
            <div className="service-list reveal">
              {services.map(([kicker, title, body], i) => (
                <Link className="service" href={page("services", DISCIPLINES[i])} key={title}>
                  <span className={`photo kb${i % 2 ? " kb--alt" : ""} service__photo`}><Photo name={SERVICE_PHOTOS[i]} alt="" sizes="120px" /></span>
                  <div className="service__text">
                    <span className="service__kicker">{kicker}</span>
                    <h3 className="service__title">{title}</h3>
                    <p className="service__body">{body}</p>
                  </div>
                  <span className="circle-arrow"><ArrowIcon /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Selected work */}
        <section className="work">
          <div className="wrap">
            <div className="work__head reveal">
              <div>
                <p className="eyebrow eyebrow--light">{t("work.eyebrow")} · {eyebrowAlt("work.eyebrowAlt")}</p>
                <h2 className="h2 h2--md">{t.rich("work.title", richTags)}</h2>
              </div>
              <p className="work__note"><b>{t("work.noteTitle")}</b>{t("work.note")}</p>
            </div>
            <div className="mosaic">
              <div className="mosaic__row">{mosaic(0)}{mosaic(1)}</div>
              {projects.length > 2 ? <div className="mosaic__row">{mosaic(2)}{mosaic(3)}</div> : null}
            </div>
            <div className="work__foot">
              <Link className="pill pill--light" href={page("work")}>
                {t("work.all")}
                <PillIcon />
              </Link>
              {sampleWork ? <p className="disclosure">{t("work.disclosure")}</p> : null}
            </div>
          </div>
        </section>

        {/* About */}
        <section className="about">
          <div className="wrap about__grid">
            <div className="collage reveal">
              {ABOUT_PHOTOS.map((name, i) => (
                <figure className={`photo kb${i % 2 ? "" : " kb--alt"}`} key={name}><Photo name={name} alt={aboutAlts[i]} sizes="300px" /></figure>
              ))}
              <div className="seal"><b>10+</b><span>{t("about.seal")}</span></div>
            </div>
            <div className="about__text reveal">
              <p className="eyebrow">{t("about.eyebrow")} · {eyebrowAlt("about.eyebrowAlt")}</p>
              <h2 className="h2">{t.rich("about.title", richTags)}</h2>
              <p className="lead">{t("about.lead")}</p>
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
              <Link className="pill pill--dark" href={page("about")}>
                {t("about.more")}
                <PillIcon />
              </Link>
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

        <Steps title={t.rich("steps.title", richTags)} steps={steps} />

        {/* Journal preview */}
        <section className="journal">
          <div className="wrap">
            <div className="section-head reveal">
              <div>
                <p className="label">{t("journal.label")}</p>
                <h2 className="display">{t.rich("journal.title", richTags)}</h2>
              </div>
              <Link className="pill pill--dark" href={page("blogs")}>
                {t("journal.all")}
                <PillIcon />
              </Link>
            </div>
            <div className="stories">
              {stories.map((post, i) => (
                <Link className="story reveal" href={sitePath(locale, `/blogs/${post.slug}`)} key={post.slug}>
                  <span className={`photo kb${i % 2 ? "" : " kb--alt"} story__photo`}>
                    <PostImage cover={post.cover} alt={post.coverAlt} sizes="(max-width: 1024px) 100vw, 33vw" />
                  </span>
                  <p className="label">0{i + 1} &nbsp;/&nbsp; {t(`blogs.filters.${post.category}`)}</p>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Documents teaser */}
        <section className="resources">
          <div className="wrap resources__grid">
            <div className="reveal">
              <p className="label label--light">{t("resources.label")}</p>
              <h2 className="display">{t.rich("resources.title", richTags)}</h2>
              <p className="resources__intro">{t("resources.intro")}</p>
              <Link className="pill pill--light" href={page("documents")}>
                {t("resources.all")}
                <PillIcon />
              </Link>
            </div>
            <div className="doc-list reveal">
              {docs.map((doc) => (
                <a className="doc" href={doc.href ?? page("documents")} key={doc.key} {...(doc.href ? { download: doc.fileName } : {})}>
                  <DocIcon />
                  <span>
                    <span className="doc__title">{doc.title}</span>
                    <span className="doc__meta">
                      {doc.href ? t("docs.pdfMeta", { size: formatBytes(doc.size, locale) }) : t("resources.onRequest")}
                    </span>
                  </span>
                  <LongArrowIcon />
                </a>
              ))}
            </div>
          </div>
        </section>

        <ConsultSection locale={locale} />
      </main>
      <SiteFooter locale={locale} current="home" />
      <SiteEffects />
    </>
  );
}

