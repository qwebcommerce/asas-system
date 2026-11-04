"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";

const mail = [
  { id: "1", title: "mail1", when: "mailWhen1" },
  { id: "2", title: "mail2", when: "mailWhen2" },
  { id: "3", title: "mail3", when: "mailWhen3" },
] as const;

export function EmailScreen() {
  const t = useTranslations();
  const [active, setActive] = useState("1");
  const current = mail.find((item) => item.id === active) ?? mail[0];

  return (
    <AppShell title={t("nav.email")}>
      <div className="page-header">
        <div>
          <span className="eyebrow">{t("nav.email")}</span>
          <h2 className="page-title">{t("ov.aiT")}</h2>
          <p className="page-sub">{t("ai.note")}</p>
        </div>
      </div>
      <div className="split">
        <div className="card card--flush">
          {mail.map((item) => (
            <button
              key={item.id}
              type="button"
              className="list-row"
              style={{ width: "100%", textAlign: "start", background: active === item.id ? "var(--surface-2)" : "transparent" }}
              onClick={() => setActive(item.id)}
            >
              <span className="tile-icon"><Icon name="mail" className="icon icon--sm" /></span>
              <span className="grow">
                <b>{t(`sample.${item.title}`)}</b>
                <small>{t(`sample.${item.when}`)}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="stack">
          <div className="ai">
            <Icon name="spark" />
            <div>
              <b>{t("ov.aiT")}</b>
              <span>{t("ov.aiS")}</span>
            </div>
          </div>
          <div className="card stack">
            <h3 className="card-title">{t(`sample.${current.title}`)}</h3>
            <p>{t("ai.a1")}</p>
            <div className="hstack">
              <button type="button" className="btn btn--secondary btn--sm">{t("ai.s1")}</button>
              <button type="button" className="btn btn--primary btn--sm">{t("ai.s2")}</button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
