"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useOffers } from "@/components/use-offers";
import { Link, useRouter } from "@/i18n/navigation";
import { qatarToday } from "@/lib/hr";
import { lineAmount, measureQty, offerStatuses, offerTitle, offerTotals, offerTrades, offerUnits, priceById, priceList, type Offer, type OfferInput, type OfferLine, type OfferStatus, type OfferTrade, type OfferUnit } from "@/lib/offers";
import { createOffer, updateOffer } from "@/server/offers";

type DraftLine = {
  key: string;
  roomEn: string;
  roomAr: string;
  priceId: string;
  unit: OfferUnit;
  l: string;
  w: string;
  h: string;
  qty: string;
  rate: string;
};

export function OfferForm({ offerId }: { offerId?: string }) {
  const t = useTranslations();
  const { offers, ready, canManage, canView } = useOffers();
  const offer = offerId ? offers.find((item) => item.id === offerId) : undefined;

  if (!canView && ready) {
    return <AppShell title={t("nav.offers")}><p className="muted">{t("off.forbidden")}</p></AppShell>;
  }
  if (offerId && !ready) {
    return <AppShell title={t("nav.offers")}><p className="muted">{t("common.loading")}</p></AppShell>;
  }
  if (offerId && !offer) {
    return (
      <AppShell title={t("nav.offers")}>
        <Link href="/offers" className="back">{t("off.back")}</Link>
        <p className="muted">{t("off.missing")}</p>
      </AppShell>
    );
  }
  if (!canManage) {
    return (
      <AppShell title={t("nav.offers")}>
        <Link href="/offers" className="back">{t("off.back")}</Link>
        <p className="muted">{t("off.forbidden")}</p>
      </AppShell>
    );
  }

  return <Editor key={offer?.id ?? "new"} initial={offer ?? null} />;
}

