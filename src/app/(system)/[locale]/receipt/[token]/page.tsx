import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReceiptFit } from "@/components/receipt-fit";
import { ReceiptPrintButton } from "@/components/receipt-print-button";
import { ReceiptVoucher } from "@/components/receipt-voucher";
import { receiptByShareToken } from "@/server/receipt-share";

/*
 * The client's view of a receipt voucher, opened from the link shared by the company.
 * No sign-in: the unguessable token in the URL is the key. Not indexed by search engines.
 */

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; token: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "title" });
  return { title: t("receipt"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function SharedReceiptPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  // Read per request: a receipt's link can be reset at any time
  await connection();
  const t = await getTranslations({ locale, namespace: "rcpt" });
  const shared = await receiptByShareToken(token);

  if (!shared) {
    return (
      <main className="rv-public">
        <div className="card stack" style={{ maxWidth: 480, textAlign: "center" }}>
          <b>{t("publicMissingTitle")}</b>
          <p className="muted" style={{ margin: 0 }}>{t("publicMissing")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="rv-public">
      <div className="between no-print" style={{ width: "min(1122px, 100%)" }}>
        <div>
          <b>{t("publicTitle", { number: shared.receipt.number })}</b>
          <p className="muted" style={{ margin: "2px 0 0" }}>{t("publicNote")}</p>
        </div>
        <ReceiptPrintButton label={t("download")} />
      </div>
      <ReceiptFit>
        <ReceiptVoucher receipt={shared.receipt} invoiceNumber={shared.invoiceNumber} />
      </ReceiptFit>
    </main>
  );
}
