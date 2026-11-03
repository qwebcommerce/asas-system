"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitch } from "@/components/language-switch";
import { useRouter } from "@/i18n/navigation";

export function SignInScreen() {
  const t = useTranslations();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/overview");
  }

  return (
    <div className="auth">
      <section className="auth-brand">
        <div />
        <div>
          <svg className="logo" aria-hidden="true" viewBox="26 3 252 366">
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
            <input className="input" id="email" type="email" defaultValue="a.salah@asasqa.com" autoComplete="username" />
          </div>
          <div className="field">
            <label htmlFor="pw">{t("auth.password")}</label>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                id="pw"
                type={showPassword ? "text" : "password"}
                defaultValue="password123"
                autoComplete="current-password"
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
          <div className="between">
            <label className="check">
              <input type="checkbox" defaultChecked />
              <span>{t("auth.keep")}</span>
            </label>
            <a className="link" href="#forgot">
              {t("auth.forgot")}
            </a>
          </div>
          <button className="btn btn--primary btn--lg btn--block" type="submit">
            {t("auth.signIn")}
          </button>
          <p className="muted" style={{ textAlign: "center" }}>
            {t("auth.note2")}
          </p>
        </form>
      </section>
    </div>
  );
}
