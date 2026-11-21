/*
 * Cash / cheque receipt voucher, laid out to match the company's reference
 * "Asas-receipt.pdf" (842 x 595 pt, landscape): logo letterhead, gradient rule,
 * bilingual label rows with dotted lines, payment method boxes, three signature
 * lines and the dark address band. Measurements are in points. Styles: .rv in asas.css.
 * Used in the system (accounting) and on the client's shared link.
 */
import { AsasLogo } from "@/components/asas-logo";
import type { Receipt, ReceiptMethod } from "@/lib/accounting";
import { amountWordsAr, amountWordsEn } from "@/lib/amount-words";

export const voucherCompany = {
  nameEn: "ASAS EXECUTIVE CONTRACTING",
  suffixEn: "W.L.L.",
  nameAr: "شركة أساس التنفيذية للمقاولات ذ.م.م",
  addressAr: "الدور السادس برج رافال، لوسيل، قطر",
  footer: ["6th floor, Rafal Tower, Lusail, Qatar", "Tel / WhatsApp: +974 6611 1817", "info@asasqa.com", "www.asasqa.com", "C.R. No. 139215"],
};

const methods: { id: ReceiptMethod; en: string; ar: string }[] = [
  { id: "cash", en: "Cash", ar: "نقداً" },
  { id: "cheque", en: "Cheque", ar: "شيك" },
  { id: "transfer", en: "Bank transfer", ar: "تحويل بنكي" },
];

function money(amount: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(amount);
}

/** 2026-11-21 -> 21/11/2026 */
function dmy(day: string) {
  const [y, m, d] = day.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}

function Line({ en, ar, valueEn, valueAr, small = false }: { en?: string; ar?: string; valueEn?: string; valueAr?: string; small?: boolean }) {
  return (
    <div className="rv-line">
      {en ? <span className="rv-line__label">{en}</span> : null}
      <span className={`rv-line__value${small ? " rv-line__value--small" : ""}`}>
        <bdi className="rv-en">{valueEn}</bdi>
        <bdi className="rv-ar" dir="rtl" lang="ar">{valueAr}</bdi>
      </span>
      {ar ? <span className="rv-line__label rv-ar" dir="rtl" lang="ar">{ar}</span> : null}
    </div>
  );
}

export function ReceiptVoucher({ receipt, invoiceNumber = "" }: { receipt: Receipt; invoiceNumber?: string }) {
  const projectEn = [receipt.projectEn && `Project: ${receipt.projectEn}`, invoiceNumber && `Invoice ${invoiceNumber}`].filter(Boolean).join(" · ");
  const projectAr = [receipt.projectAr && `المشروع: ${receipt.projectAr}`, invoiceNumber && `فاتورة ${invoiceNumber}`].filter(Boolean).join(" · ");
  return (
    <article className="rv" dir="ltr" lang="en">
      <div className="rv-stripes" aria-hidden="true"><i /><i /><i /><i /><i /></div>

      <header className="rv-head">
        <AsasLogo className="rv-logo" mark title="ASAS EXECUTION" />
        <div className="rv-company">
          <b>{voucherCompany.nameEn}</b>
          <small>{voucherCompany.suffixEn}</small>
        </div>
        <div className="rv-company rv-company--ar" dir="rtl" lang="ar">
          <b>{voucherCompany.nameAr}</b>
          <small>{voucherCompany.addressAr}</small>
        </div>
      </header>
      <hr className="rv-rule" />

      <div className="rv-title">
        <h2 dir="rtl" lang="ar">سند قبض نقداً / شيك</h2>
        <p>CASH / CHEQUE RECEIPT VOUCHER</p>
      </div>

      <div className="rv-top">
        <div className="rv-pair rv-pair--no">
          <span className="rv-ar" lang="ar">الرقم</span>
          <b>No.</b>
        </div>
        <div className="rv-box rv-box--no"><bdi>{receipt.number}</bdi></div>
        <div className="rv-pair rv-pair--amount">
          <span className="rv-ar" lang="ar">المبلغ</span>
          <b>Amount</b>
        </div>
        <div className="rv-amount">
          <span className="rv-amount__unit rv-amount__unit--qr"><bdi>QR</bdi> <bdi lang="ar">ريال</bdi></span>
          <span className="rv-amount__unit rv-amount__unit--dh"><bdi>Dh.</bdi> <bdi lang="ar">درهم</bdi></span>
          <div className="rv-box rv-box--amount">
            <span>{money(receipt.amount)}</span>
            <span>00</span>
          </div>
        </div>
        <div className="rv-date">
          <b>Date</b>
          <span className="rv-date__value">{dmy(receipt.receivedOn)}</span>
          <span className="rv-ar" dir="rtl" lang="ar">التاريخ</span>
        </div>
      </div>

      <div className="rv-lines">
        <Line en="Received from Mr. / M/s." ar="استلمت من السيد / السادة" valueEn={receipt.payerEn} valueAr={receipt.payerAr} />
        <Line en="The sum of QR" ar="مبلغ وقدره" valueEn={amountWordsEn(receipt.amount)} valueAr={amountWordsAr(receipt.amount)} small />
        <Line en="Cheque / Transfer No." ar="رقم الشيك / التحويل" valueEn={receipt.method === "cash" ? "" : receipt.reference} />
        <Line en="Bank" ar="البنك" valueEn={receipt.method === "cash" ? "" : receipt.bank} />
        <Line en="Being for" ar="وذلك عن" valueEn={receipt.purposeEn} valueAr={receipt.purposeAr} />
        <Line valueEn={projectEn} valueAr={projectAr} small />
      </div>

      <div className="rv-methods">
        <div className="rv-methods__label"><b>Payment method</b><span lang="ar">طريقة الدفع</span></div>
        {methods.map((method) => (
          <div key={method.id} className={`rv-check rv-check--${method.id}`}>
            <i className={receipt.method === method.id ? "is-on" : undefined} aria-label={receipt.method === method.id ? "selected" : undefined}>
              {receipt.method === method.id ? <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.6 6.3l2.3 2.3 4.6-5" /></svg> : null}
            </i>
            <span>{method.en}</span>
            <span lang="ar">{method.ar}</span>
          </div>
        ))}
      </div>

      <div className="rv-signs">
        {[
          ["توقيع المستلم", "Receiver’s signature"],
          ["توقيع المحاسب", "Accountant’s signature"],
          ["توقيع المدير", "Manager’s signature"],
        ].map(([ar, en]) => (
          <div key={en}>
            <span lang="ar">{ar}</span>
            <b>{en}</b>
            <i />
          </div>
        ))}
      </div>

      <footer className="rv-foot">
        {voucherCompany.footer.map((item, index) => (
          <span key={item}>{index > 0 ? <em aria-hidden="true">·</em> : null}{item}</span>
        ))}
      </footer>
    </article>
  );
}
