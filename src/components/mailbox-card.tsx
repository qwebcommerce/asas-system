"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { companyMailbox, disconnectGmail, startGmailConnect } from "@/server/email";

type Status = Extract<Awaited<ReturnType<typeof companyMailbox>>, { ok: true }>;

/** Settings card (Super Admin): connect the company Gmail mailbox, read-only, for the AI assistant. */
export function MailboxCard() {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken, profile } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  // Result of the Google sign-in, passed back by /api/email/google/callback
  const result = useSearchParams().get("mailbox");
  const isSuperAdmin = profile?.role === "superAdmin";

  useEffect(() => {
    if (!isSuperAdmin) return;
    let active = true;
    void (async () => {
      const reply = await companyMailbox(await getToken());
      if (!active) return;
      if (reply.ok) setStatus(reply);
      else setError(t(reply.error));
    })();
    return () => {
      active = false;
    };
  }, [getToken, isSuperAdmin, t]);

  if (!isSuperAdmin) return null;

  return (
    <div className="card stack stack--sm">
      <div className="between">
        <h3 className="card-title">{t("mail.title")}</h3>
        {status ? <span className={`badge badge--${status.connected ? "ok" : "neutral"}`}>{t(status.connected ? "mail.connected" : "mail.notConnectedBadge")}</span> : null}
      </div>
      <small className="muted">{t("mail.intro")}</small>
      {result ? <p className={result === "connected" ? "mail-result mail-result--ok" : "mail-result"} role="status">{t(`mail.result.${["connected", "cancelled", "expired", "forbidden", "scope"].includes(result) ? result : "error"}`)}</p> : null}
      {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
      {!status ? <small className="muted">{t("common.loading")}</small> : null}
      {status && status.connected ? (
        <>
          <div className="kv"><span>{t("mail.address")}</span><bdi dir="ltr"><b>{status.address || "—"}</b></bdi></div>
          {status.connectedAt ? <div className="kv"><span>{t("mail.since")}</span><span className="num">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", numberingSystem: "latn" }).format(new Date(`${status.connectedAt}T12:00:00`))}</span></div> : null}
          <small className="muted">{t("mail.howToAsk")}</small>
          <div>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  const reply = await disconnectGmail(await getToken());
                  setBusy(false);
                  if (!reply.ok) return setError(t(reply.error));
                  setStatus({ ...status, connected: false, address: "", connectedAt: "" });
                })();
              }}
            >
              {t("mail.disconnect")}
            </button>
          </div>
        </>
      ) : null}
      {status && !status.connected ? (
        <>
          {!status.configured ? <p className="mail-result" style={{ margin: 0 }}>{t("mail.setupNeeded")}</p> : null}
          <div className="field">
            <span className="label">{t("mail.redirect")}</span>
            <div className="hstack">
              <input className="input" readOnly dir="ltr" value={status.redirectUri} onFocus={(event) => event.target.select()} aria-label={t("mail.redirect")} />
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => void navigator.clipboard.writeText(status.redirectUri).then(() => setCopied(true))}>{copied ? t("mail.copied") : t("mail.copy")}</button>
            </div>
            <small className="muted">{t("mail.redirectHint")}</small>
          </div>
          <div>
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy || !status.configured}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  setError("");
                  const reply = await startGmailConnect(await getToken());
                  if (!reply.ok) {
                    setBusy(false);
                    return setError(t(reply.error));
                  }
                  window.location.assign(reply.url);
                })();
              }}
            >
              <Icon name="mail" />
              {t("mail.connect")}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
