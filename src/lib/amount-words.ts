/*
 * Amounts in words for receipt vouchers ("The sum of QR ..." / "مبلغ وقدره ...").
 * Whole Qatari riyals up to 999,999,999.
 */

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function enHundreds(n: number) {
  const parts: string[] = [];
  if (n >= 100) parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
  const rest = n % 100;
  if (rest > 0) {
    if (parts.length) parts.push("and");
    parts.push(rest < 20 ? ONES[rest] : `${TENS[Math.floor(rest / 10)]}${rest % 10 ? `-${ONES[rest % 10]}` : ""}`);
  }
  return parts.join(" ");
}

/** 125,450 -> "One Hundred and Twenty-Five Thousand Four Hundred and Fifty Qatari Riyals Only" */
export function amountWordsEn(amount: number) {
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return "Zero Qatari Riyals Only";
  const scales: [number, string][] = [[1_000_000, "Million"], [1_000, "Thousand"], [1, ""]];
  let rest = n;
  const parts: string[] = [];
  for (const [size, name] of scales) {
    const chunk = Math.floor(rest / size);
    rest %= size;
    if (chunk === 0) continue;
    if (size === 1 && parts.length && chunk < 100) parts.push("and");
    parts.push(name ? `${enHundreds(chunk)} ${name}` : enHundreds(chunk));
  }
  return `${parts.join(" ")} ${n === 1 ? "Qatari Riyal" : "Qatari Riyals"} Only`;
}

const AR_ONES = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const AR_TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const AR_HUNDREDS = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

function arHundreds(n: number) {
  const parts: string[] = [];
  if (n >= 100) parts.push(AR_HUNDREDS[Math.floor(n / 100)]);
  const rest = n % 100;
  if (rest > 0) parts.push(rest < 20 ? AR_ONES[rest] : rest % 10 ? `${AR_ONES[rest % 10]} و${AR_TENS[Math.floor(rest / 10)]}` : AR_TENS[Math.floor(rest / 10)]);
  return parts.join(" و");
}

/** Thousands / millions with Arabic number agreement (ألف، ألفان، ثلاثة آلاف، أحد عشر ألفاً; أحد عشر ألف when the currency follows directly). */
function arScale(chunk: number, one: string, two: string, few: string, many: string, last: boolean) {
  if (chunk === 1) return one;
  if (chunk === 2) return two;
  if (chunk >= 3 && chunk <= 10) return `${arHundreds(chunk)} ${few}`;
  const rest = chunk % 100;
  return `${arHundreds(chunk)} ${rest >= 3 && rest <= 10 ? few : rest === 0 || rest === 1 || rest === 2 || last ? one : many}`;
}

/** 125,450 -> "مائة وخمسة وعشرون ألفاً وأربعمائة وخمسون ريالاً قطرياً فقط لا غير" */
export function amountWordsAr(amount: number) {
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return "صفر ريال قطري فقط لا غير";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const units = n % 1000;
  const parts: string[] = [];
  if (millions) parts.push(arScale(millions, "مليون", "مليونان", "ملايين", "مليوناً", !thousands && !units));
  if (thousands) parts.push(arScale(thousands, "ألف", "ألفان", "آلاف", "ألفاً", !units));
  if (units) parts.push(arHundreds(units));
  const tail = units % 100;
  const currency = n === 1 ? "ريال قطري واحد" : n === 2 ? "ريالان قطريان" : tail === 0 ? "ريال قطري" : tail >= 3 && tail <= 10 ? "ريالات قطرية" : "ريالاً قطرياً";
  const words = n === 1 || n === 2 ? currency : `${parts.join(" و")} ${currency}`;
  return `${words} فقط لا غير`;
}
