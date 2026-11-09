import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OfferDocument } from "@/components/offer-document";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; offerId: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "title" });
  return { title: t("offer") };
}

export default async function ContractPage({ params, searchParams }: { params: Promise<{ locale: string; offerId: string }>; searchParams: Promise<{ print?: string }> }) {
  const { locale, offerId } = await params;
  const { print } = await searchParams;
  setRequestLocale(locale);
  return <OfferDocument offerId={offerId} doc="contract" autoPrint={print === "1"} />;
}
