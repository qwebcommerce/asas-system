"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useDirectory } from "@/components/use-directory";
import { Modal, Toast } from "@/components/ui/overlay";
import { initials } from "@/lib/directory";
import { submitAccessRequest } from "@/server/directory";

const dashboards = ["hr", "eng", "acc", "st"] as const;
const roleForDash = { hr: "hr", eng: "engineer", acc: "accountant", st: "staff" } as const;

export function StaffScreen() {
  const t = useTranslations();
  const { profile, getToken } = useAuth();
  const { requests } = useDirectory();
  const [open, setOpen] = useState(false);
  const [dash, setDash] = useState<(typeof dashboards)[number]>("eng");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(false);
  const pending = requests.some((request) => request.status === "pending");

  return (
    <AppShell title={t("page.overview")}>
      <div className="page-header">
        <div>
          <span className="eyebrow">{t("role.staff")}</span>
          <h2 className="page-title">{t("staff.hello")}</h2>
          <p className="page-sub">{t("date.today")}</p>
        </div>
      </div>
      {pending ? (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 18, borderColor: "var(--ai-border)" }}>
          <span className="banner circle" style={{ background: "var(--accent-soft)", color: "var(--accent-text)", width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", padding: 0 }}>
            <Icon name="clock" className="icon icon--lg" />
          </span>
          <div className="grow">
            <b>{t("staff.pendT")}</b>
            <p className="muted">{t("staff.pendS")}</p>
          </div>
          <span className="badge badge--warn">{t("staff.waiting")}</span>
        </div>
      ) : (
        <div className="banner" id="basic">
          <span className="circle"><Icon name="shield" className="icon icon--lg" /></span>
          <div className="grow">
            <b>{t("staff.basicT")}</b>
            <p>{t("staff.basicS")}</p>
          </div>
          <button type="button" className="btn btn--accent" onClick={() => setOpen(true)}>
            <Icon name="send" />
            {t("req.title")}
          </button>
        </div>
      )}
      <div className="grid-3">
        <div className="card stack stack--sm">
          <h3 className="card-title">{t("staff.profile")}</h3>
          <div className="person">
            <span className="avatar avatar--lg">{initials(profile?.name ?? "")}</span>
            <div>
              <b>{profile?.name}</b>
              <small>{profile ? t(`role.${profile.role}`) : t("role.staff")} · <span className="num"><bdi>{profile?.employeeId}</bdi></span></small>
            </div>
          </div>
        </div>
        <div className="card kpi">
          <span className="label">{t("staff.leave")}</span>
          <span className="value"><span className="num">18</span> {t("unit.days")}</span>
          <span className="note">{t("staff.leaveN")}</span>
        </div>
        <div className="card kpi">
          <span className="label">{t("staff.att")}</span>
          <span className="value num">2 / 2</span>
          <span className="note note--ok">{t("staff.attN")}</span>
        </div>
      </div>
      <div className="card">
        <h3 className="card-title">{t("staff.news")}</h3>
        <div className="list-row">
          <span className="badge badge--accent badge--plain"><Icon name="bell" className="icon icon--sm" /></span>
          <div className="grow">
            <b>{t("ann1.t")}</b>
            <small>{t("ann1.s")}</small>
          </div>
        </div>
        <div className="list-row">
          <span className="badge badge--accent badge--plain"><Icon name="bell" className="icon icon--sm" /></span>
          <div className="grow">
            <b>{t("ann2.t")}</b>
            <small>{t("ann2.s")}</small>
          </div>
        </div>
      </div>
      <Modal open={open} title={t("req.title")} onClose={() => setOpen(false)}>
        <p className="muted">{t("req.sub")}</p>
        <div className="field">
          <label>{t("reg.empId")}</label>
          <input className="input num" value={profile?.employeeId ?? ""} readOnly />
        </div>
        <div className="field">
          <span className="label">{t("req.dash")}</span>
          <div className="hstack">
            {dashboards.map((item) => (
              <button key={item} type="button" className="chip" aria-pressed={dash === item} onClick={() => setDash(item)}>
                {t(`demo.${item}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>{t("req.msg")}</label>
          <textarea className="textarea" placeholder={t("req.msg")} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        <div className="hstack" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>{t("btn.cancel")}</button>
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => {
              void getToken()
                .then((token) => submitAccessRequest(token, roleForDash[dash], note))
                .then((result) => {
                  if (!result.ok) {
                    setError(t(result.error ?? "auth.failed"));
                    return;
                  }
                  setError("");
                  setNote("");
                  setOpen(false);
                  setToast(true);
                  window.setTimeout(() => setToast(false), 3000);
                });
            }}
          >
            <Icon name="send" />
            {t("req.send")}
          </button>
        </div>
      </Modal>
      <Toast open={toast} title={t("req.sentT")} detail={t("req.sentS")} />
    </AppShell>
  );
}
