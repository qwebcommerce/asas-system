import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PayrollScreen } from "@/components/payroll-screen";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "title" });
  return { title: t("salary") };
}

export default async function PayrollPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PayrollScreen />;
}
