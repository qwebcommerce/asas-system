import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { mailto, otherLocale, SITE_EMAIL, SITE_PHONE_HREF } from "@/components/site/content";
import { ArrowIcon, PillIcon } from "@/components/site/icons";
import { siteMetadata } from "@/components/site/page-text";
import { richTags } from "@/components/site/rich";
import { ConsultSection, PageHero } from "@/components/site/sections";
import { SiteEffects } from "@/components/site/site-effects";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return siteMetadata(locale as Locale, "contact");
}

const MAPS_LINK = "https://www.google.com/maps/search/?api=1&query=Rafal+Tower+Lusail+Qatar";
const MAPS_EMBED = "https://www.google.com/maps?q=Rafal+Tower,+Lusail,+Qatar&output=embed";
const WHATSAPP = "https://wa.me/97466111817";

export default async function ContactPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "site" });
  const other = otherLocale(locale);
  const options = [
    { href: SITE_PHONE_HREF, small: t("contactPage.call"), title: t("phone"), text: t.rich("consult.hoursText", richTags), dark: false, ltr: true },
    { href: WHATSAPP, small: t("contactPage.whatsapp"), title: t("phone"), text: t("contactPage.whatsappText"), dark: true, ltr: true, external: true },
    { href: mailto(), small: t("contactPage.email"), title: SITE_EMAIL, text: t("contactPage.emailText"), dark: false, ltr: true },
    { href: MAPS_LINK, small: t("contactPage.visit"), title: t("footer.address1"), text: t("footer.address2"), dark: true, external: true },
  ];

  return (
    <>
      <SiteHeader locale={locale} current="contact" />
      <main>
        <PageHero
          locale={locale}
          label={t("contactPage.label")}
          lines={t.raw("contactPage.lines") as string[]}
          alt={t("contactPage.alt")}
          intro={t("contactPage.intro")}
          photo="contact-hero"
          photoAlt={t("contactPage.heroAlt")}
          note={t("contactPage.note")}
        />

        <section className="options">
          <div className="wrap options__grid">
            {options.map((option) => (
              <a
                className={`option${option.dark ? " option--dark" : ""} reveal`}
                href={option.href}
                key={option.small}
                {...(option.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                <small>{option.small}</small>
                <span className="reason__icon"><ArrowIcon /></span>
                <b dir={option.ltr ? "ltr" : undefined} style={option.ltr ? { textAlign: "start", unicodeBidi: "plaintext" } : undefined}>{option.title}</b>
                <span>{option.text}</span>
              </a>
            ))}
          </div>
        </section>

        <ConsultSection locale={locale} />

        <section className="findus">
          <div className="wrap">
            <div className="reveal">
              <p className="label">{t("contactPage.findLabel")}</p>
              <h2 className="display">{t.rich("contactPage.findTitle", richTags)}</h2>
              <address>
                {t.rich("consult.officeText", richTags)}
                <br />
                <span className="alt" lang={other}>{t("contactPage.addressAlt")}</span>
              </address>
              <p className="hours">{t.rich("contactPage.hours", richTags)}</p>
              <a className="pill pill--dark" href={MAPS_LINK} target="_blank" rel="noopener noreferrer">
                {t("contactPage.openMaps")}
                <PillIcon />
              </a>
            </div>
            <div className="map reveal">
              <iframe title={t("contactPage.mapTitle")} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={MAPS_EMBED} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} current="contact" />
      <SiteEffects />
    </>
  );
}
