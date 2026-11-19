import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AuthProvider } from "@/components/auth-provider";
import { PermissionsProvider } from "@/components/permissions-provider";
import { DocumentLocale } from "@/components/document-locale";
import { IconSprite } from "@/components/icon-sprite";
import { isLocale, routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const instant = false;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  // The public website's text ("site") is rendered on the server only; keep it out of the system's client bundle
  const messages = Object.fromEntries(Object.entries(await getMessages()).filter(([key]) => key !== "site"));

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        <PermissionsProvider>
          <DocumentLocale />
          <IconSprite />
          {children}
        </PermissionsProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
