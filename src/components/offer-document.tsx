"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { ArchitectureContract, ArchitectureQuotation } from "@/components/architecture-document";
import { Icon } from "@/components/icon";
import { useOffers } from "@/components/use-offers";
import { Link } from "@/i18n/navigation";
import { contractTerms } from "@/lib/contract-terms";
import { boqPlace, boqSections, boqUnitLabel } from "@/lib/boq";
import { boqCosts, isDesignKind, letterhead, lineAmount, lineQty, offerCosting, offerTotals, paymentAmounts, roomTitle, totalArea, workTitle, type Offer, type OfferKind } from "@/lib/offers";

export function OfferDocument({ offerId, doc, autoPrint = false }: { offerId: string; doc: "quotation" | "contract"; autoPrint?: boolean }) {
  const t = useTranslations();
  const { offers, ready, canView } = useOffers();
  const offer = offers.find((item) => item.id === offerId);

  useEffect(() => {
    if (!offer) return;
    const previous = document.title;
    document.title = `${offer.number} ${doc}`;
    return () => {
      document.title = previous;
    };
  }, [doc, offer]);

  useEffect(() => {
    if (!autoPrint || !offer) return;
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [autoPrint, offer]);

  if (!canView && ready) return <AppShell title={t("nav.offers")}><p className="muted">{t("off.forbidden")}</p></AppShell>;
  if (!ready) return <AppShell title={t("nav.offers")}><p className="muted">{t("common.loading")}</p></AppShell>;
  if (!offer) {
    return (
      <AppShell title={t("nav.offers")}>
        <Link href="/offers" className="back">{t("off.back")}</Link>
        <p className="muted">{t("off.missing")}</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={offer.number}>
      <div className="between no-print">
        <Link href="/offers" className="back">
          <Icon name="chevl" className="icon icon--sm icon--flip" />
          <span>{t("off.back")}</span>
        </Link>
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          <Icon name="download" />
          {t(doc === "contract" ? "off.downloadContract" : "off.downloadQuote")}
        </button>
      </div>
      <p className="muted no-print">{t("off.printHint")}</p>
      {isDesignKind(offer.kind) ? (
        <div className="adoc-wrap">
          {doc === "contract" ? <ArchitectureContract offer={offer} /> : <ArchitectureQuotation offer={offer} />}
        </div>
      ) : doc === "contract" ? (
        <ContractSheets offer={offer} />
      ) : offer.kind === "construction" ? (
        <BoqSheets offer={offer} />
      ) : (
        <QuotationSheets offer={offer} />
      )}
    </AppShell>
  );
}

function Rail() {
  return (
    <aside className="sheet-rail">
      <svg className="sheet-mark" viewBox="26 3 252 366" width="68" height="98" aria-hidden="true">
        <path fillRule="evenodd" d="M26 282L26 196L72 196L72 329L62 340L62 205L36 206L36 242L57 242L57 251L36 252L35 359L268 359L268 32L276 23L278 23L278 369L26 369ZM81 310L81 280L82 280L91 286L91 331L118 331L118 282L81 256L81 196L128 196L128 253L126 252L118 246L118 205L91 205L91 251L128 277L128 341L81 341ZM207 340L206 340L206 280L207 280L216 287L216 331L243 331L243 282L206 256L206 196L253 196L253 253L243 245L242 206L216 206L216 251L252 277L253 341L207 341ZM151 268L151 196L197 196L197 339L188 331L188 206L161 205L161 242L182 242L182 251L161 251L161 330L151 340ZM26 132L26 78L34 67L35 176L70 176L70 77L79 66L79 176L94 176L94 75L104 66L104 176L118 176L118 76L128 66L128 186L26 186ZM151 104L151 23L152 23L161 35L161 176L193 176L193 78L202 66L203 176L217 176L217 76L227 66L227 176L242 176L242 76L252 66L252 186L151 186ZM269 18L269 10L277 3L277 7L271 12L271 18L272 18L278 13L278 16L268 25Z" />
      </svg>
      <small>EXECUTION</small>
    </aside>
  );
}

function Paper({ children }: { children: React.ReactNode }) {
  return <article className="sheet"><Rail /><div className="sheet-body">{children}</div></article>;
}

function DocHead({ offer, enTitle, arTitle }: { offer: Offer; enTitle: string; arTitle: string }) {
  return (
    <header className="doc-head">
      <div>
        <h2>{enTitle}</h2>
        <p>PROJECT | {offer.projectEn}</p>
        <p>CLIENT | {offer.clientEn}</p>
      </div>
      <div className="sheet-ar">
        <h2>{arTitle}</h2>
        <p>اسم المشروع | {offer.projectAr}</p>
        <p>اسم العميل | {offer.clientAr}</p>
      </div>
    </header>
  );
}

function Foot({ offer }: { offer: Offer }) {
  const year = offer.issuedOn.slice(0, 4) || new Date().getFullYear();
  return <footer className="sheet-foot"><span>@{year} | ASAS EXECUTION | {letterhead.web}</span></footer>;
}

function QuotationSheets({ offer }: { offer: Offer }) {
  const totals = offerTotals(offer.lines, offer.discount, offerCosting(offer));
  const due = paymentAmounts(totals.total, offer.payments);
  const { en: title, ar: titleAr } = docTitles[offer.kind].quotation;
  const area = areaLabel(totalArea(offer.lines));
  const scope = linesOf(offer.scopeEn);
  const scopeAr = linesOf(offer.scopeAr);

  return (
    <>
      <Paper>
        <DocHead offer={offer} enTitle={title} arTitle={titleAr} />
        {scope.length || scopeAr.length ? (
          <section>
            <SectionTitle en="Project scope" ar="نطاق المشروع" />
            <div className="doc-pair">
              <Bullet lines={scope} />
              <Bullet lines={scopeAr} rtl />
            </div>
          </section>
        ) : null}
        {area ? <div className="doc-bar"><span>TOTAL AREA | {area} SQM</span><span className="sheet-ar">إجمالي المساحة | {area} متر مربع</span></div> : null}
        {offer.stages.length > 0 ? (
          <section>
            <SectionTitle en="Design package" ar="حزمة التصميم" />
            <ul className="doc-stages">
              {offer.stages.map((stage) => (
                <li key={`${stage.titleEn}-${stage.titleAr}`}>
                  <div><b>{stage.titleEn}</b><span>{stage.detailEn}</span></div>
                  <div className="sheet-ar"><b>{stage.titleAr}</b><span>{stage.detailAr}</span></div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {offer.lines.length > 0 ? <Lines offer={offer} /> : null}
        <Foot offer={offer} />
      </Paper>
      <Paper>
        <DocHead offer={offer} enTitle={title} arTitle={titleAr} />
        <section className="doc-totals">
          <div><span>TOTAL AMOUNT | {money(totals.subtotal)} QR</span><span className="sheet-ar">إجمالي المبلغ | {money(totals.subtotal)} ريال قطري</span></div>
          <div>{offer.discount.type === "percent" ? <><span>SPECIAL DISCOUNT ({offer.discount.value}%)</span><span className="sheet-ar">خصم امتياز ({offer.discount.value}%)</span></> : <><span>SPECIAL DISCOUNT | {money(totals.discount)} QR</span><span className="sheet-ar">خصم امتياز | {money(totals.discount)} ريال قطري</span></>}</div>
          <div><span>FINAL TOTAL AMOUNT | {money(totals.total)} QR</span><span className="sheet-ar">إجمالي المبلغ النهائي | {money(totals.total)} ريال قطري</span></div>
        </section>
        <Payments offer={offer} due={due} />
        <div className="doc-close">
          <span>PROJECT NO. | {offer.reference || offer.number}</span>
          <span>PROJECT | {offer.projectEn}</span>
          <span>DATE | {offer.issuedOn || "—"}</span>
          <span>CLIENT | {offer.clientEn}</span>
          {offer.phone ? <span>Client contact no. | {offer.phone}</span> : null}
          <span>{letterhead.company}</span>
        </div>
        <Foot offer={offer} />
      </Paper>
    </>
  );
}

/**
 * Construction quotation, laid out as the company's "Bill of quantities for construction works":
 * the BOQ table (sections, numbered items, lettered parts sharing one amount), its total and the
 * total after discount; then the duration of work and the payment schedule.
 */
function BoqSheets({ offer }: { offer: Offer }) {
  const totals = offerTotals(offer.lines, offer.discount, offerCosting(offer));
  const due = paymentAmounts(totals.total, offer.payments);
  const byId = new Map(offer.lines.filter((line) => line.trade === "boq").map((line) => [line.priceId, line]));
  // Amounts include waste, the item's share of the manpower and profit; the printed rate is
  // the amount per unit, so quantity × rate gives the amount
  const costing = offerCosting(offer);
  const costs = costing ? boqCosts(offer.lines, costing) : null;
  const amountOf = (line: Offer["lines"][number]) => costs?.get(line.priceId)?.amount ?? lineAmount(line);
  const rateOf = (line: Offer["lines"][number]) => (line.qty > 0 ? fixed(amountOf(line) / line.qty) : "—");
  const others = offer.lines.filter((line) => line.trade !== "boq" || !boqPlace(line.priceId));
  // Items are numbered 1, 2, 3… over the items this offer includes
  const included = boqSections.map((section) => ({ section, entries: section.entries.filter((entry) => entry.rows.some((row) => byId.has(row.id))) }));
  const numbers = new Map(included.flatMap(({ entries }) => entries).map((entry, index) => [entry.no, index + 1]));
  const firstOther = numbers.size + 1;

  return (
    <>
      <Paper>
        <DocHead offer={offer} enTitle="BILL OF QUANTITIES FOR CONSTRUCTION WORKS" arTitle="جدول الكميات وبنود الاعمال" />
        <table className="boq-doc">
          <thead>
            <tr><th>Sr. No.</th><th>Descriptions</th><th>Unit</th><th>Quantity</th><th>Rate</th><th>Amount</th></tr>
          </thead>
          {included.map(({ section, entries }) => {
            if (entries.length === 0) return null;
            return (
              <tbody key={section.id}>
                <tr className="boq-doc__section"><td colSpan={6}><span>{section.en}</span><span className="sheet-ar">{section.ar}</span></td></tr>
                {entries.flatMap((entry) => {
                  const number = numbers.get(entry.no);
                  const rows = entry.rows.filter((row) => byId.has(row.id));
                  if (!entry.parts) {
                    const line = byId.get(rows[0].id)!;
                    return [
                      <tr key={entry.no}>
                        <td className="boq-doc__no">{number}</td>
                        <td><div className="boq-doc__desc"><span>{entry.en}</span><span className="sheet-ar">{entry.ar}</span></div></td>
                        <td className="boq-doc__unit">{boqUnitLabel(line.unit)}</td>
                        <td className="num">{fixed(line.qty)}</td>
                        <td className="num">{rateOf(line)}</td>
                        <td className="num">{money2(amountOf(line))}</td>
                      </tr>,
                    ];
                  }
                  // One unit for all parts is printed on the item (as Concrete m³); otherwise on each part
                  const unitOnItem = rows.every((row) => row.unit === rows[0].unit && !row.ar);
                  return [
                    <tr key={`${entry.no}-head`} className="boq-doc__parent">
                      <td className="boq-doc__no">{number}</td>
                      <td><div className="boq-doc__desc"><span>{entry.en}</span><span className="sheet-ar">{entry.ar}</span></div></td>
                      <td className="boq-doc__unit">{unitOnItem ? boqUnitLabel(rows[0].unit) : ""}</td>
                      <td /><td /><td />
                    </tr>,
                    ...rows.map((row) => {
                      const line = byId.get(row.id)!;
                      // Parts of one group share an amount cell (as 8a + 8b in the BOQ)
                      const group = row.group ? rows.filter((item) => item.group === row.group) : [row];
                      const first = group[0].id === row.id;
                      const amount = group.reduce((sum, item) => sum + amountOf(byId.get(item.id)!), 0);
                      return (
                        <tr key={row.id} className="boq-doc__part">
                          <td />
                          <td><div className="boq-doc__desc"><span>{row.en}</span>{row.ar ? <span className="sheet-ar">{row.ar}</span> : null}</div></td>
                          <td className="boq-doc__unit">{unitOnItem ? "" : boqUnitLabel(row.unit)}</td>
                          <td className="num">{fixed(line.qty)}</td>
                          <td className="num">{rateOf(line)}</td>
                          {first ? <td className="num boq-doc__amount" rowSpan={group.length}>{money2(amount)}</td> : null}
                        </tr>
                      );
                    }),
                  ];
                })}
              </tbody>
            );
          })}
          {others.length > 0 ? (
            <tbody>
              <tr className="boq-doc__section"><td colSpan={6}><span>OTHER WORKS</span><span className="sheet-ar">أعمال أخرى</span></td></tr>
              {others.map((line, index) => {
                return (
                  <tr key={`${line.priceId}-${index}`}>
                    <td className="boq-doc__no">{firstOther + index}</td>
                    <td><div className="boq-doc__desc"><span>{workTitle(line, "en")}</span><span className="sheet-ar">{workTitle(line, "ar")}</span></div></td>
                    <td className="boq-doc__unit">{boqUnitLabel(line.unit)}</td>
                    <td className="num">{fixed(lineQty(line))}</td>
                    <td className="num">{fixed(line.rate)}</td>
                    <td className="num">{money2(lineAmount(line))}</td>
                  </tr>
                );
              })}
            </tbody>
          ) : null}
          <tfoot>
            <tr className="boq-doc__total">
              <td />
              <td colSpan={4}><b>Total Amount</b></td>
              <td className="num"><span className="boq-doc__cur">ر.ق.</span><b>{money2(totals.subtotal)}</b></td>
            </tr>
            {totals.discount > 0 ? (
              <tr className="boq-doc__after">
                <td />
                <td colSpan={4}><span className="boq-doc__split"><i>Total Amount after discount</i><i className="sheet-ar">السعر الإجمالي بعد الخصم</i></span></td>
                <td className="num"><span className="boq-doc__cur">ر.ق.</span><i>{money2(totals.total)}</i></td>
              </tr>
            ) : null}
          </tfoot>
        </table>
        <Foot offer={offer} />
      </Paper>
      <Paper>
        <DocHead offer={offer} enTitle="BILL OF QUANTITIES FOR CONSTRUCTION WORKS" arTitle="جدول الكميات وبنود الاعمال" />
        <section className="doc-totals">
          <div><span>TOTAL AMOUNT | {money(totals.subtotal)} QR</span><span className="sheet-ar">إجمالي المبلغ | {money(totals.subtotal)} ريال قطري</span></div>
          {totals.discount > 0 ? <div><span>AFTER DISCOUNT | {money(totals.total)} QR</span><span className="sheet-ar">السعر الإجمالي بعد الخصم | {money(totals.total)} ريال قطري</span></div> : null}
        </section>
        {offer.durationMonths ? (
          <div className="doc-bar">
            <span>DURATION OF WORK | {offer.durationMonths} {offer.durationMonths === 1 ? "MONTH" : "MONTHS"}</span>
            <span className="sheet-ar">مدة العمل | {offer.durationMonths} {monthsAr(offer.durationMonths)}</span>
          </div>
        ) : null}
        <Payments offer={offer} due={due} />
        <div className="doc-close">
          <span>PROJECT NO. | {offer.reference || offer.number}</span>
          <span>PROJECT | {offer.projectEn}</span>
          <span>DATE | {offer.issuedOn || "—"}</span>
          <span>CLIENT | {offer.clientEn}</span>
          {offer.phone ? <span>Client contact no. | {offer.phone}</span> : null}
          <span>{letterhead.company}</span>
        </div>
        <Foot offer={offer} />
      </Paper>
    </>
  );
}

function fixed(value: number) {
  return value.toFixed(2);
}

function money2(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthsAr(months: number) {
  if (months === 1) return "شهر";
  if (months === 2) return "شهران";
  return months <= 10 ? "أشهر" : "شهراً";
}

function ContractSheets({ offer }: { offer: Offer }) {
  const totals = offerTotals(offer.lines, offer.discount, offerCosting(offer));
  const due = paymentAmounts(totals.total, offer.payments);
  const { en: title, ar: titleAr } = docTitles[offer.kind].contract;
  // Construction is priced by its bill of quantities, not by a floor area
  const construction = offer.kind === "construction";
  const area = construction ? "" : areaLabel(totalArea(offer.lines));

  return (
    <>
      <Paper>
        <DocHead offer={offer} enTitle={title} arTitle={titleAr} />
        <section className="doc-party">
          <SectionTitle en="First party" ar="الطرف الأول" />
          <p>{letterhead.company}</p>
          <p className="sheet-ar">{letterhead.companyAr}</p>
          <p>Commercial registration | {letterhead.cr} · Mobile | {letterhead.mobile} · {letterhead.email}</p>
          <p className="sheet-ar">سجل تجاري رقم | {letterhead.cr} · جوال | {letterhead.mobile} · البريد الإلكتروني | {letterhead.email}</p>
          <p>{letterhead.addressEn} · {letterhead.cityEn} · {letterhead.officeEn}</p>
          <p className="sheet-ar">العنوان | {letterhead.addressAr} · المدينة | {letterhead.cityAr} · مكتب | {letterhead.officeAr}</p>
          <p className="sheet-ar">ممثل الشركة | {letterhead.representativeAr} · {letterhead.representativeRoleAr}</p>
          <p>{letterhead.representativeRoleEn}</p>
        </section>
        <section className="doc-party">
          <SectionTitle en="Second party" ar="الطرف الثاني" />
          <p>{offer.clientEn}</p>
          <p className="sheet-ar">{offer.clientAr}</p>
          {offer.capacityEn ? <p>{offer.capacityEn}</p> : null}
          {offer.capacityAr ? <p className="sheet-ar">{offer.capacityAr}</p> : null}
          {offer.phone ? <p>Mobile | {offer.phone}</p> : null}
          {offer.clientId ? <p>ID no. | {offer.clientId}</p> : null}
          {offer.addressEn ? <p>{offer.addressEn}</p> : null}
          {offer.addressAr ? <p className="sheet-ar">العنوان | {offer.addressAr}</p> : null}
        </section>
        <section>
          <SectionTitle en="Project scope" ar="نطاق المشروع" />
          {offer.scopeEn ? <p>{offer.scopeEn}</p> : null}
          {offer.scopeAr ? <p className="sheet-ar">{offer.scopeAr}</p> : null}
          {construction ? <p>Construction works (sub structure and super structure) as per the bill of quantities of quotation {offer.number}.</p> : null}
          {construction ? <p className="sheet-ar">تنفيذ الأعمال الإنشائية (ما تحت مستوى الصفر وما فوقه) وفقاً لجدول الكميات في عرض السعر رقم {offer.number}.</p> : null}
          {construction && offer.durationMonths ? <p>Duration of work: {offer.durationMonths} {offer.durationMonths === 1 ? "month" : "months"}.</p> : null}
          {construction && offer.durationMonths ? <p className="sheet-ar">مدة العمل: {offer.durationMonths} {monthsAr(offer.durationMonths)}.</p> : null}
          {area ? <p>Estimated total area: {area} square metres.</p> : null}
          {area ? <p className="sheet-ar">المساحة الإجمالية التقديرية: {area} متر مربع.</p> : null}
          {offer.stages.length > 0 ? (
            <ul>
              {offer.stages.map((stage) => <li key={stage.titleEn}>{stage.titleEn}: {stage.detailEn} <span className="sheet-ar">{stage.titleAr}: {stage.detailAr}</span></li>)}
            </ul>
          ) : null}
        </section>
        <Foot offer={offer} />
      </Paper>
      <Paper>
        <DocHead offer={offer} enTitle={title} arTitle={titleAr} />
        <SectionTitle en="Terms and conditions" ar="البنود والأحكام" />
        <ol className="doc-terms">
          {contractTerms(offer.kind).map((term, index) => (
            <li key={term.titleEn}>
              <b>{index + 1}. {term.titleEn}</b>
              <b className="sheet-ar">{term.titleAr}</b>
              {term.bodyEn ? <p>{term.bodyEn}</p> : null}
              {term.bodyAr ? <p className="sheet-ar">{term.bodyAr}</p> : null}
              {term.pointsEn?.map((point, pointIndex) => <p key={point}>{point}<br /><span className="sheet-ar">{term.pointsAr?.[pointIndex]}</span></p>)}
            </li>
          ))}
        </ol>
        <Foot offer={offer} />
      </Paper>
      <Paper>
        <DocHead offer={offer} enTitle={title} arTitle={titleAr} />
        <SectionTitle en="Contract price" ar="إجمالي السعر" />
        <div className="doc-bar"><span>TOTAL AMOUNT | {money(totals.total)} QR</span><span className="sheet-ar">إجمالي المبلغ | {money(totals.total)} ريال قطري</span></div>
        <Payments offer={offer} due={due} />
        <div className="doc-close">
          <span>PROJECT NO. | {offer.reference || offer.number}</span>
          <span>PROJECT | {offer.projectEn}</span>
          <span>DATE | {offer.issuedOn || "—"}</span>
        </div>
        <div className="doc-sign">
          <div><b>{offer.clientEn}</b><span className="sheet-ar">{offer.clientAr}</span><i /></div>
          <div><b>ASAS EXECUTION</b><span className="sheet-ar">{letterhead.companyAr}</span><i /></div>
        </div>
        <Foot offer={offer} />
      </Paper>
    </>
  );
}

/** Document titles per offer type (architecture uses its own renderer, see architecture-document.tsx). */
const docTitles: Record<OfferKind, Record<"quotation" | "contract", { en: string; ar: string }>> = {
  architecture: { quotation: { en: "Architecture design quotation", ar: "عرض سعر تصميم معماري" }, contract: { en: "Architecture contract", ar: "عقد تصميم معماري" } },
  fitout: { quotation: { en: "Fit-out quotation", ar: "عرض سعر أعمال التجهيز الداخلي" }, contract: { en: "Fit-out contract", ar: "عقد أعمال التجهيز الداخلي" } },
  interior: { quotation: { en: "Interior design quotation", ar: "عرض سعر تصميم داخلي" }, contract: { en: "Interior design contract", ar: "عقد تصميم داخلي" } },
  construction: { quotation: { en: "Construction quotation", ar: "عرض سعر أعمال إنشائية" }, contract: { en: "Construction contract", ar: "عقد أعمال إنشائية" } },
};

function Payments({ offer, due }: { offer: Offer; due: number[] }) {
  return (
    <section>
      <SectionTitle en="Payment method" ar="الدفعات المستحقة" />
      {offer.payments.map((payment, index) => (
        <div className="doc-pay" key={`${payment.labelEn}-${index}`}>
          <div>
            <b>{payment.labelEn} | {payment.percent}% of the total price</b>
            <span>{payment.whenEn}</span>
          </div>
          <div className="sheet-ar">
            <b>{payment.labelAr} | {payment.percent}% من السعر الإجمالي</b>
            <span>{payment.whenAr}</span>
          </div>
          <div className="doc-bar"><span>AMOUNT DUE | {money(due[index] ?? 0)} QR</span><span className="sheet-ar">المبلغ المستحق | {money(due[index] ?? 0)} ريال قطري</span></div>
        </div>
      ))}
    </section>
  );
}

function Lines({ offer }: { offer: Offer }) {
  return (
    <table>
      <thead>
        <tr><th>Room</th><th>Work</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Total</th></tr>
      </thead>
      <tbody>
        {offer.lines.map((line, index) => (
          <tr key={`${line.roomEn}-${index}`}>
            <td>{roomTitle(line, "en")}<br /><span className="sheet-ar">{roomTitle(line, "ar")}</span></td>
            <td>{workTitle(line, "en")}<br /><span className="sheet-ar">{workTitle(line, "ar")}</span></td>
            <td className="num">{lineQty(line)}</td>
            <td>{line.unit}</td>
            <td className="num">{money(line.rate)}</td>
            <td className="num">{money(lineAmount(line))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SectionTitle({ en, ar }: { en: string; ar: string }) {
  return <h3>{en} <span className="sheet-ar">{ar}</span></h3>;
}

function Bullet({ lines, rtl = false }: { lines: string[]; rtl?: boolean }) {
  if (lines.length === 0) return null;
  if (lines.length === 1) return <p className={rtl ? "sheet-ar" : undefined}>{lines[0]}</p>;
  return <ul className={rtl ? "sheet-ar" : undefined}>{lines.map((line) => <li key={line}>{line}</li>)}</ul>;
}

function linesOf(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function areaLabel(area: number) {
  return area > 0 ? new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(area) : "";
}

function money(amount: number) {
  return new Intl.NumberFormat("en", { numberingSystem: "latn", maximumFractionDigits: 0 }).format(amount);
}
