"use client";

import { startTransition, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { boqEntryCount, boqRows, boqSections, boqUnitLabel } from "@/lib/boq";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { ProjectSelect } from "@/components/project-select";
import { useOffers } from "@/components/use-offers";
import { Toast } from "@/components/ui/overlay";
import { Link, useRouter } from "@/i18n/navigation";
import { qatarToday } from "@/lib/hr";
import { boqLine, defaultCosting, defaultPaymentsFor, lineCosting, manpowerShares, manpowerTotal, type OfferCosting, fitoutUnits, designPriceId, designRate, designStages, discountTypes, isDesignKind, isOfferKind, defaultShape, withDesignRates, lineAmount, lineQty, offerKinds, offerProblem, offerStatuses, offerTitle, offerTotals, paymentAmounts, priceById, priceListFor, totalArea, tradesFor, type MeasureShape, type Offer, type OfferInput, type OfferKind, type OfferLine, type OfferPayment, type OfferStage, type OfferStatus, type OfferTrade, type OfferUnit, type DiscountType } from "@/lib/offers";
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
  // Next keeps a page you leave mounted in the background with its state. After a new offer is
  // saved, the "new" form is reset so that coming back to it can't save the same offer again.
  const [round, setRound] = useState(0);

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

  return <Editor key={offer?.id ?? `new-${type}-${round}`} initial={offer ?? null} newKind={isOfferKind(type) ? type : "architecture"} onCreated={() => setRound((current) => current + 1)} />;
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

function Editor({ initial, newKind, onCreated }: { initial: Offer | null; newKind: OfferKind; onCreated?: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { getToken } = useAuth();
  const [clientEn, setClientEn] = useState(initial?.clientEn ?? "");
  const [clientAr, setClientAr] = useState(initial?.clientAr ?? "");
  const [projectEn, setProjectEn] = useState(initial?.projectEn ?? "");
  const [projectAr, setProjectAr] = useState(initial?.projectAr ?? "");
  const [status, setStatus] = useState<OfferStatus>(initial?.status ?? "draft");
  const [discountType, setDiscountType] = useState<DiscountType>(initial?.discount.type ?? "percent");
  const [discountValue, setDiscountValue] = useState(String(initial?.discount.value ?? 5));
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
  const [stages, setStages] = useState<StageDraft[]>(() => (initial ? initial.stages : designStages(newKind)).map(stageDraft));
  const [payments, setPayments] = useState<PayDraft[]>(() => (initial?.payments?.length ? initial.payments : defaultPaymentsFor(kind)).map(payDraft));
  const [savedNote, setSavedNote] = useState("");
  const [toast, setToast] = useState(false);
  // Architecture and interior design: area rows in m², unit price from the total area,
  // fixed design package and payments (shown read-only until "Edit")
  const designOnly = isDesignKind(kind);
  // Construction: bill of quantities, basement and duration; no scope text or stages, and the
  // payment schedule is fixed and hidden until "Edit"
  const construction = kind === "construction";
  const fixedPayments = designOnly || construction;
  const [editStages, setEditStages] = useState(!designOnly);
  const [editPayments, setEditPayments] = useState(!fixedPayments);
  const [boq, setBoq] = useState<Record<string, BoqDraft>>(() => boqDraft(initial));
  // Construction offers saved with the earlier measurement table keep those rows
  const [extraLines, setExtraLines] = useState<OfferLine[]>(() => (construction && initial ? initial.lines.filter((line) => line.trade !== "boq") : []));
  const [basement, setBasement] = useState(initial?.basement ?? false);
  const [duration, setDuration] = useState(initial?.durationMonths ? String(initial.durationMonths) : "");
  // Construction: manpower helper (men × rate per month × duration ÷ BOQ items); each item
  // has its own waste %, manpower and profit %
  const [costing, setCosting] = useState<CostingDraft>(() => {
    const saved = initial?.costing ?? defaultCosting();
    return { men: String(saved.men), manRate: String(saved.manRate) };
  });
  const [lines, setLines] = useState<DraftLine[]>(() => {
    // Design offers: one line holding the total area in m² (no area names); older offers
    // with several named areas are added up into it
    if (isDesignKind(kind)) {
      const sum = initial ? totalArea(initial.lines) : 0;
      return [{ ...blankLine(designPriceId(kind)), qty: sum ? String(sum) : "", units: "1" }];
    }
    return initial?.lines.length ? initial.lines.map(toDraft) : [blankLine("paint")];
  });
  const [filter, setFilter] = useState<OfferTrade | "all">("all");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // Id of the offer this form created, so a second save updates it instead of adding another
  const [createdId, setCreatedId] = useState("");
  const visible = lines.filter((line) => filter === "all" || priceById(line.priceId)?.trade === filter);
  const measured = construction
    ? [...boqLines(boq), ...extraLines]
    : withDesignRates(kind, lines.map(toLine).filter((line): line is OfferLine => line !== null));
  const discountNumber = whole(discountValue, discountType === "percent" ? 100 : 100_000_000);
  const costingInput: OfferCosting = { men: whole(costing.men, 999) ?? -1, manRate: decimal(costing.manRate) ?? -1 };
  const months = whole(duration, 120) ?? 0;
  const manpower = manpowerTotal({ men: Math.max(0, costingInput.men), manRate: Math.max(0, costingInput.manRate) }, months);
  const totals = offerTotals(measured, { type: discountType, value: discountNumber ?? 0 });
  const area = totalArea(measured);
  const unitRate = isDesignKind(kind) ? designRate(kind, area) : 0;
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
    if (designOnly && area <= 0) {
      setSavedNote("");
      setError(t("off.needArea"));
      return;
    }
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
      scopeEn: construction ? "" : scopeEn,
      scopeAr: construction ? "" : scopeAr,
      stages: construction ? [] : stages.map(toStage).filter((stage) => stage.titleEn || stage.titleAr || stage.detailEn || stage.detailAr),
      payments: payments.map(toPayment),
      status,
      discount: { type: discountType, value: discountNumber ?? -1 },
      validUntil,
      lines: measured,
      basement: construction && basement,
      durationMonths: construction ? whole(duration, 120) ?? -1 : 0,
      costing: construction ? costingInput : defaultCosting(),
    };
    const problem = offerProblem(input);
    if (problem) {
      setSavedNote("");
      setError(t(problem));
      // Open the fixed sections when the problem is in them
      if (problem === "off.needStage") setEditStages(true);
      if (problem === "off.needPay" || problem === "off.payTotal") setEditPayments(true);
      return;
    }
    setSaving(true);
    const savedId = initial?.id || createdId;
    const result = savedId
      ? await updateOffer(await getToken(), savedId, input)
      : await createOffer(await getToken(), input);
    if (!result.ok) {
      setSaving(false);
      setError(t(result.error ?? "auth.failed"));
      return;
    }
    if (!savedId && result.id) {
      // Open the saved offer in place of the "new" page (Back goes to the list, not to this
      // filled-in form), and reset the "new" form in the same step
      const id = result.id;
      setCreatedId(id);
      sessionStorage.setItem(savedFlag, "1");
      startTransition(() => {
        router.replace(`/offers/${id}`);
        onCreated?.();
      });
      return;
    }
    setSaving(false);
    setError("");
    setSavedNote(t("off.saved"));
    setToast(true);
    window.setTimeout(() => setToast(false), 3000);
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
            {designOnly || construction ? null : (
              <>
                <Field label={t("off.scope")} value={scopeEn} onChange={setScopeEn} area />
                <Field label={t("off.scopeAr")} value={scopeAr} onChange={setScopeAr} area />
              </>
            )}
          </div>
          {construction ? (
            <div className="card stack stack--sm">
              <h3 className="card-title">{t("off.projectDetails")}</h3>
              <div className="form-grid form-grid--2">
                <div className="field">
                  <label htmlFor="offer-duration">{t("off.duration")}</label>
                  <input id="offer-duration" className="input num" type="number" min={1} max={120} step={1} inputMode="numeric" value={duration} onChange={(event) => setDuration(event.target.value)} />
                </div>
                <label className="check" style={{ alignSelf: "end", paddingBottom: 10 }}>
                  <input type="checkbox" checked={basement} onChange={(event) => setBasement(event.target.checked)} />
                  <span>{t("off.basement")}</span>
                </label>
              </div>
            </div>
          ) : (
          <div className="card stack">
            <div className="between">
              <h3 className="card-title">{t("off.stages")}</h3>
              <div className="hstack">
                {editStages && isDesignKind(kind) ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStages(designStages(kind).map(stageDraft))}>{t("off.resetDefault")}</button> : null}
                {designOnly ? (
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => setEditStages((open) => !open)}>
                    {editStages ? t("off.doneEditing") : <><Icon name="ruler" className="icon icon--sm" />{t("off.editSection")}</>}
                  </button>
                ) : null}
              </div>
            </div>
            {!editStages ? (
              <ul className="fixed-list">
                {stages.map((stage) => (
                  <li key={stage.key}>
                    <b>{locale === "ar" ? stage.titleAr || stage.titleEn : stage.titleEn || stage.titleAr}</b>
                    <span>{(locale === "ar" ? stage.detailAr || stage.detailEn : stage.detailEn || stage.detailAr).split("\n").join(" · ")}</span>
                  </li>
                ))}
                {stages.length === 0 ? <li className="muted">{t("off.noStages")}</li> : null}
              </ul>
            ) : (
              <>
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
              </>
            )}
          </div>
          )}
          {construction ? (
            <CostingCard
              costing={costing}
              onChange={(patch) => setCosting((current) => ({ ...current, ...patch }))}
              months={months}
              manpower={manpower}
              onSplit={() => {
                const shares = manpowerShares(manpower);
                setBoq((current) => Object.fromEntries(Object.entries(current).map(([id, draft]) => [id, { ...draft, manpower: String(shares.get(id) ?? 0) }])));
              }}
              onFill={(key, value) => setBoq((current) => Object.fromEntries(Object.entries(current).map(([id, draft]) => [id, { ...draft, [key]: value }])))}
            />
          ) : null}
          {construction ? (
            <BoqTable
              lines={measured}
              boq={boq}
              onChange={(id, patch) => setBoq((current) => ({ ...current, [id]: { ...current[id], ...patch } }))}
              extraLines={extraLines}
              onRemoveExtra={(index) => setExtraLines((current) => current.filter((_, i) => i !== index))}
              subtotal={totals.subtotal}
            />
          ) : designOnly ? (
            <DesignArea
              value={lines[0]?.qty ?? ""}
              rate={unitRate}
              area={area}
              onChange={(qty) => setLines((current) => current.map((line, index) => (index === 0 ? { ...line, qty, units: "1" } : line)))}
            />
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
                            {fitoutUnits.map((unit) => <option key={unit} value={unit}>{t(`off.${unit}`)}</option>)}
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
          {designOnly || construction ? null : <p className="muted">{t("off.ratesNote")}</p>}
          <div className="card stack">
            <div className="between">
              <h3 className="card-title">{t("off.payments")}</h3>
              <div className="hstack">
                {editPayments ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPayments((current) => [...current, payDraft({ labelEn: "", labelAr: "", percent: 0, whenEn: "", whenAr: "" })])}>{t("off.payAdd")}</button> : null}
                {editPayments && fixedPayments ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPayments(defaultPaymentsFor(kind).map(payDraft))}>{t("off.resetDefault")}</button> : null}
                {fixedPayments ? (
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => setEditPayments((open) => !open)}>
                    {editPayments ? t("off.doneEditing") : <><Icon name="ruler" className="icon icon--sm" />{t("off.editSection")}</>}
                  </button>
                ) : null}
              </div>
            </div>
            {!editPayments && construction ? (
              <p className="muted" style={{ margin: 0 }}>{t("off.paymentsHidden", { count: payments.length, split: payments.map((payment) => `${payment.percent}%`).join(" / ") })}</p>
            ) : !editPayments ? (
              <ul className="fixed-list">
                {payments.map((payment, index) => (
                  <li key={payment.key}>
                    <b>{locale === "ar" ? payment.labelAr || payment.labelEn : payment.labelEn || payment.labelAr} · <bdi className="num">{payment.percent}%</bdi></b>
                    <span>{locale === "ar" ? payment.whenAr || payment.whenEn : payment.whenEn || payment.whenAr}</span>
                    <bdi className="num fixed-list__amount">{formatQar(Math.max(0, due[index] ?? 0), locale)}</bdi>
                  </li>
                ))}
              </ul>
            ) : payments.map((payment, index) => (
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
          {/* Discount comes last: a percentage of the subtotal or a fixed amount */}
          <div className="card stack stack--sm">
            <h3 className="card-title">{t("off.discount")}</h3>
            <div className="form-grid form-grid--2">
              <div className="field">
                <label>{t("off.discountType")}</label>
                <div className="segmented" role="group" aria-label={t("off.discountType")}>
                  {discountTypes.map((type) => (
                    <button key={type} type="button" aria-pressed={discountType === type} onClick={() => setDiscountType(type)}>{t(`off.discount_${type}`)}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="offer-discount">{discountType === "percent" ? t("off.discountPercent") : t("off.discountAmount")}</label>
                <input id="offer-discount" className="input num" type="number" min={0} max={discountType === "percent" ? 100 : undefined} step="1" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
              </div>
            </div>
            <small className="muted"><bdi>{t("off.discountResult", { amount: formatQar(totals.discount, locale), total: formatQar(totals.total, locale) })}</bdi></small>
          </div>
        </div>
        <div className="card stack stack--sm">
          <h3 className="card-title">{t("off.summary")}</h3>
          <div className="kv"><span>{t("off.client")}</span><b>{locale === "ar" ? clientAr || clientEn : clientEn || clientAr || t("time.none")}</b></div>
          <div className="kv"><span>{t("off.items")}</span><span className="num">{measured.length}</span></div>
          {area > 0 && !construction ? <div className="kv"><span>{t("off.totalArea")}</span><span className="num"><bdi>{formatQty(area, locale)} m²</bdi></span></div> : null}
          <div className="kv"><span>{t("off.subtotal")}</span><span className="num"><bdi>{formatQar(totals.subtotal, locale)}</bdi></span></div>
          {designOnly && area > 0 ? <div className="kv"><span>{t("off.unitPrice")}</span><span className="num"><bdi>{formatQar(unitRate, locale)} / m²</bdi></span></div> : null}
          <div className="kv"><span>{t("off.discount")}{discountType === "percent" ? <> <bdi className="num">{discountNumber ?? 0}%</bdi></> : null}</span><span className="num"><bdi>− {formatQar(totals.discount, locale)}</bdi></span></div>
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
 * Design pricing (architecture and interior): only the total area in m² is entered. The unit
 * price is not typed: it comes from the area (see designRates in src/lib/offers.ts).
 */
function DesignArea({ value, rate, area, onChange }: { value: string; rate: number; area: number; onChange: (qty: string) => void }) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <div className="card stack stack--sm">
      <div className="between">
        <h3 className="card-title">{t("off.areas")}</h3>
        <span className="badge badge--accent"><bdi>{t("off.rateFromArea", { rate: formatQar(rate, locale) })}</bdi></span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t("off.rateRule")}</p>
      <div className="form-grid form-grid--2">
        <div className="field">
          <label htmlFor="offer-area">{t("off.totalAreaSqm")}</label>
          <input id="offer-area" className="input num" type="number" min={0} step="0.1" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} />
        </div>
        <div className="field">
          <label>{t("col.total")}</label>
          <b className="num" style={{ fontSize: 18, paddingBlock: 8 }}><bdi>{formatQar(Math.round(area * rate), locale)}</bdi></b>
          <small className="muted"><bdi>{formatQty(area, locale)} m² × {formatQar(rate, locale)}</bdi></small>
        </div>
      </div>
    </div>
  );
}

type BoqDraft = { qty: string; rate: string; wastePct: string; profitPct: string; manpower: string };

/** BOQ quantities and rates of a construction offer: saved values, or the BOQ rates (lump-sum items at 1). */
function boqDraft(initial: Offer | null): Record<string, BoqDraft> {
  return Object.fromEntries(boqRows.map(({ row }) => {
    const saved = initial?.lines.find((line) => line.priceId === row.id);
    if (saved) return [row.id, { qty: String(saved.qty), rate: String(saved.rate), wastePct: String(saved.wastePct ?? 0), profitPct: String(saved.profitPct ?? 0), manpower: String(saved.manpower ?? 0) }];
    return [row.id, { qty: !initial && row.unit === "item" ? "1" : "0", rate: String(row.rate), wastePct: "0", profitPct: "0", manpower: "0" }];
  }));
}

function boqNumber(value: string) {
  const number = Number(value);
  return value.trim() !== "" && Number.isFinite(number) && number >= 0 ? number : null;
}

type CostingDraft = { men: string; manRate: string };

function decimal(value: string) {
  const number = Number(value);
  return value.trim() !== "" && Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : null;
}

/** Offer lines of all BOQ rows (an empty quantity is 0: every item takes its share of the manpower). */
function boqLines(boq: Record<string, BoqDraft>): OfferLine[] {
  return boqRows.flatMap(({ row }) => {
    const draft = boq[row.id];
    const qty = draft ? (draft.qty.trim() === "" ? 0 : boqNumber(draft.qty)) : 0;
    const rate = draft ? boqNumber(draft.rate) : null;
    if (qty === null || rate === null) return [];
    // An empty extra is 0; an invalid one is sent as -1 so the check names it
    const extra = (value: string) => (value.trim() === "" ? 0 : decimal(value) ?? -1);
    const line = boqLine(row.id, Math.round(qty * 100) / 100, Math.round(rate * 100) / 100, {
      wastePct: extra(draft.wastePct),
      profitPct: extra(draft.profitPct),
      manpower: extra(draft.manpower),
    });
    return line ? [line] : [];
  });
}

/**
 * Construction costing helpers. Waste %, manpower and profit % are entered on each BOQ item;
 * this card fills them: the manpower (men × rate per man per month × duration) split equally
 * over the BOQ items, and a waste % or profit % for every item.
 */
function CostingCard({
  costing,
  onChange,
  months,
  manpower,
  onSplit,
  onFill,
}: {
  costing: CostingDraft;
  onChange: (patch: Partial<CostingDraft>) => void;
  months: number;
  manpower: number;
  onSplit: () => void;
  onFill: (key: "wastePct" | "profitPct", value: string) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [fill, setFill] = useState({ wastePct: "", profitPct: "" });
  const field = (key: keyof CostingDraft, label: string, max?: number, step = "0.01") => (
    <div className="field">
      <label htmlFor={`costing-${key}`}>{label}</label>
      <input id={`costing-${key}`} className="input num" type="number" min={0} max={max} step={step} inputMode="decimal" value={costing[key]} onChange={(event) => onChange({ [key]: event.target.value })} />
    </div>
  );
  const filler = (key: "wastePct" | "profitPct", label: string) => (
    <div className="field">
      <label htmlFor={`fill-${key}`}>{label}</label>
      <div className="hstack">
        <input id={`fill-${key}`} className="input num" type="number" min={0} max={100} step="0.01" inputMode="decimal" value={fill[key]} onChange={(event) => setFill((current) => ({ ...current, [key]: event.target.value }))} />
        <button type="button" className="btn btn--secondary btn--sm" disabled={fill[key].trim() === ""} onClick={() => onFill(key, fill[key])}>{t("off.applyAll")}</button>
      </div>
    </div>
  );
  return (
    <div className="card stack stack--sm">
      <h3 className="card-title">{t("off.costing")}</h3>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t("off.costingHint")}</p>
      <div className="form-grid form-grid--2">
        {field("men", t("off.men"), 999, "1")}
        {field("manRate", t("off.manRate"))}
      </div>
      <div className="costing-sum">
        <bdi>{t("off.manpowerCalc", { men: costing.men || "0", rate: formatQar(Number(costing.manRate) || 0, locale), months })}</bdi>
        <b className="num"><bdi>{formatQar(manpower, locale)}</bdi></b>
        <bdi className="muted">{t("off.manpowerPerItem", { count: boqEntryCount, amount: formatQar(Math.round(manpower / boqEntryCount), locale) })}</bdi>
        <button type="button" className="btn btn--secondary btn--sm" style={{ marginInlineStart: "auto" }} disabled={manpower <= 0} onClick={onSplit}>{t("off.splitManpower")}</button>
      </div>
      {months === 0 ? <small className="muted">{t("off.manpowerNeedsDuration")}</small> : null}
      <div className="form-grid form-grid--2">
        {filler("wastePct", t("off.fillWaste"))}
        {filler("profitPct", t("off.fillProfit"))}
      </div>
    </div>
  );
}

/**
 * Construction measurements: the bill of quantities for construction works, laid out as the
 * company BOQ (sections, numbered items, lettered parts). Each item has a quantity (0 when not
 * used), a rate starting at the BOQ rate, and its own waste %, manpower and profit %, shown on a
 * second line under it; the amount adds them to the cost.
 */
function BoqTable({
  lines,
  boq,
  onChange,
  extraLines,
  onRemoveExtra,
  subtotal,
}: {
  lines: OfferLine[];
  boq: Record<string, BoqDraft>;
  onChange: (id: string, patch: Partial<BoqDraft>) => void;
  extraLines: OfferLine[];
  onRemoveExtra: (index: number) => void;
  subtotal: number;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const qar = (value: number) => <bdi>{formatQar(Math.round(value), locale)}</bdi>;
  const costOf = (id: string) => {
    const line = lines.find((item) => item.priceId === id);
    return line ? lineCosting(line) : { cost: 0, waste: 0, manpower: 0, profit: 0, amount: 0 };
  };
  const boqCostings = lines.filter((line) => line.trade === "boq").map(lineCosting);
  const sum = (key: "cost" | "waste" | "manpower" | "profit") => boqCostings.reduce((total, item) => total + item[key], 0);
  const columns = 6;
  const small = (id: string, key: "wastePct" | "profitPct" | "manpower", label: string, added: number) => (
    <label className="boq-extra">
      <span>{label}</span>
      <input className="input num" type="number" min={0} max={key === "manpower" ? undefined : 100} step="0.01" inputMode="decimal" value={boq[id]?.[key] ?? ""} onChange={(event) => onChange(id, { [key]: event.target.value })} />
      <small>+{qar(added)}</small>
    </label>
  );
  const rows = (id: string, unit: string, no: number | null, description: React.ReactNode) => {
    const cost = costOf(id);
    return [
      <tr key={id} className="boq-form__item">
        <td data-label={t("off.srNo")} className="num">{no ?? ""}</td>
        <td data-label={t("off.description")}>{description}</td>
        <td data-label={t("col.unit")} className="boq-unit">{boqUnitLabel(unit)}</td>
        <td data-label={t("off.quantity")}>
          <input className="input num" type="number" min={0} step="0.01" inputMode="decimal" aria-label={t("off.quantity")} value={boq[id]?.qty ?? ""} onChange={(event) => onChange(id, { qty: event.target.value })} />
        </td>
        <td data-label={t("off.rate")}>
          <input className="input num" type="number" min={0} step="0.01" inputMode="decimal" aria-label={t("off.rate")} value={boq[id]?.rate ?? ""} onChange={(event) => onChange(id, { rate: event.target.value })} />
        </td>
        <td data-label={t("off.amount")} className="num end strong" rowSpan={2}>{qar(cost.amount)}</td>
      </tr>,
      <tr key={`${id}-costs`} className="boq-form__costs">
        <td />
        <td colSpan={4}>
          <div className="boq-costs">
            <span className="boq-extra boq-costs__base"><span>{t("off.cost")}</span><b>{qar(cost.cost)}</b></span>
            {small(id, "wastePct", t("off.wastePct"), cost.waste)}
            {small(id, "manpower", t("off.manpowerQar"), cost.manpower)}
            {small(id, "profitPct", t("off.profitPct"), cost.profit)}
          </div>
        </td>
      </tr>,
    ];
  };
  return (
    <div className="card card--flush table-wrap">
      <div style={{ padding: "16px 18px 4px" }}>
        <h3 className="card-title">{t("off.boq")}</h3>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>{t("off.boqHint")}</p>
      </div>
      <table className="table table--cards boq-form">
        <thead>
          <tr>
            <th>{t("off.srNo")}</th>
            <th>{t("off.description")}</th>
            <th>{t("col.unit")}</th>
            <th>{t("off.quantity")}</th>
            <th>{t("off.rate")}</th>
            <th className="end">{t("off.amount")}</th>
          </tr>
        </thead>
        {boqSections.map((section) => (
          <tbody key={section.id}>
            <tr className="boq-form__section">
              <td colSpan={columns}>
                <span>{section.en}</span>
                <span dir="rtl" lang="ar">{section.ar}</span>
              </td>
            </tr>
            {section.entries.flatMap((entry) => {
              const head = (
                <div className="boq-form__desc">
                  <b>{entry.en}</b>
                  <span dir="rtl" lang="ar">{entry.ar}</span>
                </div>
              );
              if (!entry.parts) return rows(entry.rows[0].id, entry.rows[0].unit, entry.no, head);
              return [
                <tr key={`${entry.no}-head`} className="boq-form__parent">
                  <td data-label={t("off.srNo")} className="num">{entry.no}</td>
                  <td data-label={t("off.description")}>{head}</td>
                  <td colSpan={columns - 2} />
                </tr>,
                ...entry.rows.flatMap((row) => rows(row.id, row.unit, null, (
                  <div className="boq-form__desc boq-form__desc--part">
                    <span>{row.en}</span>
                    {row.ar ? <span dir="rtl" lang="ar">{row.ar}</span> : null}
                  </div>
                ))),
              ];
            })}
          </tbody>
        ))}
        {extraLines.length > 0 ? (
          <tbody>
            <tr className="boq-form__section"><td colSpan={columns}><span>{t("off.otherItems")}</span></td></tr>
            {extraLines.map((line, index) => (
              <tr key={`${line.priceId}-${index}`}>
                <td />
                <td data-label={t("off.description")}><div className="boq-form__desc"><b>{line.workEn}</b><span>{line.roomEn}</span></div></td>
                <td data-label={t("col.unit")}>{boqUnitLabel(line.unit)}</td>
                <td data-label={t("off.quantity")} className="num"><bdi>{formatQty(lineQty(line), locale)}</bdi></td>
                <td data-label={t("off.rate")} className="num"><bdi>{formatQar(line.rate, locale)}</bdi></td>
                <td className="end">
                  <bdi className="num strong">{formatQar(lineAmount(line), locale)}</bdi>{" "}
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => onRemoveExtra(index)}>{t("us.delete")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        ) : null}
        <tfoot>
          <tr>
            <td />
            <td colSpan={4}>
              <b>{t("off.totalAmount")}</b>
              <div className="boq-costs__adds">{t("off.cost")} {qar(sum("cost"))} · {t("off.waste")} +{qar(sum("waste"))} · {t("off.manpower")} +{qar(sum("manpower"))} · {t("off.profit")} +{qar(sum("profit"))}</div>
            </td>
            <td className="num end"><b>{qar(subtotal)}</b></td>
          </tr>
        </tfoot>
      </table>
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

