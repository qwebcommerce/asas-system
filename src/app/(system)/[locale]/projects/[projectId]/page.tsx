import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProjectScreen } from "@/components/project-screen";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "title" });
  return { title: t("projects") };
}

export default async function ProjectPage({ params }: { params: Promise<{ locale: string; projectId: string }> }) {
  const { locale, projectId } = await params;
  setRequestLocale(locale);
  return <ProjectScreen projectId={projectId} />;
}
