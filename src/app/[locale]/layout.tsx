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
  const messages = await getMessages();

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
