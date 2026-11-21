"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { ReceiptFit } from "@/components/receipt-fit";
import { ReceiptVoucher } from "@/components/receipt-voucher";
import { useAccounting } from "@/components/use-accounting";
import { Modal, Toast } from "@/components/ui/overlay";
import { Link } from "@/i18n/navigation";
import { receiptShareToken } from "@/server/accounting";

/** A receipt's voucher in the system: download (print to PDF) and share a link with the client. */
export function ReceiptDocument({ receiptId, autoPrint = false }: { receiptId: string; autoPrint?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();
  const { receipts, invoices, ready, canView, canManage } = useAccounting();
  const receipt = receipts.find((item) => item.id === receiptId);
  const invoiceNumber = receipt?.invoiceId ? invoices.find((item) => item.id === receipt.invoiceId)?.number ?? "" : "";
  const [busy, setBusy] = useState(false);
  const [confirmRenew, setConfirmRenew] = useState(false);
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);

  useEffect(() => {
    if (!receipt) return;
    const previous = document.title;
    document.title = `${receipt.number} receipt`;
    return () => {
      document.title = previous;
    };
  }, [receipt]);

  useEffect(() => {
    if (!autoPrint || !receipt) return;
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [autoPrint, receipt]);

  function notify(title: string, detail: string) {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function makeLink(renew: boolean) {
    if (!receipt) return;
    setBusy(true);
    const result = await receiptShareToken(await getToken(), receipt.id, renew);
    setBusy(false);
    setConfirmRenew(false);
    if (!result.ok) notify(t(result.error), receipt.number);
    else notify(t(renew ? "rcpt.linkRenewed" : "rcpt.linkReady"), receipt.number);
  }

  if (!canView && ready) return <AppShell title={t("nav.accounting")}><p className="muted">{t("fin.forbidden")}</p></AppShell>;
  if (!ready) return <AppShell title={t("nav.accounting")}><p className="muted">{t("common.loading")}</p></AppShell>;
  if (!receipt) {
    return (
      <AppShell title={t("nav.accounting")}>
        <Link href="/accounting" className="back">{t("rcpt.back")}</Link>
        <p className="muted">{t("rcpt.missing")}</p>
      </AppShell>
    );
  }

  // Rendered only in the browser (after the receipts load), so window is available
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = receipt.shareToken && origin ? `${origin}/${locale}/receipt/${receipt.shareToken}` : "";
  const message = t("rcpt.shareText", { number: receipt.number, link });
  const backHref = receipt.projectId ? `/projects/${receipt.projectId}` : "/accounting";

  return (
    <AppShell title={receipt.number}>
      <div className="stack no-print">
        <div className="between">
          <Link href={backHref} className="back">
            <Icon name="chevl" className="icon icon--sm icon--flip" />
            <span>{t(receipt.projectId ? "rcpt.backProject" : "rcpt.back")}</span>
          </Link>
          <div className="rv-actions">
            <button type="button" className="btn btn--primary" onClick={() => window.print()}>
              <Icon name="download" />
              {t("rcpt.download")}
            </button>
          </div>
        </div>
        <p className="muted">{t("rcpt.printHint")}</p>
        <div className="card stack">
          <div>
            <b>{t("rcpt.shareTitle")}</b>
            <p className="muted" style={{ margin: "4px 0 0" }}>{t("rcpt.shareNote")}</p>
          </div>
          {link ? (
            <>
              <div className="rv-share">
                <input className="input" readOnly value={link} aria-label={t("rcpt.shareTitle")} onFocus={(event) => event.target.select()} />
                <button type="button" className="btn btn--secondary" onClick={() => {
                  void navigator.clipboard.writeText(link).then(() => notify(t("rcpt.copied"), receipt.number), () => notify(t("rcpt.copyFailed"), receipt.number));
                }}>{t("rcpt.copy")}</button>
              </div>
              <div className="rv-share">
                <a className="btn btn--secondary btn--sm" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">{t("rcpt.whatsapp")}</a>
                <a className="btn btn--secondary btn--sm" href={`mailto:?subject=${encodeURIComponent(t("rcpt.emailSubject", { number: receipt.number }))}&body=${encodeURIComponent(message)}`}>{t("rcpt.email")}</a>
                {canManage ? <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => setConfirmRenew(true)}>{t("rcpt.renew")}</button> : null}
              </div>
            </>
          ) : canManage ? (
            <div><button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void makeLink(false)}>{t("rcpt.makeLink")}</button></div>
          ) : (
            <p className="muted">{t("rcpt.noLink")}</p>
          )}
        </div>
      </div>
      <ReceiptFit>
        <ReceiptVoucher receipt={receipt} invoiceNumber={invoiceNumber} />
      </ReceiptFit>
      <Modal open={confirmRenew} title={t("rcpt.renewTitle")} onClose={() => setConfirmRenew(false)}>
        <div className="stack">
          <p>{t("rcpt.renewBody")}</p>
          <div className="hstack" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmRenew(false)}>{t("btn.cancel")}</button>
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void makeLink(true)}>{t("rcpt.renew")}</button>
          </div>
        </div>
      </Modal>
      <Toast open={Boolean(toast)} title={toast?.title ?? ""} detail={toast?.detail ?? ""} />
    </AppShell>
  );
}
