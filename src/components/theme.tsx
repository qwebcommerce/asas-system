"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/icon";

const COOKIE = "asas-theme";

export function setTheme(theme: "light" | "dark") {
  document.cookie = `${COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  if (theme === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
}

export function ThemeToggle() {
  const t = useTranslations("top");

  return (
    <button
      type="button"
      className="icon-btn"
      data-theme-toggle=""
      aria-label={t("theme")}
      onClick={() => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark")}
    >
      <Icon name="moon" />
    </button>
  );
}
