import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OfferForm } from "@/components/offer-form";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "title" });
  return { title: t("offer") };
}

export default async function NewOfferPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OfferForm />;
}
