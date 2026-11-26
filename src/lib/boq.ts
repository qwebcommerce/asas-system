/*
 * Bill of quantities of a construction offer, as in the company's BOQ for construction works
 * ("BOQ-Construction.pdf"): two sections, 21 numbered items, some with lettered parts.
 * Each priced row is a price item (trade "boq", quantity typed in). Rates are the BOQ's rates and
 * can be changed per offer; quantities are entered per project.
 */

export type BoqUnit = "item" | "m2" | "m3" | "kg" | "nr";

export type BoqRow = {
  /** Price item id, e.g. "boq-08a" */
  id: string;
  /** Description; for lettered parts without their own Arabic, the item's Arabic is used in totals and reports */
  en: string;
  ar: string;
  unit: BoqUnit;
  /** BOQ rate (QAR per unit) */
  rate: number;
  /** Rows with the same group share one amount cell in the printed BOQ (e.g. 8a + 8b) */
  group?: string;
};

export type BoqEntry = {
  no: number;
  en: string;
  ar: string;
  /** The priced rows: one for a plain item, several lettered parts otherwise */
  rows: BoqRow[];
  /** Lettered parts (a., b., c.) printed under the item heading */
  parts?: boolean;
};

export type BoqSection = { id: "sub" | "super"; en: string; ar: string; entries: BoqEntry[] };

const single = (no: number, en: string, ar: string, unit: BoqUnit, rate: number): BoqEntry => ({
  no,
  en,
  ar,
  rows: [{ id: `boq-${String(no).padStart(2, "0")}`, en, ar, unit, rate }],
});

export const boqSections: BoqSection[] = [
  {
    id: "sub",
    en: "SUB STRUCTURE",
    ar: "اعمال ماتحت مستوى الصفر (الأساسات)",
    entries: [
      single(1, "Site preparation & Mobilization", "تجهيز الموقع", "item", 5000),
      single(2, "Excavation", "اعمال الحفر", "m3", 12),
      single(3, "Disposal", "إزالة ناتج الحفر", "m3", 3),
      single(4, "Back Filling", "اعمال الردم", "m3", 10),
      single(5, "Survey & Testing Works", "المسح والاختبار وتقارير مساحية", "item", 5000),
      single(6, "Termite Control", "اعمال رش المبيدات الحشرية والنمل", "m2", 2),
      single(7, "100mm Blinding (20N SRC)", "أعمال العزل الخرسانية (النظافة)", "m2", 45),
      {
        no: 8,
        en: "Concrete",
        ar: "الاعمال الخرسانية المسلحة",
        parts: true,
        rows: [
          { id: "boq-08a", en: "a. Concrete for sub structure (35N SRC)", ar: "", unit: "m3", rate: 310, group: "boq-08" },
          { id: "boq-08b", en: "b. Concrete for Grade Slab 100mm (20N SRC)", ar: "", unit: "m3", rate: 305, group: "boq-08" },
        ],
      },
      single(9, "Reinforcement for sub structure", "الحديد المسلح", "kg", 3.1),
      single(10, "A-252 Mesh", "الشبك المسلح", "m2", 30),
      single(11, "Hollow Blockwork 200mm for sub structure", "اعمال الطابوق", "nr", 7),
      {
        no: 12,
        en: "Waterproofing Works",
        ar: "اعمال العزل للرافت و للقواعد والجسور الأرضية",
        parts: true,
        rows: [
          { id: "boq-12a", en: "a. Bitumen Coat - Horizontal", ar: "العزل (بيتومين) للقواعد المنفرده والجسور الأرضية", unit: "m2", rate: 3, group: "boq-12ab" },
          { id: "boq-12b", en: "b. Bitumen Coat - Vertical", ar: "العزل (بيتومين) للقواعد المنفرده والجسور الأرضية", unit: "m2", rate: 3, group: "boq-12ab" },
          {
            id: "boq-12c",
            en: "c. 02 Layer (KSA/QTR) Membrane - Basement (Horizontal & Vertical) for Raft & RW",
            ar: "العزل للرافت والجدران الاستنادية (بيتومين + ميمبرين طبقتين + طبقة حماية)",
            unit: "m2",
            rate: 95,
          },
        ],
      },
      single(13, "1000 Gauge thick polythene sheet", "اعمال تغليف وحماية العزل بالبلاستيك (بيتومين)", "m2", 2),
    ],
  },
  {
    id: "super",
    en: "SUPER STRUCTURE",
    ar: "اعمال مافوق مستوى الصفر (البناء)",
    entries: [
      single(14, "Concrete for super structure (35N OPC)", "الاعمال الخرسانية", "m3", 308),
      single(15, "Reinforcement for super structure", "الحديد المسلح", "kg", 3.1),
      single(16, "Insulated Blockwork 200mm for super structure", "اعمال الطابوق الخارجي (طابوق معزول)", "nr", 10),
      single(17, "Solid Blockwork 200mm for super structure", "اعمال الطابوق الداخلي", "nr", 7),
      single(18, "External Plastering", "البلاستر الخارجي", "m2", 26),
      single(19, "Internal Plastering", "البلاستر الداخلي", "m2", 24),
      single(20, "Electrical Works (First Fix Only)", "اعمال تأسيس الكهرباء والسباكه ونقاط التكييف (تأسيس فقط)", "item", 20000),
      single(21, "Shuttering Material", "المواد الخشبية", "item", 30000),
    ],
  },
];

export type BoqPlace = { section: BoqSection; entry: BoqEntry; row: BoqRow };

/** Every priced BOQ row with its item and section, in BOQ order. */
export const boqRows: BoqPlace[] = boqSections.flatMap((section) =>
  section.entries.flatMap((entry) => entry.rows.map((row) => ({ section, entry, row }))),
);

export function boqPlace(id: string) {
  return boqRows.find((place) => place.row.id === id) ?? null;
}

/** Work name of a BOQ row for totals and daily reports: a part is named with its item ("Concrete – sub structure (35N SRC)"). */
export function boqWorkName(place: BoqPlace) {
  const { entry, row } = place;
  if (!entry.parts) return { en: row.en, ar: row.ar };
  const part = row.en.replace(/^[a-z]\.\s*/i, "");
  return { en: `${entry.en} – ${part}`, ar: row.ar || entry.ar };
}

/** Section names as shown to people (the BOQ prints them in capitals). */
export function boqSectionName(section: BoqSection) {
  return { en: section.id === "sub" ? "Sub structure" : "Super structure", ar: section.ar };
}

/** BOQ unit as printed ("Item", "m²", "m³", "Kg", "Nr"). */
export function boqUnitLabel(unit: string) {
  if (unit === "m2") return "m²";
  if (unit === "m3") return "m³";
  if (unit === "kg") return "Kg";
  if (unit === "nr") return "Nr";
  return "Item";
}
