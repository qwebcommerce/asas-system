"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { setTheme } from "@/components/theme";
import { Toast } from "@/components/ui/overlay";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { initials } from "@/lib/directory";
import { updateOwnProfile } from "@/server/directory";

const DRAFT_KEY = "asas-settings-draft";

type SettingsDraft = {
  name: string;
  email: string;
  mobile: string;
  employeeId: string;
  twoFactor: boolean;
  signInAlerts: boolean;
  theme: "light" | "dark";
};

function readDraft(): SettingsDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SettingsDraft;
    if (!parsed || typeof parsed.name !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function SettingsScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { profile, getToken } = useAuth();
  const [theme, setLocalTheme] = useState<"light" | "dark">("light");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [twoFactor, setTwoFactor] = useState(true);
  const [signInAlerts, setSignInAlerts] = useState(true);
  const [toast, setToast] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLocalTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (!profile) return;
    const draft = readDraft();
    if (draft) {
      setName(draft.name);
      setEmail(draft.email);
      setMobile(draft.mobile);
      setEmployeeId(draft.employeeId);
      setTwoFactor(draft.twoFactor);
      setSignInAlerts(draft.signInAlerts);
      setLocalTheme(draft.theme);
      setTheme(draft.theme);
      return;
    }
    setName(profile.name);
    setEmail(profile.email);
    setMobile(profile.mobile);
    setEmployeeId(profile.employeeId);
    setTwoFactor(profile.twoFactor);
    setSignInAlerts(profile.signInAlerts);
    if (profile.theme) setLocalTheme(profile.theme);
  }, [profile]);

  function draftFrom(next: Partial<SettingsDraft>): SettingsDraft {
    return {
      name,
      email,
      mobile,
      employeeId,
      twoFactor,
      signInAlerts,
      theme,
      ...next,
    };
  }

  function edit(next: Partial<SettingsDraft>) {
    const draft = draftFrom(next);
    if ("name" in next && next.name !== undefined) setName(next.name);
    if ("email" in next && next.email !== undefined) setEmail(next.email);
    if ("mobile" in next && next.mobile !== undefined) setMobile(next.mobile);
    if ("employeeId" in next && next.employeeId !== undefined) setEmployeeId(next.employeeId);
    if ("twoFactor" in next && next.twoFactor !== undefined) setTwoFactor(next.twoFactor);
    if ("signInAlerts" in next && next.signInAlerts !== undefined) setSignInAlerts(next.signInAlerts);
    if (next.theme) {
      setTheme(next.theme);
      setLocalTheme(next.theme);
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  function chooseTheme(next: "light" | "dark") {
    edit({ theme: next });
  }

  function chooseLanguage(next: Locale) {
    router.replace(pathname, { locale: next });
  }

  function cancel() {
    if (!profile) return;
    setName(profile.name);
    setEmail(profile.email);
    setMobile(profile.mobile);
    setEmployeeId(profile.employeeId);
    setTwoFactor(profile.twoFactor);
    setSignInAlerts(profile.signInAlerts);
    setError("");
    sessionStorage.removeItem(DRAFT_KEY);
    const savedTheme = profile.theme ?? (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    setTheme(savedTheme);
    setLocalTheme(savedTheme);
    if (profile.locale && profile.locale !== locale) chooseLanguage(profile.locale);
  }

  async function save() {
    if (!profile) return;
    setPending(true);
    setError("");
    const result = await updateOwnProfile(await getToken(), {
      name,
      email,
      mobile,
      employeeId,
      twoFactor,
      signInAlerts,
      locale: locale === "ar" ? "ar" : "en",
      theme,
    });
    setPending(false);
    if (!result.ok) {
      setError(t(result.error ?? "auth.failed"));
      return;
    }
    sessionStorage.removeItem(DRAFT_KEY);
    setTheme(theme);
    setToast(true);
    window.setTimeout(() => setToast(false), 3000);
  }

  return (
    <AppShell title={t("nav.settings")}>
      <div className="page-header">
        <div>
          <h2 className="page-title">{t("nav.settings")}</h2>
          <p className="page-sub">{t("set.sub")}</p>
        </div>
        <div className="hstack">
          <button type="button" className="btn btn--ghost" onClick={cancel}>{t("btn.cancel")}</button>
          <button type="button" className="btn btn--primary" onClick={() => void save()} disabled={pending}>
            <Icon name="check" />
            {pending ? t("common.loading") : t("set.save")}
          </button>
        </div>
      </div>
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      <div className="split">
        <div className="stack">
          <div className="card stack">
            <h3 className="card-title">{t("set.profile")}</h3>
            <div className="person">
              <span className="avatar avatar--lg" style={{ background: "var(--onyx)", color: "var(--champagne)" }}>
                {initials(name || profile?.name || "")}
              </span>
              <div>
                <b style={{ fontSize: 18 }}>{name || profile?.name}</b>
                <small>{profile ? t(`role.${profile.role}`) : t("role.superAdmin")}</small>
              </div>
            </div>
            <div className="form-grid form-grid--2">
              <Field label={t("reg.name")} value={name} onChange={(value) => edit({ name: value })} />
              <Field label={t("auth.email")} value={email} onChange={(value) => edit({ email: value })} type="email" />
              <Field label={t("reg.mobile")} value={mobile} onChange={(value) => edit({ mobile: value })} />
              <Field label={t("reg.empId")} value={employeeId} onChange={(value) => edit({ employeeId: value })} />
            </div>
          </div>
          <div className="card stack">
            <h3 className="card-title">{t("set.security")}</h3>
            <Toggle title={t("set.2fa")} detail={t("set.2fas")} checked={twoFactor} onChange={(value) => edit({ twoFactor: value })} />
            <Toggle title={t("set.alerts")} detail={t("set.alertss")} checked={signInAlerts} onChange={(value) => edit({ signInAlerts: value })} />
          </div>
        </div>
        <div className="stack">
          <div className="card stack stack--sm">
            <h3 className="card-title">{t("set.lang")}</h3>
            <div className="segmented" style={{ width: "100%" }}>
              <button type="button" aria-pressed={locale === "en"} style={{ flex: 1 }} onClick={() => chooseLanguage("en")}>
                English
              </button>
              <button type="button" aria-pressed={locale === "ar"} style={{ flex: 1 }} onClick={() => chooseLanguage("ar")}>
                العربية
              </button>
            </div>
            <small className="muted">{t("set.langS")}</small>
          </div>
          <div className="card stack stack--sm">
            <h3 className="card-title">{t("set.theme")}</h3>
            <div className="grid-2">
              <button type="button" className="theme-card" data-set-theme="light" aria-pressed={theme === "light"} onClick={() => chooseTheme("light")}>
                <i /><span />
              </button>
              <button type="button" className="theme-card theme-card--dark" data-set-theme="dark" aria-pressed={theme === "dark"} onClick={() => chooseTheme("dark")}>
                <i /><span />
              </button>
            </div>
            <div className="grid-2">
              <small>{t("set.light")}</small>
              <small>{t("set.dark")}</small>
            </div>
          </div>
        </div>
      </div>
      <Toast open={toast} title={t("set.savedT")} detail={t("set.savedS")} />
    </AppShell>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div className="field">
      <label><span>{label}</span></label>
      <input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Toggle({ title, detail, checked, onChange }: { title: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="between">
      <div>
        <b>{title}</b>
        <small className="muted" style={{ display: "block" }}>{detail}</small>
      </div>
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span />
      </label>
    </div>
  );
}
