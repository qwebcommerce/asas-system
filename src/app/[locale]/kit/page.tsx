import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { KitScreen } from "@/components/kit-screen";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "kit" });
  return { title: `${t("title")} · ASAS` };
}

export default async function KitPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <KitScreen />;
}
