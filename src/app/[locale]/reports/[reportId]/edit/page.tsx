import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReportForm } from "@/components/report-form";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; reportId: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "title" });
  return { title: t("report") };
}

export default async function EditReportPage({ params }: { params: Promise<{ locale: string; reportId: string }> }) {
  const { locale, reportId } = await params;
  setRequestLocale(locale);
  return <ReportForm reportId={reportId} />;
}
