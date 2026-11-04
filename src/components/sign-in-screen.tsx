"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { LanguageSwitch } from "@/components/language-switch";
import { setTheme } from "@/components/theme";
import { useRouter } from "@/i18n/navigation";

export function SignInScreen() {
  const t = useTranslations();
  const router = useRouter();
  const { configured, profile, signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!profile) return;
    if (profile.theme) setTheme(profile.theme);
    router.replace(profile.role === "staff" ? "/staff" : "/overview", profile.locale ? { locale: profile.locale } : undefined);
  }, [profile, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    const message = await signIn(String(data.get("email") ?? ""), String(data.get("password") ?? ""), data.get("keep") === "on");
    setPending(false);
    if (message) setError(t(message));
  }

  return (
    <div className="auth">
      <section className="auth-brand">
        <div />
        <div className="logo-lockup">
          <svg className="logo" aria-hidden="true" viewBox="16 0 272 378">
            <use href="#i-logo" />
          </svg>
          <div className="logo-word">{t("brand.execution")}</div>
        </div>
        <div className="bottom">
          <span className="eyebrow">{t("auth.private")}</span>
          <p style={{ marginTop: 8 }}>{t("auth.note")}</p>
        </div>
      </section>
      <section className="auth-form">
        <LanguageSwitch />
        <form className="inner" onSubmit={submit}>
          <div>
            <h2>{t("auth.welcome")}</h2>
            <p className="muted">{t("auth.signInSub")}</p>
          </div>
          <div className="field">
            <label htmlFor="email">{t("auth.email")}</label>
            <input className="input" id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="field">
            <label htmlFor="pw">{t("auth.password")}</label>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                id="pw"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                style={{ paddingInlineEnd: 44 }}
              />
              <button
                type="button"
                aria-label={t("auth.password")}
                onClick={() => setShowPassword((current) => !current)}
                style={{ position: "absolute", insetInlineEnd: 12, top: 12 }}
              >
                <svg className="icon icon--sm" aria-hidden="true">
                  <use href="#i-eye" />
                </svg>
              </button>
            </div>
          </div>
          <label className="check">
              <input type="checkbox" name="keep" defaultChecked />
            <span>{t("auth.keep")}</span>
          </label>
          {!configured ? <p style={{ color: "var(--danger)" }}>{t("auth.notConfigured")}</p> : null}
          {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
          <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={pending}>
            {pending ? t("common.loading") : t("auth.signIn")}
          </button>
        </form>
      </section>
    </div>
  );
}
