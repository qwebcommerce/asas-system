"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { ProjectSelect } from "@/components/project-select";
import { useOffers } from "@/components/use-offers";
import { Toast } from "@/components/ui/overlay";
import { Link, useRouter } from "@/i18n/navigation";
import { qatarToday } from "@/lib/hr";
import { architectureStages, isOfferKind, defaultShape, defaultPayments, lineAmount, lineQty, offerKinds, offerProblem, offerStatuses, offerTitle, offerTotals, offerUnits, paymentAmounts, priceById, priceListFor, totalArea, tradesFor, type MeasureShape, type Offer, type OfferInput, type OfferKind, type OfferLine, type OfferPayment, type OfferStage, type OfferStatus, type OfferTrade, type OfferUnit } from "@/lib/offers";
import { createOffer, updateOffer } from "@/server/offers";

const savedFlag = "asas-offer-saved";

type DraftLine = {
  key: string;
  roomEn: string;
  roomAr: string;
  priceId: string;
  unit: OfferUnit;
  shape: MeasureShape;
  l: string;
  w: string;
  h: string;
  qty: string;
  rate: string;
  units: string;
};

export function OfferForm({ offerId, type }: { offerId?: string; type?: string }) {
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

  if (!offer && !isOfferKind(type)) return <KindPicker />;

  return <Editor key={offer?.id ?? `new-${type}`} initial={offer ?? null} newKind={isOfferKind(type) ? type : "architecture"} />;
}

const kindIcons: Record<OfferKind, string> = {
  architecture: "ruler",
  fitout: "grid",
  interior: "home",
  construction: "brief",
};

/** First step of a new offer: choose its type, then the form opens for that type. */
function KindPicker() {
  const t = useTranslations();
  return (
    <AppShell title={t("off.title")}>
      <Link href="/offers" className="back">
        <Icon name="chevl" className="icon icon--sm icon--flip" />
        <span>{t("off.back")}</span>
      </Link>
      <div className="page-header">
        <div>
          <span className="eyebrow">{t("nav.offers")}</span>
          <h2 className="page-title">{t("off.pickTitle")}</h2>
          <p className="page-sub">{t("off.pickSub")}</p>
        </div>
      </div>
      <nav className="kind-pick" aria-label={t("off.kind")}>
        {offerKinds.map((kind, index) => (
          <Link key={kind} href={`/offers/new?type=${kind}`} className="card kind-pick__item">
            <span className="tile-icon"><Icon name={kindIcons[kind]} /></span>
            <span className="kind-pick__text">
              <b>{t(`off.${kind}`)}</b>
              <small>{t(`off.pick.${kind}`)}</small>
            </span>
            <span className="kind-pick__num num" aria-hidden="true">0{index + 1}</span>
            <Icon name="chevr" className="icon icon--sm kind-pick__go icon--flip" />
          </Link>
        ))}
      </nav>
    </AppShell>
  );
}

