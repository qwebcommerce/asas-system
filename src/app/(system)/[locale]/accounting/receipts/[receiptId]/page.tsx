import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReceiptDocument } from "@/components/receipt-document";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; receiptId: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "title" });
  return { title: t("receipt") };
}

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ locale: string; receiptId: string }>; searchParams: Promise<{ print?: string }> }) {
  const { locale, receiptId } = await params;
  const { print } = await searchParams;
  setRequestLocale(locale);
  return <ReceiptDocument receiptId={receiptId} autoPrint={print === "1"} />;
}
