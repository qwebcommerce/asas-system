"use client";

import { useLayoutEffect } from "react";
import { useLocale } from "next-intl";

export function DocumentLocale() {
  const locale = useLocale();

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
