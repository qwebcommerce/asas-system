import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { ConsultForm } from "./consult-form";
import { mailto, otherLocale, SITE_EMAIL, SITE_PHONE_HREF } from "./content";
import { PillIcon } from "./icons";
import { formText } from "./page-text";
import { Photo, type PhotoName } from "./photo";
import { richTags } from "./rich";
import { consultationHref } from "./site-header";

/** Dark hero at the top of the inner pages: label, two-line title, line in the other language, intro, photo and note. */
export function PageHero({
  locale,
  label,
  lines,
  alt,
  intro,
  photo,
  photoAlt = "",
  photoAltMotion = false,
  note,
  className = "",
  children,
  aside,
}: {
  locale: Locale;
  label: string;
  lines: string[];
  alt: string;
  intro: string;
  photo?: PhotoName;
  photoAlt?: string;
  /** Use the alternate slow-zoom direction */
  photoAltMotion?: boolean;
  note?: string;
  className?: string;
  /** Extra lines under the intro */
  children?: React.ReactNode;
  /** Replaces the photo (e.g. the documents cover card) */
  aside?: React.ReactNode;
}) {
  return (
    <section className={`page-hero ${className}`.trim()}>
      <div className="page-hero__inner">
        <div className="page-hero__copy">
          <p className="label label--light">{label}</p>
          <h1 className="display">
            {lines.map((line) => (
              <span className="line" key={line}><span>{line}</span></span>
            ))}
          </h1>
          <p className="page-hero__ar alt" lang={otherLocale(locale)}>{alt}</p>
          <p className="page-hero__intro">{intro}</p>
          {children}
        </div>
        {photo ? (
          <figure className={`photo kb${photoAltMotion ? " kb--alt" : ""} page-hero__photo`}>
            <Photo name={photo} alt={photoAlt} sizes="(max-width: 1024px) 100vw, 600px" eager />
          </figure>
        ) : null}
        {aside}
        {note ? <p className="page-hero__note">{note}</p> : null}
      </div>
    </section>
  );
}

/** Dark band with a short call to action and the "Book a consultation" button. */
export function CtaBand({ locale, title, text, button }: { locale: Locale; title: string; text: string; button: string }) {
  return (
    <section className="cta-band">
      <div className="wrap reveal">
        <div>
          <h2 className="display">{title}</h2>
          <p>{text}</p>
        </div>
        <Link className="pill pill--light" href={consultationHref(locale)}>
          {button}
          <PillIcon />
        </Link>
      </div>
    </section>
  );
}

/** Consultation section (home and contact): contact details and the request form. */
export async function ConsultSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "site" });
  const form = await formText(locale);
  const other = otherLocale(locale);
  return (
    <section className="consult" id="consultation">
      <div className="consult__lines" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <div className="consult__grid">
        <div className="consult__intro reveal">
          <p className="eyebrow eyebrow--muted">{t("consult.eyebrow")} · <span className="alt" lang={other}>{t("consult.eyebrowAlt")}</span></p>
          <h2 className="h2 h2--md">{t.rich("consult.title", richTags)}</h2>
          <p>{t("consult.intro")}</p>
          <div className="contact-info">
            <div><small>{t("consult.office")}</small><span>{t.rich("consult.officeText", richTags)}</span></div>
            <div><small>{t("consult.hours")}</small><span>{t.rich("consult.hoursText", richTags)}</span></div>
            <div><small>{t("consult.phone")}</small><span><a href={SITE_PHONE_HREF} dir="ltr">{t("phone")}</a></span></div>
            <div><small>{t("consult.email")}</small><span><a href={mailto()}>{SITE_EMAIL}</a></span></div>
          </div>
        </div>
        <div className="reveal">
          <ConsultForm text={form} locale={locale} source="contact" className="form" />
        </div>
      </div>
    </section>
  );
}

/** "Four steps to your new space" (home and services). */
export function Steps({ title, steps }: { title: React.ReactNode; steps: [string, string][] }) {
  return (
    <section className="steps">
      <div className="wrap">
        <h2 className="h2 h2--md reveal">{title}</h2>
        <ol className="steps__list">
          {steps.map(([stepTitle, body], i) => (
            <li className="step" key={stepTitle}>
              <div className="step__head"><span className="step__num">{i + 1}</span><h3 className="step__title">{stepTitle}</h3></div>
              <div className="step__bar"><span /></div>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
