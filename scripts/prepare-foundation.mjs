import fs from "fs";

function nest(flat) {
  const root = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (typeof cur[part] !== "object" || cur[part] === null) cur[part] = {};
      cur = cur[part];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return root;
}

const extra = {
  en: {
    "brand.execution": "EXECUTION",
    "kit.title": "UI kit",
    "kit.intro": "Every ASAS component, in this language.",
    "dir.projects": "Projects",
    "dir.people": "People",
    "dir.finance": "Finance",
    "dir.site": "Site team",
    "dir.none": "—",
    "role.engineerShort": "Engineer",
    "role.seniorAccountant": "Senior Accountant",
    "role.hrShort": "HR",
    "time.today0912": "Today, 09:12",
    "time.today0840": "Today, 08:40",
    "time.today0815": "Today, 08:15",
    "time.yesterday": "Yesterday",
    "time.none": "—",
    "person.mohammed": "Mohammed Rahman",
    "person.fatima": "Fatima Noor",
    "person.yousef": "Yousef Haddad",
    "person.aisha": "Aisha Karim",
    "person.reem": "Reem Saleh",
    "person.layla": "Layla Hassan",
    "person.omar": "Omar Farouk",
    "person.initials.mohammed": "MR",
    "person.initials.fatima": "FN",
    "person.initials.yousef": "YH",
    "person.initials.aisha": "AK",
    "person.initials.reem": "RS",
    "person.initials.layla": "LH",
    "person.initials.omar": "OF",
    "us.selectedCount": "{count, plural, one {# selected} other {# selected}}",
    "ov.thisWeek": "This week",
  },
  ar: {
    "brand.execution": "التنفيذ",
    "kit.title": "مكتبة الواجهة",
    "kit.intro": "كل مكوّنات أساس، بهذه اللغة.",
    "dir.projects": "المشاريع",
    "dir.people": "شؤون الأفراد",
    "dir.finance": "المالية",
    "dir.site": "فريق الموقع",
    "dir.none": "—",
    "role.engineerShort": "مهندس",
    "role.seniorAccountant": "محاسب أول",
    "role.hrShort": "موارد بشرية",
    "time.today0912": "اليوم، 09:12",
    "time.today0840": "اليوم، 08:40",
    "time.today0815": "اليوم، 08:15",
    "time.yesterday": "أمس",
    "time.none": "—",
    "person.mohammed": "محمد رحمن",
    "person.fatima": "فاطمة نور",
    "person.yousef": "يوسف حداد",
    "person.aisha": "عائشة كريم",
    "person.reem": "ريم صالح",
    "person.layla": "ليلى حسن",
    "person.omar": "عمر فاروق",
    "person.initials.mohammed": "مح",
    "person.initials.fatima": "فن",
    "person.initials.yousef": "يح",
    "person.initials.aisha": "عك",
    "person.initials.reem": "رص",
    "person.initials.layla": "لح",
    "person.initials.omar": "عف",
    "us.selectedCount":
      "{count, plural, zero {# محدد} one {# محدد} two {# محددان} few {# محددون} many {# محدداً} other {# محدد}}",
    "ov.thisWeek": "هذا الأسبوع",
  },
};

for (const locale of ["en", "ar"]) {
  const flat = JSON.parse(fs.readFileSync(`asas-ui/assets/i18n/${locale}.json`, "utf8"));
  Object.assign(flat, extra[locale]);
  fs.mkdirSync("messages", { recursive: true });
  fs.writeFileSync(`messages/${locale}.json`, JSON.stringify(nest(flat), null, 2));
}

const html = fs.readFileSync("asas-ui/index.html", "utf8");
const start = html.indexOf('<svg width="0"');
const end = html.indexOf("</svg>", start);
const sprite = html.slice(start, end + 6);
fs.mkdirSync("src/components", { recursive: true });
fs.writeFileSync(
  "src/components/icon-sprite-markup.ts",
  `export const iconSpriteMarkup = ${JSON.stringify(sprite)};\n`,
);

let css = fs.readFileSync("asas-ui/assets/css/asas.css", "utf8");
css = css.replace(
  `--font-latin: "Source Sans 3", "Source Sans Pro", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-arabic: "Noto Sans Arabic", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;`,
  `--font-latin: var(--font-source-sans), "Source Sans 3", system-ui, sans-serif;
  --font-arabic: var(--font-ibm-arabic), var(--font-noto-arabic), "IBM Plex Sans Arabic", "Noto Sans Arabic", sans-serif;
  --font-mono: var(--font-plex-mono), "IBM Plex Mono", ui-monospace, monospace;`,
);
css += `
.nav-item { position: relative; overflow: hidden; }
.nav-item[aria-current="page"] { box-shadow: none; }
.nav-item[aria-current="page"]::before {
  content: "";
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 3px;
  background: var(--champagne);
  border-start-start-radius: 10px;
  border-end-start-radius: 10px;
}
[dir="rtl"] .brand small { letter-spacing: 0.12em; }
`;
fs.mkdirSync("src/styles", { recursive: true });
fs.writeFileSync("src/styles/asas.css", css);
console.log("ready", sprite.length);
