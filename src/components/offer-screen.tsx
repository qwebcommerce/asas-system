"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useOffers } from "@/components/use-offers";
import { Toast } from "@/components/ui/overlay";
import { Link } from "@/i18n/navigation";
import { offerTitle, offerTotals, type OfferStatus } from "@/lib/offers";
import { deleteOffer } from "@/server/offers";

export function OfferScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();
  const { offers, ready, canManage, canView } = useOffers();
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);
  const [error, setError] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const ordered = [...offers].sort((a, b) => b.number.localeCompare(a.number));

  return (
    <AppShell title={t("nav.offers")}>
      <div className="page-header">
        <div>
          <span className="eyebrow">{t("nav.offers")}</span>
          <h2 className="page-title">{t("nav.offers")}</h2>
          <p className="page-sub">{ready ? t("off.count", { count: offers.length }) : t("common.loading")}</p>
        </div>
        {canManage ? (
          <Link href="/offers/new" className="btn btn--primary">
            <Icon name="plus" />
            {t("off.title")}
          </Link>
        ) : null}
      </div>
      {!canView ? <p className="muted">{t("off.forbidden")}</p> : null}
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      {canView ? (
        <div className="card card--flush table-wrap">
          <table className="table table--cards">
            <thead>
              <tr>
                <th>{t("off.number")}</th>
                <th>{t("off.client")}</th>
                <th>{t("off.project")}</th>
                <th>{t("col.status")}</th>
                <th>{t("off.validUntil")}</th>
                <th className="end">{t("off.total")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ordered.length === 0 ? <tr><td colSpan={7}>{ready ? t("off.empty") : t("common.loading")}</td></tr> : null}
              {ordered.map((offer) => {
                const totals = offerTotals(offer.lines, offer.discountPct, offer.packageAmount);
                return (
                  <tr key={offer.id}>
                    <td data-label={t("off.number")} className="num"><bdi>{offer.number}</bdi></td>
                    <td data-label={t("off.client")}>
                      <b>{offerTitle(offer, locale)}</b>
                      <small className="muted" style={{ display: "block" }}>{locale === "ar" ? offer.clientEn : offer.clientAr}</small>
                    </td>
                    <td data-label={t("off.project")}>{locale === "ar" ? offer.projectAr || offer.projectEn : offer.projectEn}</td>
                    <td data-label={t("col.status")}><span className={`badge badge--${statusTone(offer.status)}`}>{t(`off.${offer.status}`)}</span></td>
                    <td data-label={t("off.validUntil")} className="num">{offer.validUntil ? formatDay(offer.validUntil, locale) : t("time.none")}</td>
                    <td data-label={t("off.total")} className="num end"><bdi>{formatQar(totals.total, locale)}</bdi></td>
                    <td className="end" data-label={t("off.actions")}>
                      <RowMenu
                        open={menuId === offer.id}
                        onToggle={() => setMenuId((current) => current === offer.id ? null : offer.id)}
                        onClose={() => setMenuId(null)}
                        canManage={canManage}
                        offerId={offer.id}
                        onDelete={() => {
                          setMenuId(null);
                          void (async () => {
                            const result = await deleteOffer(await getToken(), offer.id);
                            if (!result.ok) {
                              setError(t(result.error ?? "auth.failed"));
                              return;
                            }
                            setError("");
                            setToast({ title: t("off.removed"), detail: offer.number });
                            window.setTimeout(() => setToast(null), 3000);
                          })();
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <Toast open={Boolean(toast)} title={toast?.title ?? ""} detail={toast?.detail ?? ""} />
    </AppShell>
  );
}

function RowMenu({ open, onToggle, onClose, canManage, offerId, onDelete }: { open: boolean; onToggle: () => void; onClose: () => void; canManage: boolean; offerId: string; onDelete: () => void }) {
  const t = useTranslations();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });

  useEffect(() => {
    if (!open) return;
    function place() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = 220;
      const rtl = document.documentElement.dir === "rtl";
      const left = rtl ? rect.left : Math.max(8, rect.right - width);
      const openUp = window.innerHeight - rect.bottom < 280;
      setBox(openUp ? { bottom: window.innerHeight - rect.top + 4, left } : { top: rect.bottom + 4, left });
    }
    function outside(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target) || listRef.current?.contains(target)) return;
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, open]);

  return (
    <div className="row-menu">
      <button ref={buttonRef} type="button" className="icon-btn" aria-haspopup="menu" aria-expanded={open} aria-label={t("off.actions")} onClick={onToggle}>
        <Icon name="more" />
      </button>
      {open ? (
        <div ref={listRef} className="row-menu__list" role="menu" style={box}>
          <Link role="menuitem" href={`/offers/${offerId}/quotation`} onClick={onClose}>{t("off.viewQuote")}</Link>
          <Link role="menuitem" href={`/offers/${offerId}/quotation?print=1`} onClick={onClose}>{t("off.downloadQuote")}</Link>
          <Link role="menuitem" href={`/offers/${offerId}/contract`} onClick={onClose}>{t("off.viewContract")}</Link>
          <Link role="menuitem" href={`/offers/${offerId}/contract?print=1`} onClick={onClose}>{t("off.downloadContract")}</Link>
          {canManage ? <Link role="menuitem" href={`/offers/${offerId}`} onClick={onClose}>{t("us.edit")}</Link> : null}
          {canManage ? <button type="button" role="menuitem" onClick={onDelete}>{t("us.delete")}</button> : null}
        </div>
      ) : null}
    </div>
  );
}

function statusTone(status: OfferStatus) {
  if (status === "accepted") return "ok";
  if (status === "rejected" || status === "expired") return "danger";
  if (status === "sent") return "info";
  return "warn";
}

function formatDay(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${value}T12:00:00+03:00`));
}

function formatQar(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "QAR", numberingSystem: "latn", maximumFractionDigits: 0 }).format(amount);
}
