import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmployeeScreen } from "@/components/employee-screen";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; employeeId: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "title" });
  return { title: t("employees") };
}

export default async function EmployeePage({ params }: { params: Promise<{ locale: string; employeeId: string }> }) {
  const { locale, employeeId } = await params;
  setRequestLocale(locale);
  return <EmployeeScreen employeeId={employeeId} />;
}