function Editor({ initial }: { initial: Offer | null }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { getToken } = useAuth();
  const [clientEn, setClientEn] = useState(initial?.clientEn ?? "");
  const [clientAr, setClientAr] = useState(initial?.clientAr ?? "");
  const [projectEn, setProjectEn] = useState(initial?.projectEn ?? "");
  const [projectAr, setProjectAr] = useState(initial?.projectAr ?? "");
  const [status, setStatus] = useState<OfferStatus>(initial?.status ?? "draft");
  const [discountPct, setDiscountPct] = useState(String(initial?.discountPct ?? 5));
  const [validUntil, setValidUntil] = useState(initial?.validUntil || plusDays(qatarToday(), 30));
  const [lines, setLines] = useState<DraftLine[]>(() => (initial?.lines.length ? initial.lines.map(toDraft) : [blankLine()]));
  const [filter, setFilter] = useState<OfferTrade | "all">("all");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const visible = lines.filter((line) => filter === "all" || priceById(line.priceId)?.trade === filter);
  const measured = lines.map(toLine).filter((line): line is OfferLine => line !== null);
  const totals = offerTotals(measured, whole(discountPct, 100) ?? 0);

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  async function save() {
    if (saving) return;
    const discount = whole(discountPct, 100);
    const input: OfferInput = {
      clientEn,
      clientAr,
      projectEn,
      projectAr,
      status,
      discountPct: discount ?? -1,
      validUntil,
      lines: lines.flatMap((line) => {
        const next = toLine(line);
        return next ? [next] : [];
      }),
    };
    setSaving(true);
    const result = initial
      ? await updateOffer(await getToken(), initial.id, input)
      : await createOffer(await getToken(), input);
    setSaving(false);
    if (!result.ok) {
      setError(t(result.error ?? "auth.failed"));
      return;
    }
    router.push("/offers");
  }

  return (
    <AppShell title={initial ? t("off.edit") : t("off.title")}>
      <Link href="/offers" className="back">
        <Icon name="chevl" className="icon icon--sm icon--flip" />
        <span>{t("off.back")}</span>
      </Link>
      <div className="page-header">
        <div>
          <span className="eyebrow">{t("nav.offers")}</span>
          <h2 className="page-title">
            {initial ? t("off.edit") : t("off.title")}
            {initial ? <span className="page-title num" style={{ fontSize: 22 }}> · <bdi>{initial.number}</bdi></span> : null}
          </h2>
          {initial ? <p className="page-sub">{offerTitle(initial, locale)}</p> : null}
        </div>
      </div>
      <form
        className="split split--wide"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="stack">
          <div className="card stack">
            <div className="form-grid form-grid--2">
              <Field label={t("off.client")} value={clientEn} onChange={setClientEn} />
              <Field label={t("off.clientAr")} value={clientAr} onChange={setClientAr} />
              <Field label={t("off.project")} value={projectEn} onChange={setProjectEn} />
              <Field label={t("off.projectAr")} value={projectAr} onChange={setProjectAr} />
              <div className="field">
                <label>{t("col.status")}</label>
                <select className="select" value={status} onChange={(event) => setStatus(event.target.value as OfferStatus)}>
                  {offerStatuses.map((item) => <option key={item} value={item}>{t(`off.${item}`)}</option>)}
                </select>
              </div>
              <Field label={t("off.discount")} value={discountPct} onChange={setDiscountPct} type="number" />
              <Field label={t("off.validUntil")} value={validUntil} onChange={setValidUntil} type="date" />
            </div>
          </div>
          <div className="hstack">
            <button type="button" className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("off.all")}</button>
            {offerTrades.map((trade) => (
              <button key={trade} type="button" className="chip" aria-pressed={filter === trade} onClick={() => setFilter(trade)}>{t(`off.${trade}`)}</button>
            ))}
          </div>
          <div className="card card--flush table-wrap">
            <table className="table table--cards">
              <thead>
                <tr>
                  <th>{t("col.room")}</th>
                  <th>{t("col.work")}</th>
                  <th>{t("col.unit")}</th>
                  <th>L m</th>
                  <th>W m</th>
                  <th>H m</th>
                  <th>{t("col.qty")}</th>
                  <th>{t("col.rate")}</th>
                  <th className="end">{t("col.total")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? <tr><td colSpan={10}>{t("off.emptyLines")}</td></tr> : null}
                {visible.map((line) => {
                  const measuredLine = toLine(line);
                  const qty = measuredLine ? measureQty(measuredLine.unit, measuredLine.l, measuredLine.w, measuredLine.h, measuredLine.qty) : 0;
                  const amount = measuredLine ? lineAmount(measuredLine) : 0;
                  return (
                    <tr key={line.key}>
                      <td data-label={t("col.room")}>
                        <input className="input" placeholder={t("off.roomEn")} value={line.roomEn} onChange={(event) => updateLine(line.key, { roomEn: event.target.value })} />
                        <input className="input" placeholder={t("off.roomAr")} value={line.roomAr} onChange={(event) => updateLine(line.key, { roomAr: event.target.value })} style={{ marginTop: 6 }} />
                      </td>
                      <td data-label={t("col.work")}>
                        <select
                          className="select"
                          value={line.priceId}
                          onChange={(event) => {
                            const next = priceById(event.target.value);
                            updateLine(line.key, {
                              priceId: event.target.value,
                              rate: next ? String(next.rate) : line.rate,
                              unit: next?.unit ?? line.unit,
                            });
                          }}
                        >
                          {priceList.map((item) => <option key={item.id} value={item.id}>{locale === "ar" ? item.nameAr : item.nameEn}</option>)}
                        </select>
                      </td>
                      <td data-label={t("col.unit")}>
                        <select className="select" value={line.unit} onChange={(event) => updateLine(line.key, { unit: event.target.value as OfferUnit })}>
                          {offerUnits.map((unit) => <option key={unit} value={unit}>{t(`off.${unit}`)}</option>)}
                        </select>
                      </td>
                      <td data-label="L"><input className="input num" type="number" min={0} step="0.01" value={line.l} onChange={(event) => updateLine(line.key, { l: event.target.value })} /></td>
                      <td data-label="W"><input className="input num" type="number" min={0} step="0.01" value={line.w} onChange={(event) => updateLine(line.key, { w: event.target.value })} /></td>
                      <td data-label="H"><input className="input num" type="number" min={0} step="0.01" value={line.h} onChange={(event) => updateLine(line.key, { h: event.target.value })} /></td>
                      <td data-label={t("col.qty")} className="num strong">
                        {line.unit === "pcs" || line.unit === "set" ? (
                          <input className="input num" type="number" min={0} step="0.1" value={line.qty} onChange={(event) => updateLine(line.key, { qty: event.target.value })} />
                        ) : <bdi>{formatQty(qty, locale)}</bdi>}
                      </td>
                      <td data-label={t("col.rate")}><input className="input num" type="number" min={0} step="0.01" value={line.rate} onChange={(event) => updateLine(line.key, { rate: event.target.value })} /></td>
                      <td data-label={t("col.total")} className="num end strong"><bdi>{formatQar(amount, locale)}</bdi></td>
                      <td className="end" data-label="">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>{t("us.delete")}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                className="link"
                onClick={() => setLines((current) => [...current, blankLine(filter === "all" ? "paint" : filter)])}
              >
                <Icon name="plus" className="icon icon--sm" />
                {t("off.addM")}
              </button>
            </div>
          </div>
          <p className="muted">{t("off.ai")}</p>
        </div>
        <div className="card stack stack--sm">
          <h3 className="card-title">{t("off.summary")}</h3>
          <div className="kv"><span>{t("off.client")}</span><b>{locale === "ar" ? clientAr || clientEn : clientEn || clientAr || t("time.none")}</b></div>
          <div className="kv"><span>{t("off.items")}</span><span className="num">{measured.length}</span></div>
          <div className="kv"><span>{t("off.subtotal")}</span><span className="num"><bdi>{formatQar(totals.subtotal, locale)}</bdi></span></div>
          <div className="kv"><span>{t("off.discount")} <bdi className="num">{whole(discountPct, 100) ?? 0}%</bdi></span><span className="num"><bdi>− {formatQar(totals.discount, locale)}</bdi></span></div>
          <div className="total">
            <b>{t("off.total")}</b>
            <strong className="num"><bdi>{formatQar(totals.total, locale)}</bdi></strong>
          </div>
          <small className="muted">{t("off.valid")}</small>
          {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
          <button type="submit" className="btn btn--primary btn--block" disabled={saving}>{initial ? t("set.save") : t("btn.saveDraft")}</button>
          <Link href="/offers" className="btn btn--secondary" style={{ width: "100%" }}>{t("btn.cancel")}</Link>
        </div>
      </form>
    </AppShell>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function blankLine(priceId = "paint"): DraftLine {
  const price = priceById(priceId);
  return { key: crypto.randomUUID(), roomEn: "", roomAr: "", priceId: price?.id ?? "paint", unit: price?.unit ?? "m2", l: "", w: "", h: "", qty: "", rate: String(price?.rate ?? 0) };
}

function toDraft(line: OfferLine): DraftLine {
  return {
    key: crypto.randomUUID(),
    roomEn: line.roomEn,
    roomAr: line.roomAr,
    priceId: line.priceId,
    unit: line.unit,
    l: line.l === null ? "" : String(line.l),
    w: line.w === null ? "" : String(line.w),
    h: line.h === null ? "" : String(line.h),
    qty: String(line.qty),
    rate: String(line.rate),
  };
}

function toLine(line: DraftLine): OfferLine | null {
  const price = priceById(line.priceId);
  if (!price) return null;
  const rate = Number(line.rate);
  if (!Number.isFinite(rate)) return null;
  return {
    roomEn: line.roomEn,
    roomAr: line.roomAr,
    priceId: price.id,
    workEn: price.nameEn,
    workAr: price.nameAr,
    trade: price.trade,
    l: optionalNumber(line.l),
    w: optionalNumber(line.w),
    h: optionalNumber(line.h),
    qty: optionalNumber(line.qty) ?? 0,
    unit: line.unit,
    rate,
  };
}

function optionalNumber(value: string) {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function whole(value: string, max: number) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > max) return null;
  return number;
}

function plusDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function formatQty(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { numberingSystem: "latn", maximumFractionDigits: 1 }).format(value);
}

function formatQar(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "QAR", numberingSystem: "latn", maximumFractionDigits: 0 }).format(amount);
}

