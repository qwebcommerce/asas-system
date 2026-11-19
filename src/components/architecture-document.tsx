/*
 * Architecture offer documents, laid out to match the company's reference PDFs
 * ("Asas Architecture Quotation.pdf", 2 pages, and "Asas Architecture contract.pdf", 3 pages):
 * US Letter pages with the logo side strip, Calibri-metric type (Carlito), grey text,
 * hairline rules and grey bars at the reference positions. Where the reference shows only
 * Arabic (contract parties, scope and terms) only Arabic is shown; elsewhere both languages.
 * Measurements are in points (pt), as in the PDFs. Styles: .adoc in src/styles/asas.css.
 */
import { contractTerms } from "@/lib/contract-terms";
import { letterhead, offerTotals, paymentAmounts, type Offer, type OfferPayment } from "@/lib/offers";

type Variant = "quotation" | "contract";

// ---------------------------------------------------------------- shared pieces

function Page({ variant, children, footer }: { variant: Variant; children: React.ReactNode; footer?: string }) {
  return (
    <article className={`adoc adoc--${variant}`}>
      <aside className="adoc-rail" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- printed document artwork */}
        <img src="/offer/asas-rail-logo.png" alt="" />
        <i />
      </aside>
      <div className="adoc-body">{children}</div>
      {footer ? <footer className="adoc-foot">@{footer} I ASAS EXECUTION I {letterhead.web}</footer> : null}
    </article>
  );
}

function Head({ offer, en, ar, divider }: { offer: Offer; en: string; ar: string; divider: boolean }) {
  return (
    <header className={`adoc-head${divider ? " adoc-head--divided" : ""}`}>
      <div className="adoc-en">
        <h2>{en}</h2>
        <dl>
          <dt>PROJECT</dt>
          <dd>| {offer.projectEn}</dd>
          <dt>CLIENT</dt>
          <dd>| {offer.clientEn}</dd>
        </dl>
      </div>
      <div className="adoc-ar" dir="rtl" lang="ar">
        <h2>{ar}</h2>
        <p>اسم المشروع | {offer.projectAr}</p>
        <p>اسم العميل | {offer.clientAr}</p>
      </div>
    </header>
  );
}

function Title({ en, ar }: { en: string; ar?: string }) {
  return (
    <div className="adoc-title">
      <h3>{en}</h3>
      {ar ? <h3 dir="rtl" lang="ar">{ar}</h3> : null}
    </div>
  );
}

/** Grey bar with English on the left and Arabic on the right. */
function Bar({ en, ar, className = "" }: { en?: React.ReactNode; ar?: React.ReactNode; className?: string }) {
  return (
    <div className={`adoc-bar ${className}`}>
      <span className="adoc-en">{en}</span>
      <span className="adoc-ar" dir="rtl" lang="ar">{ar}</span>
    </div>
  );
}

function lines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function money(amount: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(amount);
}

