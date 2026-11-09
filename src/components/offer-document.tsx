"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { useOffers } from "@/components/use-offers";
import { Link } from "@/i18n/navigation";
import { contractTerms } from "@/lib/contract-terms";
import { letterhead, lineAmount, offerTotals, paymentAmounts, roomTitle, workTitle, type Offer } from "@/lib/offers";

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
      {doc === "contract" ? <ContractSheets offer={offer} /> : <QuotationSheets offer={offer} />}
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
  const totals = offerTotals(offer.lines, offer.discountPct, offer.packageAmount);
  const due = paymentAmounts(totals.total, offer.payments);
  const title = offer.kind === "architecture" ? "Architecture design quotation" : "Quotation";
  const titleAr = offer.kind === "architecture" ? "عرض سعر تصميم معماري" : "عرض سعر";
  const area = areaLabel(offer.areaFrom, offer.areaTo);
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
          <div><span>SPECIAL DISCOUNT ({offer.discountPct}%)</span><span className="sheet-ar">خصم امتياز ({offer.discountPct}%)</span></div>
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

function ContractSheets({ offer }: { offer: Offer }) {
  const totals = offerTotals(offer.lines, offer.discountPct, offer.packageAmount);
  const due = paymentAmounts(totals.total, offer.payments);
  const title = offer.kind === "architecture" ? "Architecture contract" : "Contract";
  const titleAr = offer.kind === "architecture" ? "عقد تصميم معماري" : "عقد";
  const area = areaLabel(offer.areaFrom, offer.areaTo);

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
            <td className="num">{line.qty}</td>
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

function areaLabel(from: number | null, to: number | null) {
  if (from && to && from !== to) return `${from} to ${to}`;
  if (from || to) return String(from ?? to);
  return "";
}

function money(amount: number) {
  return new Intl.NumberFormat("en", { numberingSystem: "latn", maximumFractionDigits: 0 }).format(amount);
}
