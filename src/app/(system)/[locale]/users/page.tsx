import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { UsersScreen } from "@/components/users-screen";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "title" });
  return { title: t("users") };
}

export default async function UsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <UsersScreen />;
}