function Editor({ initial, newKind }: { initial: Offer | null; newKind: OfferKind }) {
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
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [addressEn, setAddressEn] = useState(initial?.addressEn ?? "");
  const [addressAr, setAddressAr] = useState(initial?.addressAr ?? "");
  const [capacityEn, setCapacityEn] = useState(initial?.capacityEn ?? (initial ? "" : "Representative of the land and property"));
  const [capacityAr, setCapacityAr] = useState(initial?.capacityAr ?? (initial ? "" : "بصفته ممثل الارض والعقار"));
  const [reference, setReference] = useState(initial?.reference ?? "");
  // The type is chosen before the form opens and is fixed once the offer is saved
  const kind: OfferKind = initial?.kind ?? newKind;
  const [issuedOn, setIssuedOn] = useState(initial?.issuedOn || qatarToday());
  const [projectId, setProjectId] = useState(initial?.projectId ?? "");
  const [scopeEn, setScopeEn] = useState(initial?.scopeEn ?? "");
  const [scopeAr, setScopeAr] = useState(initial?.scopeAr ?? "");
  const [stages, setStages] = useState<StageDraft[]>(() => (initial ? initial.stages : newKind === "architecture" ? architectureStages() : []).map(stageDraft));
  const [payments, setPayments] = useState<PayDraft[]>(() => (initial?.payments?.length ? initial.payments : defaultPayments()).map(payDraft));
  const [savedNote, setSavedNote] = useState("");
  const [toast, setToast] = useState(false);
  const designOnly = kind === "architecture";
  const [lines, setLines] = useState<DraftLine[]>(() => (initial?.lines.length ? initial.lines.map(toDraft) : [blankLine(designOnly ? "arch-design" : "paint")]));
  const [filter, setFilter] = useState<OfferTrade | "all">("all");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const visible = lines.filter((line) => filter === "all" || priceById(line.priceId)?.trade === filter);
  const measured = lines.map(toLine).filter((line): line is OfferLine => line !== null);
  const totals = offerTotals(measured, whole(discountPct, 100) ?? 0);
  const area = totalArea(measured);
  const due = paymentAmounts(totals.total, payments.map((payment) => ({ percent: whole(payment.percent, 100) ?? -1 })));

  useEffect(() => {
    if (sessionStorage.getItem(savedFlag) !== "1") return;
    setToast(true);
    const timer = window.setTimeout(() => {
      sessionStorage.removeItem(savedFlag);
      setToast(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, []);

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function patchStage(key: string, patch: Partial<StageDraft>) {
    setStages((current) => current.map((stage) => (stage.key === key ? { ...stage, ...patch } : stage)));
  }

  function patchPay(key: string, patch: Partial<PayDraft>) {
    setPayments((current) => current.map((payment) => (payment.key === key ? { ...payment, ...patch } : payment)));
  }

  async function save() {
    if (saving) return;
    const discount = whole(discountPct, 100);
    const input: OfferInput = {
      clientEn,
      clientAr,
      phone: phone.trim(),
      clientId: clientId.trim(),
      addressEn,
      addressAr,
      capacityEn,
      capacityAr,
      projectEn,
      projectAr,
      reference,
      kind,
      projectId,
      issuedOn,
      scopeEn,
      scopeAr,
      stages: stages.map(toStage).filter((stage) => stage.titleEn || stage.titleAr || stage.detailEn || stage.detailAr),
      payments: payments.map(toPayment),
      status,
      discountPct: discount ?? -1,
      validUntil,
      lines: lines.flatMap((line) => {
        const next = toLine(line);
        return next ? [next] : [];
      }),
    };
    const problem = offerProblem(input);
    if (problem) {
      setSavedNote("");
      setError(t(problem));
      return;
    }
    setSaving(true);
    const result = initial
      ? await updateOffer(await getToken(), initial.id, input)
      : await createOffer(await getToken(), input);
    setSaving(false);
    if (!result.ok) {
      setError(t(result.error ?? "auth.failed"));
      return;
    }
    setError("");
    setSavedNote(t("off.saved"));
    setToast(true);
    window.setTimeout(() => setToast(false), 3000);
    if (!initial && result.id) {
      sessionStorage.setItem(savedFlag, "1");
      router.push(`/offers/${result.id}`);
    }
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
          <p className="kind-chosen">
            <span className="badge badge--accent">{t(`off.${kind}`)}</span>
            {!initial ? <Link href="/offers/new" className="link">{t("off.changeType")}</Link> : null}
          </p>
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
              <ProjectSelect
                id="offer-project"
                label={t("off.linkedProject")}
                none={t("off.noProject")}
                value={projectId}
                onChange={(id, project) => {
                  setProjectId(id);
                  if (!project) return;
                  // Fill empty fields from the project to save typing
                  if (!clientEn) setClientEn(project.clientEn);
                  if (!clientAr) setClientAr(project.clientAr);
                  if (!projectEn) setProjectEn(project.nameEn);
                  if (!projectAr) setProjectAr(project.nameAr);
                  if (!phone) setPhone(project.clientPhone);
                  if (!clientId) setClientId(project.clientIdNo);
                  if (!addressEn) setAddressEn(project.clientAddressEn);
                  if (!addressAr) setAddressAr(project.clientAddressAr);
                }}
              />
              <div className="field">
                <label>{t("col.status")}</label>
                <select className="select" value={status} onChange={(event) => setStatus(event.target.value as OfferStatus)}>
                  {offerStatuses.map((item) => <option key={item} value={item}>{t(`off.${item}`)}</option>)}
                </select>
              </div>
              <Field label={t("off.discount")} value={discountPct} onChange={setDiscountPct} type="number" />
              <Field label={t("off.validUntil")} value={validUntil} onChange={setValidUntil} type="date" />
              <Field label={t("off.phone")} value={phone} onChange={setPhone} />
              <Field label={t("off.clientId")} value={clientId} onChange={setClientId} />
              <Field label={t("off.address")} value={addressEn} onChange={setAddressEn} />
              <Field label={t("off.addressAr")} value={addressAr} onChange={setAddressAr} />
              <Field label={t("off.capacity")} value={capacityEn} onChange={setCapacityEn} />
              <Field label={t("off.capacityAr")} value={capacityAr} onChange={setCapacityAr} />
              <Field label={t("off.projectNo")} value={reference} onChange={setReference} />
              <Field label={t("off.issuedOn")} value={issuedOn} onChange={setIssuedOn} type="date" />
            </div>
            {designOnly ? null : (
              <>
                <Field label={t("off.scope")} value={scopeEn} onChange={setScopeEn} area />
                <Field label={t("off.scopeAr")} value={scopeAr} onChange={setScopeAr} area />
              </>
            )}
          </div>
          <div className="card stack">
            <div className="between">
              <h3 className="card-title">{t("off.stages")}</h3>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setStages(architectureStages().map(stageDraft))}>{t("off.stageTemplate")}</button>
            </div>
            {stages.map((stage) => (
              <div className="stack stack--sm" key={stage.key}>
                <div className="form-grid form-grid--2">
                  <Field label={t("off.stageTitle")} value={stage.titleEn} onChange={(titleEn) => patchStage(stage.key, { titleEn })} />
                  <Field label={t("off.stageTitleAr")} value={stage.titleAr} onChange={(titleAr) => patchStage(stage.key, { titleAr })} />
                </div>
                <Field label={t("off.stageDetail")} value={stage.detailEn} onChange={(detailEn) => patchStage(stage.key, { detailEn })} area />
                <Field label={t("off.stageDetailAr")} value={stage.detailAr} onChange={(detailAr) => patchStage(stage.key, { detailAr })} area />
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStages((current) => current.filter((item) => item.key !== stage.key))}>{t("us.delete")}</button>
              </div>
            ))}
            <button type="button" className="link" onClick={() => setStages((current) => [...current, stageDraft({ titleEn: "", titleAr: "", detailEn: "", detailAr: "" })])}>
              <Icon name="plus" className="icon icon--sm" />
              {t("off.stageAdd")}
            </button>
          </div>
          {designOnly ? (
            <DesignRows lines={lines} onChange={updateLine} onAdd={() => setLines((current) => [...current, blankLine("arch-design")])} onRemove={(key) => setLines((current) => current.filter((item) => item.key !== key))} />
          ) : (
            <>
            <div className="hstack">
              <button type="button" className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("off.all")}</button>
              {tradesFor(kind).map((trade) => (
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
                    const qty = measuredLine ? lineQty(measuredLine) : 0;
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
                                shape: next?.shape ?? defaultShape(line.unit, priceById(line.priceId)?.trade),
                              });
                            }}
                          >
                            {priceListFor(kind).map((item) => <option key={item.id} value={item.id}>{locale === "ar" ? item.nameAr : item.nameEn}</option>)}
                          </select>
                        </td>
                        <td data-label={t("col.unit")}>
                          <select className="select" value={line.unit} onChange={(event) => {
                            const unit = event.target.value as OfferUnit;
                            updateLine(line.key, { unit, shape: defaultShape(unit, priceById(line.priceId)?.trade) });
                          }}>
                            {offerUnits.map((unit) => <option key={unit} value={unit}>{t(`off.${unit}`)}</option>)}
                          </select>
                          {line.unit === "m2" ? (
                            <select className="select" value={line.shape === "walls" ? "walls" : "area"} onChange={(event) => updateLine(line.key, { shape: event.target.value as MeasureShape })} style={{ marginTop: 6 }}>
                              <option value="area">{t("off.shapeArea")}</option>
                              <option value="walls">{t("off.shapeWalls")}</option>
                            </select>
                          ) : null}
                        </td>
                        <td data-label="L">{line.shape === "count" ? <span className="muted">—</span> : <input className="input num" type="number" min={0} step="0.01" value={line.l} onChange={(event) => updateLine(line.key, { l: event.target.value })} />}</td>
                        <td data-label="W">{line.shape === "walls" || line.shape === "area" ? <input className="input num" type="number" min={0} step="0.01" value={line.w} onChange={(event) => updateLine(line.key, { w: event.target.value })} /> : <span className="muted">—</span>}</td>
                        <td data-label="H">{line.shape === "walls" ? <input className="input num" type="number" min={0} step="0.01" value={line.h} onChange={(event) => updateLine(line.key, { h: event.target.value })} /> : <span className="muted">—</span>}</td>
                        <td data-label={t("col.qty")} className="num strong">
                          {line.shape === "count" ? (
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
            </>
          )}
          <p className="muted">{t("off.ratesNote")}</p>
          <div className="card stack">
            <div className="between">
              <h3 className="card-title">{t("off.payments")}</h3>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setPayments((current) => [...current, payDraft({ labelEn: "", labelAr: "", percent: 0, whenEn: "", whenAr: "" })])}>{t("off.payAdd")}</button>
            </div>
            {payments.map((payment, index) => (
              <div className="stack stack--sm" key={payment.key}>
                <div className="form-grid form-grid--2">
                  <Field label={t("off.payLabel")} value={payment.labelEn} onChange={(labelEn) => patchPay(payment.key, { labelEn })} />
                  <Field label={t("off.payLabelAr")} value={payment.labelAr} onChange={(labelAr) => patchPay(payment.key, { labelAr })} />
                  <Field label={t("off.payWhen")} value={payment.whenEn} onChange={(whenEn) => patchPay(payment.key, { whenEn })} />
                  <Field label={t("off.payWhenAr")} value={payment.whenAr} onChange={(whenAr) => patchPay(payment.key, { whenAr })} />
                  <Field label={t("off.payPercent")} value={payment.percent} onChange={(percent) => patchPay(payment.key, { percent })} type="number" />
                  <div className="field">
                    <label>{t("off.amountDue")}</label>
                    <b className="num"><bdi>{formatQar(Math.max(0, due[index] ?? 0), locale)}</bdi></b>
                  </div>
                </div>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPayments((current) => current.filter((item) => item.key !== payment.key))}>{t("us.delete")}</button>
              </div>
            ))}
          </div>
        </div>
        <div className="card stack stack--sm">
          <h3 className="card-title">{t("off.summary")}</h3>
          <div className="kv"><span>{t("off.client")}</span><b>{locale === "ar" ? clientAr || clientEn : clientEn || clientAr || t("time.none")}</b></div>
          <div className="kv"><span>{t("off.items")}</span><span className="num">{measured.length}</span></div>
          {area > 0 ? <div className="kv"><span>{t("off.totalArea")}</span><span className="num"><bdi>{formatQty(area, locale)} m²</bdi></span></div> : null}
          <div className="kv"><span>{t("off.subtotal")}</span><span className="num"><bdi>{formatQar(totals.subtotal, locale)}</bdi></span></div>
          <div className="kv"><span>{t("off.discount")} <bdi className="num">{whole(discountPct, 100) ?? 0}%</bdi></span><span className="num"><bdi>− {formatQar(totals.discount, locale)}</bdi></span></div>
          <div className="total">
            <b>{t("off.total")}</b>
            <strong className="num"><bdi>{formatQar(totals.total, locale)}</bdi></strong>
          </div>
          <small className="muted">{t("off.valid")}</small>
          {initial ? (
            <div className="stack stack--sm no-print">
              <Link href={`/offers/${initial.id}/quotation`} className="btn btn--primary btn--block">
                <Icon name="eye" />
                {t("off.viewQuote")}
              </Link>
              <Link href={`/offers/${initial.id}/quotation?print=1`} className="btn btn--secondary" style={{ width: "100%" }}>
                <Icon name="download" />
                {t("off.downloadQuote")}
              </Link>
              <Link href={`/offers/${initial.id}/contract`} className="btn btn--primary btn--block">
                <Icon name="eye" />
                {t("off.viewContract")}
              </Link>
              <Link href={`/offers/${initial.id}/contract?print=1`} className="btn btn--secondary" style={{ width: "100%" }}>
                <Icon name="download" />
                {t("off.downloadContract")}
              </Link>
              <small className="muted">{t("off.savedNote")}</small>
            </div>
          ) : <small className="muted">{t("off.saveFirst")}</small>}
          {savedNote ? <p>{savedNote}</p> : null}
          {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
          <button type="submit" className="btn btn--primary btn--block" disabled={saving}>{initial ? t("set.save") : t("btn.saveDraft")}</button>
          <Link href="/offers" className="btn btn--secondary" style={{ width: "100%" }}>{t("btn.cancel")}</Link>
        </div>
      </form>
      <Toast open={toast} title={t("off.saved")} detail={t("off.savedNote")} />
    </AppShell>
  );
}

function Field({ label, value, onChange, type = "text", area = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; area?: boolean }) {
  return (
    <div className="field">
      <label>{label}</label>
      {area ? <textarea className="textarea" value={value} onChange={(event) => onChange(event.target.value)} /> : <input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />}
    </div>
  );
}

type StageDraft = OfferStage & { key: string };
type PayDraft = Omit<OfferPayment, "percent"> & { key: string; percent: string };

function stageDraft(stage: OfferStage): StageDraft {
  return { key: crypto.randomUUID(), ...stage };
}

function payDraft(payment: OfferPayment): PayDraft {
  return { key: crypto.randomUUID(), labelEn: payment.labelEn, labelAr: payment.labelAr, whenEn: payment.whenEn, whenAr: payment.whenAr, percent: String(payment.percent) };
}

function toStage(stage: StageDraft): OfferStage {
  return { titleEn: stage.titleEn.trim(), titleAr: stage.titleAr.trim(), detailEn: stage.detailEn.trim(), detailAr: stage.detailAr.trim() };
}

function toPayment(payment: PayDraft): OfferPayment {
  return {
    labelEn: payment.labelEn.trim(),
    labelAr: payment.labelAr.trim(),
    whenEn: payment.whenEn.trim(),
    whenAr: payment.whenAr.trim(),
    percent: whole(payment.percent, 100) ?? -1,
  };
}

function blankLine(priceId = "paint"): DraftLine {
  const price = priceById(priceId);
  return { key: crypto.randomUUID(), roomEn: "", roomAr: "", priceId: price?.id ?? "paint", unit: price?.unit ?? "m2", shape: price?.shape ?? "walls", l: "", w: "", h: "", qty: "", rate: String(price?.rate ?? 0), units: "1" };
}

function toDraft(line: OfferLine): DraftLine {
  return {
    key: crypto.randomUUID(),
    roomEn: line.roomEn,
    roomAr: line.roomAr,
    priceId: line.priceId,
    unit: line.unit,
    shape: line.shape,
    l: line.l === null ? "" : String(line.l),
    w: line.w === null ? "" : String(line.w),
    h: line.h === null ? "" : String(line.h),
    qty: String(line.qty),
    rate: String(line.rate),
    units: String(line.units || 1),
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
    shape: line.shape,
    rate,
    units: whole(line.units, 999) || 1,
  };
}

/**
 * Architectural design pricing: one row per area (e.g. Ground Floor), in m², times the number
 * of identical units, times the unit price per m². The rows also make the quotation's scope list.
 */
function DesignRows({
  lines,
  onChange,
  onAdd,
  onRemove,
}: {
  lines: DraftLine[];
  onChange: (key: string, patch: Partial<DraftLine>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <div className="card card--flush table-wrap">
      <div className="between" style={{ padding: "16px 18px 4px" }}>
        <h3 className="card-title">{t("off.areas")}</h3>
      </div>
      <table className="table table--cards">
        <thead>
          <tr>
            <th>{t("off.areaName")}</th>
            <th>{t("off.sqm")}</th>
            <th>{t("off.units")}</th>
            <th>{t("off.unitPrice")}</th>
            <th className="end">{t("col.total")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? <tr><td colSpan={6}>{t("off.noAreas")}</td></tr> : null}
          {lines.map((line) => {
            const row = toLine(line);
            return (
              <tr key={line.key}>
                <td data-label={t("off.areaName")}>
                  <input className="input" placeholder={t("off.areaNameEn")} value={line.roomEn} onChange={(event) => onChange(line.key, { roomEn: event.target.value })} />
                  <input className="input" dir="rtl" lang="ar" placeholder={t("off.areaNameAr")} value={line.roomAr} onChange={(event) => onChange(line.key, { roomAr: event.target.value })} style={{ marginTop: 6 }} />
                </td>
                <td data-label={t("off.sqm")}><input className="input num" type="number" min={0} step="0.1" value={line.qty} onChange={(event) => onChange(line.key, { qty: event.target.value })} /></td>
                <td data-label={t("off.units")}><input className="input num" type="number" min={1} max={999} step="1" value={line.units} onChange={(event) => onChange(line.key, { units: event.target.value })} /></td>
                <td data-label={t("off.unitPrice")}><input className="input num" type="number" min={0} step="0.01" value={line.rate} onChange={(event) => onChange(line.key, { rate: event.target.value })} /></td>
                <td data-label={t("col.total")} className="num end strong">
                  <bdi>{formatQar(row ? lineAmount(row) : 0, locale)}</bdi>
                  {row && lineQty(row) > 0 ? <small className="muted" style={{ display: "block" }}><bdi>{formatQty(lineQty(row), locale)} m²</bdi></small> : null}
                </td>
                <td className="end" data-label="">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => onRemove(line.key)}>{t("us.delete")}</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
        <button type="button" className="link" onClick={onAdd}>
          <Icon name="plus" className="icon icon--sm" />
          {t("off.addArea")}
        </button>
      </div>
    </div>
  );
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

