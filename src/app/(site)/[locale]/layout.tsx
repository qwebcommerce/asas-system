import { Noto_Sans_Arabic, Source_Sans_3 } from "next/font/google";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale, routing } from "@/i18n/routing";
import "@/styles/site.css";

/*
 * Root layout of the public website (home, blogs, resources).
 * It is separate from the (system) root layout so the website's stylesheet
 * never mixes with the private system's Tailwind/asas.css styles.
 */

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-site-latin",
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-site-arabic",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${sourceSans.variable} ${notoArabic.variable}`}
    >
      <body>
        {children}
      </body>
    </html>
  );
}