/** Eastern Arabic digits, as the contract's Arabic text uses them (٣٣,٣٢٥). */
function arabicDigits(value: string | number) {
  return String(value).replace(/[0-9]/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}

/** 2026-05-11 -> 11-05-2026 */
function dmy(day: string) {
  const [y, m, d] = day.split("-");
  return y && m && d ? `${d}-${m}-${y}` : "";
}

function areaEn(offer: Offer) {
  if (offer.areaFrom && offer.areaTo && offer.areaFrom !== offer.areaTo) return `${offer.areaFrom} to ${offer.areaTo}`;
  return String(offer.areaFrom ?? offer.areaTo ?? "");
}

function areaAr(offer: Offer, digits: (value: string | number) => string) {
  if (offer.areaFrom && offer.areaTo && offer.areaFrom !== offer.areaTo) return `${digits(offer.areaFrom)} إلى ${digits(offer.areaTo)}`;
  const one = offer.areaFrom ?? offer.areaTo;
  return one ? digits(one) : "";
}

function hasArea(offer: Offer) {
  return Boolean(offer.areaFrom || offer.areaTo);
}

/** The contract is signed, so the first payment falls due on signing the contract, not the quotation. */
function contractWhenAr(when: string) {
  return when.replace("عند توقيع هذا العرض", "عند توقيع العقد");
}

function Payments({
  offer,
  due,
  variant,
}: {
  offer: Offer;
  due: number[];
  variant: Variant;
}) {
  const digits = variant === "contract" ? arabicDigits : (value: string | number) => String(value);
  return (
    <>
      {offer.payments.map((payment: OfferPayment, index) => {
        const amount = money(due[index] ?? 0);
        return (
          <section className="adoc-pay" key={`${payment.labelEn}-${index}`}>
            <div className="adoc-pair">
              <div className="adoc-en adoc-bullet">
                <p>
                  {payment.labelEn} | <small>{payment.percent}% of Total Price Payment</small>
                </p>
                <p className="adoc-sub">{payment.whenEn}</p>
              </div>
              <div className="adoc-ar adoc-bullet" dir="rtl" lang="ar">
                <p>
                  {payment.labelAr} | <small>{digits(payment.percent)}% من السعر الإجمالي للدفعة</small>
                </p>
                <p className="adoc-sub">{variant === "contract" ? contractWhenAr(payment.whenAr) : payment.whenAr}</p>
              </div>
            </div>
            <Bar
              className="adoc-bar--due"
              en={variant === "contract" ? <>AMOUNT DUE&nbsp; | &nbsp;<small>QR</small> {amount}</> : <>AMOUNT DUE | {amount} <small>QR</small></>}
              ar={<>المبلغ المستحق&nbsp; | &nbsp;{digits(amount)} <small>ريال قطري</small></>}
            />
          </section>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------- quotation (2 pages)

export function ArchitectureQuotation({ offer }: { offer: Offer }) {
  const totals = offerTotals(offer.lines, offer.discountPct, offer.packageAmount);
  const due = paymentAmounts(totals.total, offer.payments);
  const scopeEn = lines(offer.scopeEn);
  const scopeAr = lines(offer.scopeAr);
  const scopeRows = Array.from({ length: Math.max(scopeEn.length, scopeAr.length) }, (_, i) => [scopeEn[i] ?? "", scopeAr[i] ?? ""]);
  const title = { en: "ARCHITECTURE DESIGN QUOTATION", ar: "عرض سعر تصميم معماري" };
  const year = offer.issuedOn.slice(0, 4) || String(new Date().getFullYear());

  return (
    <>
      <Page variant="quotation" footer={year}>
        <Head offer={offer} en={title.en} ar={title.ar} divider />
        {scopeRows.length > 0 ? (
          <section className="adoc-section adoc-scope">
            <Title en="PROJECT SCOPE" ar="نطاق المشروع" />
            <ul className="adoc-list">
              {scopeRows.map(([en, ar], index) => (
                <li className="adoc-pair" key={index}>
                  <span className="adoc-en adoc-bullet">{en}</span>
                  <span className="adoc-ar adoc-bullet" dir="rtl" lang="ar">{ar}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {hasArea(offer) ? (
          <Bar
            className="adoc-bar--area"
            en={<>TOTAL AREA&nbsp; |{areaEn(offer)}&nbsp;&nbsp; <small>SQM</small></>}
            ar={<>إجمالي المساحة | {areaAr(offer, String)}&nbsp; <small>متر مربع</small></>}
          />
        ) : null}
        {offer.stages.length > 0 ? (
          <section className="adoc-section adoc-stages">
            <Title en="DESIGN PACKAGE" ar="حزمة التصميم" />
            <ul className="adoc-list">
              {offer.stages.map((stage, index) => (
                <li className="adoc-pair" key={`${stage.titleEn}-${index}`}>
                  <div className="adoc-en adoc-bullet">
                    <p>{stage.titleEn.toUpperCase()}</p>
                    {lines(stage.detailEn).map((line) => <p className="adoc-sub" key={line}>{line}</p>)}
                  </div>
                  <div className="adoc-ar adoc-bullet" dir="rtl" lang="ar">
                    <p>{stage.titleAr}</p>
                    {lines(stage.detailAr).map((line) => <p className="adoc-sub" key={line}>{line}</p>)}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Page>

      <Page variant="quotation" footer={year}>
        <Head offer={offer} en={title.en} ar={title.ar} divider />
        <section className="adoc-section adoc-price">
          <Title en={title.en} ar={title.ar} />
          <Bar className="adoc-bar--total" en={<>TOTAL AMOUNT&nbsp; | {money(totals.subtotal)} <small>QR</small></>} ar={<>إجمالي المبلغ | &nbsp;{money(totals.subtotal)}<small>ريال قطري</small></>} />
          {offer.discountPct > 0 ? (
            <>
              <div className="adoc-plain adoc-pair">
                <span className="adoc-en">SPECIAL DISCOUNT ({offer.discountPct}%)</span>
                <span className="adoc-ar" dir="rtl" lang="ar">خصم إمتياز ({offer.discountPct}%)</span>
              </div>
              <Bar className="adoc-bar--total" en={<>FINAL TOTAL AMOUNT&nbsp; | {money(totals.total)} <small>QR</small></>} ar={<>إجمالي المبلغ النهائي | &nbsp;{money(totals.total)} <small>ريال قطري</small></>} />
            </>
          ) : null}
        </section>
        <section className="adoc-section adoc-payments">
          <Title en="PAYMENT METHOD" ar="الدفعات المستحقة" />
          <Payments offer={offer} due={due} variant="quotation" />
        </section>
        <div className="adoc-close">
          <span>PROJECT NO. | {offer.reference || offer.number}</span>
          <span>PROJECT | {offer.projectEn.toUpperCase()}</span>
          <span>DATE | {dmy(offer.issuedOn)}</span>
        </div>
        <div className="adoc-parties">
          <div>
            <dl>
              <dt>CLIENT</dt>
              <dd>| {offer.clientEn}</dd>
              {offer.phone ? (
                <>
                  <dt>Client contact No.</dt>
                  <dd>| {offer.phone}</dd>
                </>
              ) : null}
            </dl>
          </div>
          <div className="adoc-sign" aria-hidden="true" />
          <p className="adoc-company">ASAS EXECUTION TRADING &amp;<br />CONTRACTING W.L.L.</p>
        </div>
      </Page>
    </>
  );
}

// ---------------------------------------------------------------- contract (3 pages)

export function ArchitectureContract({ offer }: { offer: Offer }) {
  const totals = offerTotals(offer.lines, offer.discountPct, offer.packageAmount);
  const due = paymentAmounts(totals.total, offer.payments);
  const title = { en: "ARCHITECTURE CONTRACT", ar: "عقد تصميم معماري" };
  const ar = arabicDigits;
  const area = areaAr(offer, ar);
  const project = offer.projectAr || "المشروع";

  return (
    <>
      <Page variant="contract">
        <Head offer={offer} en={title.en} ar={title.ar} divider={false} />
        <div className="adoc-party" dir="rtl" lang="ar">
          <Bar className="adoc-bar--party" ar={<>الطرف الأول&nbsp; | &nbsp; {letterhead.companyAr}</>} />
          <p className="adoc-row">
            <span>سجل تجاري رقم&nbsp; | &nbsp;<small>{ar(letterhead.cr)}</small></span>
            <span>جوال&nbsp; | &nbsp;<small>{ar(letterhead.mobile)}</small></span>
            <span>البريد الإلكتروني&nbsp; | &nbsp;<small dir="ltr">{letterhead.email}</small></span>
          </p>
          <p className="adoc-row adoc-row--wide">
            <span>العنوان&nbsp; | &nbsp;<small>{letterhead.addressAr}</small></span>
            <span>المدينة&nbsp; | &nbsp;<small>{letterhead.cityAr}</small></span>
            <span>مكتب&nbsp; | &nbsp;<small>{letterhead.officeAr}</small></span>
          </p>
          <p className="adoc-row adoc-row--single">
            <span>ممثل الشركة&nbsp; | &nbsp;<small>{letterhead.representativeAr}&nbsp; | &nbsp;{letterhead.representativeRoleAr}</small></span>
          </p>
        </div>
        <div className="adoc-party adoc-party--second" dir="rtl" lang="ar">
          <Bar className="adoc-bar--party" ar={<>الطرف الثاني&nbsp; |{offer.clientAr || offer.clientEn}</>} />
          {offer.capacityAr ? <p className="adoc-row adoc-row--single">{offer.capacityAr}</p> : null}
          <p className="adoc-row adoc-row--spread">
            {offer.phone ? <span>جوال&nbsp; | &nbsp;<small>{ar(offer.phone)}</small></span> : null}
            {offer.clientId ? <span>رقم البطاقة الشخصية | &nbsp;<small>{ar(offer.clientId)}</small></span> : null}
            {offer.addressAr ? <span>العنوان&nbsp; | &nbsp;{offer.addressAr}</span> : null}
          </p>
        </div>
        <section className="adoc-section adoc-cscope">
          <Title en="PROJECT SCOPE" ar="نطاق المشروع" />
          <div className="adoc-prose" dir="rtl" lang="ar">
            <p>
              يتضمن نطاق هذا المشروع تقديم خدمات التصميم المعماري ل{project}
              {area ? `، وذلك وفقاً للمساحة الإجمالية التقديرية المحددة من ${area} متر مربع` : ""}
            </p>
            <p>
              وتشمل الأعمال إعداد وتطوير المخططات المعمارية والواجهات، وإعداد المخططات الإنشائية ومخططات الخدمات، بالإضافة إلى إعداد التصاميم ثلاثية الأبعاد (3D Renders) لإظهار الشكل والتصور النهائي للمشروع، وذلك وفقاً لمراحل حزمة التصميم المعتمدة وبما يضمن التنسيق والتكامل بين مختلف التخصصات.
            </p>
          </div>
        </section>
      </Page>

      <Page variant="contract">
        <Head offer={offer} en={title.en} ar={title.ar} divider={false} />
        <section className="adoc-section adoc-terms">
          <Title en="TERMS AND CONDITIONS" ar="البنود والاحكام" />
          <ol className="adoc-prose" dir="rtl" lang="ar">
            {contractTerms(offer.kind).map((term, index) => (
              <li key={term.titleAr}>
                <p>{ar(index + 1)}. {term.titleAr}:</p>
                {term.bodyAr ? <p>{ar(term.bodyAr)}</p> : null}
                {term.pointsAr?.map((point) => <p key={point}>* {point}</p>)}
              </li>
            ))}
          </ol>
        </section>
      </Page>

      <Page variant="contract">
        <Head offer={offer} en={title.en} ar={title.ar} divider={false} />
        <section className="adoc-section adoc-cprice">
          <Title en="CONTRACT PRICE" ar="اجمالي السعر" />
          <Bar className="adoc-bar--total" en={<>TOTAL AMOUNT | QR {money(totals.total)}</>} ar={<>إجمالي المبلغ | &nbsp;{ar(money(totals.total))} <small>ريال قطري</small></>} />
        </section>
        <section className="adoc-section adoc-payments">
          <Title en="PAYMENT METHOD" ar="الدفعات المستحقة" />
          <Payments offer={offer} due={due} variant="contract" />
        </section>
        <div className="adoc-close adoc-close--ruled">
          <span>PROJECT NO. | {offer.reference || offer.number}</span>
          <span>PROJECT | {offer.projectEn}</span>
          <span>DATE | {dmy(offer.issuedOn)}</span>
        </div>
        <div className="adoc-signatures">
          <div>
            <p>{offer.clientEn}</p>
            <i />
          </div>
          <div>
            <p>ASAS EXECUTION</p>
            <i />
          </div>
        </div>
      </Page>
    </>
  );
}
