import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { IBM_Plex_Mono, IBM_Plex_Sans_Arabic, Noto_Sans_Arabic, Source_Sans_3 } from "next/font/google";
import { isLocale } from "@/i18n/routing";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-source-sans",
});

const ibmArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-ibm-arabic",
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-noto-arabic",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

const themeBoot = `(function(){try{var m=document.cookie.match(/(?:^|; )asas-theme=([^;]*)/);var theme=m?decodeURIComponent(m[1]):(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");if(theme==="dark")document.documentElement.dataset.theme="dark";else delete document.documentElement.dataset.theme;}catch(e){}})();`;

export const metadata: Metadata = {
  title: "ASAS",
  description: "ASAS private system",
};

export const instant = false;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const headerLocale = headerStore.get("x-next-intl-locale");
  const locale = headerLocale && isLocale(headerLocale) ? headerLocale : "en";
  const theme = cookieStore.get("asas-theme")?.value;

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      data-theme={theme === "dark" ? "dark" : undefined}
      className={`${sourceSans.variable} ${ibmArabic.variable} ${notoArabic.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
