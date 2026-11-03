"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export function LanguageSwitch() {
  const t = useTranslations("set");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function choose(next: Locale) {
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="lang" role="group" aria-label={t("lang")}>
      <button type="button" data-lang="en" aria-pressed={locale === "en"} onClick={() => choose("en")}>
        EN
      </button>
      <button type="button" data-lang="ar" aria-pressed={locale === "ar"} onClick={() => choose("ar")}>
        ع
      </button>
    </div>
  );
}
