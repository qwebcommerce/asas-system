# ASAS System — Master build prompt for Cursor

> Paste this whole file into Cursor (Agent mode) as the first message of the project, or save it as `.cursor/rules/asas.mdc` so it stays in context. Keep the `ui-kit/` folder (the HTML/CSS prototype that comes with this file) in the repo. It is the visual source of truth.

---

## 0. Your role and the golden rules

You are the senior full‑stack engineer building **ASAS System**. It is the private, internal web system of **ASAS Execution** (asasqa.com), a construction, finishing, interior design, furniture and architectural plans company in Qatar. Only company staff use it. Every page is behind sign‑in.

Follow these rules on every task:

1. **Use Next.js.** Use the latest stable version, with the **App Router**, **TypeScript (strict)** and **React Server Components** by default. Use client components only when they need interactivity.
2. **Make it bilingual from day one: English + Arabic.** Every user-facing string goes through translations, with no hard-coded text in components. Arabic is a full **RTL** layout, not a mirrored afterthought (see §3).
3. **Match the UI kit pixel for pixel.** Copy tokens, class names and spacing from `ui-kit/assets/css/asas.css` and the HTML pages. The look is "elegant, simple, easy on the eye, luxurious": restrained greys, one champagne accent, generous whitespace, light font weights for big numbers.
4. **The server enforces permissions.** Every Server Action, Route Handler and DB query checks the user's role and module access. Hiding a menu item is not security.
5. **AI drafts, a human approves.** AI never sends emails, posts journal entries, pays salaries or changes access by itself.
6. **Audit everything that matters.** Sign‑ins, access changes, approvals, payments, deletions and document sends go to an append‑only audit log.
7. **Money is exact.** Store amounts as integers in dirhams (QAR × 100) or as `Decimal`, never as floats. Accounting is double‑entry and must always balance.
8. Work in small, reviewable steps. After each phase, run `typecheck`, `lint` and the tests, and fix them before moving on.

---

## 1. Tech stack

| Concern | Choice |
|---|---|
| Framework | **Next.js (latest stable), App Router**, TypeScript strict, `src/` dir |
| Styling | **Tailwind CSS** with the theme mapped to the CSS variables in `asas.css` (keep the variables, so dark mode and RTL work). Use logical utilities only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`). |
| UI primitives | Radix UI / shadcn/ui, **restyled** to the ASAS tokens. Do not keep the shadcn default look. |
| i18n | **next-intl**, with locale routing `/en/...` and `/ar/...`. Default `en`, and Arabic is remembered per user. |
| Auth | **Auth.js (NextAuth v5)**, using credentials (email + password, argon2id) plus **2‑step verification** (SMS/Email OTP or TOTP). Sessions are stored in the DB. |
| DB | **PostgreSQL** + **Prisma** |
| Validation | **Zod**, shared by forms (react-hook-form) and Server Actions |
| Tables | TanStack Table. On phones, rows become cards (see the `.table--cards` pattern). |
| Charts | Recharts, or hand-made SVG/CSS bars like the kit. Use the muted palette only. |
| Files | S3‑compatible storage with signed URLs. Virus-scan uploads. |
| PDF | Use `@react-pdf/renderer` (or Playwright HTML→PDF) on the **ASAS letterhead**, with English and Arabic versions. |
| Email | Use a provider adapter (Microsoft 365 / Google Workspace / IMAP) so the email module is built against an interface. **The provider is still an open question. Ask before implementing.** |
| AI | **Claude API** (Anthropic SDK), server side only, with the key in env. |
| Background jobs | Inngest, or a BullMQ worker, for OCR, AI summaries, reminders and scheduled reports |
| Testing | Vitest (unit), Playwright (e2e, run in **both EN and AR** and at phone width) |
| Quality | ESLint, Prettier, `eslint-plugin-i18next` (or a custom rule) that **fails on hard‑coded JSX strings** |

---

## 2. Design system (from the UI kit)

**Fonts.**
- Latin: **Source Sans 3** (300/400/600/700).
- Arabic: **IBM Plex Sans Arabic**, with **Noto Sans Arabic** as the fallback.
- Codes and account numbers: IBM Plex Mono.
- Load the fonts with `next/font`.

**Brand palette:**
- Onyx `#1C1C1B`
- Graphite `#474748`
- Steel `#9C9EA1`
- Silver `#C5C7C9`
- Mist `#E6E7E8`

**Accent:**
- Champagne `#C9B28A`
- Champagne Deep `#7E6847` (text on light backgrounds)
- Champagne Tint `#EFE7D8`

**Surfaces:**
- Porcelain `#F5F5F4` (app background)
- White cards
- Night `#141414` (dark mode)

**Status colours.** These are muted and always paired with a text label, never colour alone:

| Status | Text | Background |
|---|---|---|
| ok | `#3F7A57` | `#E8F1EB` |
| warn | `#9A6B1F` | `#F6EEDD` |
| danger | `#A23E36` | `#F6E6E4` |
| info | `#3E6485` | `#E6EDF3` |

**Rules:**
- The sidebar is dark Onyx. The active item has a champagne inline‑start bar.
- Champagne is used only for the **one primary money/approval action** on a screen (Pay salaries, Send request, Approve access). Other primary buttons are Onyx.
- AI surfaces use a champagne‑tinted card with a ✦ spark icon.
- Corner radii are 14 to 20 px, shadows are soft, and big KPI numbers use weight 300.
- Port every component in `asas.css` to a React component with the same variants:
  - Button (primary / accent / secondary / ghost; sm / lg / block)
  - Badge, Chip, Level, Card, KPI, Banner, AiNote, ListRow
  - Avatar, Table, BulkBar, Field, Input, Select, Textarea
  - Check, Switch, Segmented, Dropzone, Modal, Drawer, Toast
  - Tabs, Steps, Bars, Paper/Sheet
- Breakpoints:
  - **≤1024 px:** the sidebar becomes an off‑canvas drawer and the top bar turns dark.
  - **≤720 px:** tables become cards and grids collapse.
  - This is a **responsive website**, not a mobile app. No native app.
- The theme is light (Porcelain) or dark (Onyx), saved per user. Respect `prefers-color-scheme` on first visit.
- Accessibility: WCAG 2.2 AA contrast, visible focus rings, `aria-*` on dialogs, keyboard support for every overlay (Esc closes it, focus is trapped), and `prefers-reduced-motion` respected.
- Motion: overlays fade in (250 ms). Drawers slide from the inline‑end edge (300 ms, ease `cubic-bezier(.2,.7,.2,1)`). Toasts slide in and auto‑hide after about 3 s.

---

## 3. English & Arabic — requirements (must‑have)

1. **Routing.** Use `app/[locale]/...` with next-intl middleware. Set `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>` in the root layout. The language switch (EN | ع) is in the top bar on every page (including phones) and in Settings. Switching keeps the current path.
2. **Messages.** Put them in `messages/en.json` and `messages/ar.json`. **Start from `ui-kit/assets/i18n/en.json` and `ar.json`** (376 keys already translated). Keys are namespaced and dot‑separated by area, for example `nav.payroll`, `pay.confirmT`, `col.netQar`, `st.pending`. Rules:
   - Never concatenate translated strings. Use ICU messages with placeholders: `"{count, plural, one {# employee} other {# employees}}"`. Arabic plural rules (zero/one/two/few/many/other) must be filled in.
   - Every key must exist in both files. Add a CI check that fails on missing or extra keys.
   - Enums (roles, statuses, document types, services, account types) are translated by key (`role.hr`, `ds.signed`…), never stored as display text in the DB.
3. **RTL layout.**
   - Use only **logical CSS** (`margin-inline-start`, `inset-inline-end`, `text-align: start/end`).
   - Directional icons (chevrons, back, sign‑out, send) flip in RTL (`.icon--flip`).
   - Drawers open from the inline‑end edge, and the off‑canvas sidebar from the inline‑start edge.
   - Charts read right‑to‑left in Arabic.
4. **Numbers, dates and currency.**
   - Use **Western digits (0‑9) in both languages.** This is the ASAS decision, matching the Figma design.
   - Format with `Intl` and `numberingSystem: 'latn'`.
   - Currency is **QAR** (`QAR 468,850` / `468,850 ر.ق` in Arabic, with the code shown).
   - Dates use the Gregorian calendar, formatted per locale (`2 Nov 2026` / `2 نوفمبر 2026`).
   - The week starts on **Sunday**. **Friday and Saturday are the weekend.**
   - Timezone is `Asia/Qatar`.
   - Codes like `ASAS-0142`, `OF-2026-126`, IBANs and account numbers are always LTR. Wrap them in `<bdi>` or `dir="ltr"`.
5. **User content.** People's names, project names and notes are stored as typed. Where the business needs both languages (client name, project name, offer line items, document titles), store `nameEn` and `nameAr` and show the one for the current locale, falling back to the other.
6. **Documents and PDFs.** Offers, invoices, payslips and reports can be generated in **English, Arabic or bilingual** on the letterhead, with the Arabic font embedded and correct RTL shaping.
7. **AI output** follows the user's current locale (pass the locale in the system prompt). Emails are summarised in the language the user reads in.
8. **Tests.** Every Playwright e2e test runs in `en` and `ar`. Add a visual check that no element overflows horizontally in RTL at 390 px.

---

## 4. Users, roles and access

**Roles:**

| Role | Example user |
|---|---|
| Super Admin | Abdullah S. |
| CEO | Saad Al‑Kaabi. Approves salaries and large payments. |
| HR | Layla Hassan |
| Engineer / Site Engineer | Mohammed Rahman |
| Accountant | Aisha Karim |
| Staff | Omar Farouk |

**Onboarding flow** (this is the screens `index`, `register` and `staff`):
1. A person registers with full name, employee ID, work email, mobile and password, and agrees to the rules.
2. They get **basic access only**: their profile, leave balance, attendance and announcements.
3. They press **Request access**, choose a dashboard (HR / Engineer / Accountant / Staff) and write a message.
4. The Super Admin sees the request (Overview + Users → Access requests). They open the drawer, check the ID and photo, assign the role and toggle modules, tick "I confirmed this person works at ASAS", then Approve or Decline.
5. The requester gets an email and an in‑app notification. Every step is audited.

**Permission levels per module:** `full`, `view`, `own` (only own records), `request` (can ask), `none`. Keep the matrix in code (`src/lib/rbac.ts`), and let the Super Admin override it per user. Default matrix:

| Module | Super Admin | CEO | HR | Engineer | Accountant | Staff |
|---|---|---|---|---|---|---|
| Users & Access | full | view | none | none | none | none |
| HR (employees, attendance, leave, careers) | full | view | full | own | view | own |
| Project reports | full | view | none | full | view | none |
| Dimensions & Offers | full | view | none | full | view | none |
| Documents | full | full | full (HR docs) | full (project docs) | full (finance docs) | own |
| Accounting | full | view + approve | none | none | full | none |
| Payroll | full | approve | prepare attendance | none | full | own payslips |
| Email | full | own | own | own | own | own |
| AI Assistant | yes | yes | yes | yes | yes | limited |
| Bank accounts | **full (only Super Admin)** | view | none | none | view (no edit) | none |

The sidebar shows only the modules the user can open. The URL and server checks return 403 otherwise.

**Auth.**
- Sign-in is by email and password, with 2‑step verification at every new device sign‑in.
- "Keep me signed in" lasts 30 days.
- Lock the account after 5 failed tries.
- Password reset is by email link.
- Sign‑in alerts go by email.
- Show the session list in Settings.

---

## 5. Modules and screens

Build these routes under `app/[locale]/(app)/`. Each one maps to a kit page or a Figma frame (Figma file "ASAS", page "ASAS System — Design").

1. **Overview** (`/overview`, kit `overview.html` and `staff.html`). This is role-aware.
   - KPIs: access requests, active users, site reports this week, offers awaiting client.
   - A daily site reports bar chart for the last 7 days, with the weekend in a lighter tone.
   - Recent activity, access requests, and an AI email summary.
2. **Users & Access** (`/users`, kit `users.html`).
   - Tabs: Users, Access requests, Roles & permissions (an editable matrix), Bank accounts.
   - Search and filters, bulk bar (approve / change role / disable), the access drawer, and an invite user dialog.
3. **HR** (`/hr/...`, kit `employees.html`).
   - **Employees:** list and profile with documents, ID/visa/passport expiry, bank details (view only for HR) and salary info.
   - **Attendance & leave:** a month grid with Fri/Sat shaded, leave requests with approval, and balances.
   - **Careers:** job posts, applicants and an ATS pipeline, with **AI CV scoring** shown as a suggestion with reasons.
   - **HR documents.**
   - Action: **"Send attendance report to Accounting"** for the salary run.
4. **Project reports** (`/reports/...`, kit `report-new.html`).
   - **Daily site report:** project, date, weather, service chip, work items table (area, work, done today, status), workers on site, subcontractors, overall %, issues, and up to 10 photos (camera capture on phones).
   - Actions: "Write with AI from my notes" and an AI consistency check.
   - **Weekly report:** AI drafts it from the daily reports; the engineer edits it, then sends it to the client as a PDF.
   - Project list with progress and budget.
   - Services: Construction, Finishing, Interior design, Furniture, Architectural plans.
5. **Dimensions & Offers** (`/offers/...`, kit `offer-new.html`).
   - A 4‑step wizard: Client → Measurements → Pricing → Offer.
   - Measurements table: room, work, L/W/H in m, auto qty (m², lm, pcs, set), unit, rate from the **price list**, and total.
   - Filter chips by trade.
   - Summary: subtotal, discount %, total, valid 30 days.
   - Preview on letterhead, then send. Offer statuses: Draft → Sent → Accepted / Rejected / Expired.
   - An accepted offer can become a project and a progress-billing plan.
   - Numbering: `OF-YYYY-NNN`.
   - Check value: OF‑2026‑126 subtotal is 23,092, the 5% discount is 1,155, and the total is QAR 21,937.
6. **Documents** (`/documents`, kit `documents.html`).
   - Folders and filters: All, Shared with me, Expiring soon, Contracts, Drawings, Permits.
   - Versioning (v1, v2, v3…), statuses (Draft, In review, Signed, Expired), expiry dates with reminders at 30, 14 and 7 days, sharing and a sent log, and a details drawer.
   - Permissions are per folder and per document.
7. **Accounting** (`/accounting/...`, kit `accounting.html`). Covered in full in §6.
8. **Payroll** (`/payroll/...`, kit `salary-run.html`). Covered in §7.
9. **Email** (`/email`). A unified inbox per user from the connected provider, with:
   - an AI summary of new mail and "what needs me";
   - AI draft replies, which the user edits and sends;
   - the ability to link a thread to a project, client or document.
10. **AI Assistant.** A dark drawer opened from any page (✦). It answers about the current page, reports and emails, and suggests actions as chips. Every action needs a confirm click.
11. **Settings** (`/settings`, kit `settings.html`). Profile, language, theme, 2‑step verification, sign‑in alerts and sessions.
12. **Notifications.** A bell with a dot, and email notifications for approvals, expiring documents, cheques due and late attendance.

---

## 6. Accounting (full double-entry): rules FIN‑01 … FIN‑15

- **FIN‑01 Chart of accounts.** Use five types: Assets, Liabilities, Equity, Income and Expenses. Seed a construction‑company COA in EN and AR. Accounts can be tagged by project (cost centre).
- **FIN‑02 Journal.** Every money event creates a journal entry with balanced lines (Σ debit = Σ credit, enforced in the DB with a check or trigger, and in code). Posted entries are immutable. Corrections are made by reversal.
- **FIN‑03 Periods.** Use monthly periods. A closed period blocks posting. Only the Super Admin or CEO can reopen one, with a reason that is audited.
- **FIN‑04 Clients (AR).** Clients, invoices and receipts, with an aging report (0–30, 31–60, 61–90, 90+).
- **FIN‑05 Progress invoices.** Bill a % of the contract value with **retention** (default 5%), and track retention due.
  - Example: INV‑2026‑312 bills 40% of 96,500, which is 38,600. Retention is 1,930. Net is QAR 36,670.
- **FIN‑06 Suppliers (AP).** Suppliers, bills, payments, and due dates.
- **FIN‑07 Banks.**
  - Three accounts:
    - QNB Main •••• 1102
    - CBQ Operations •••• 5571
    - Doha Bank Site expenses •••• 0094
  - Balances, transfers between accounts, CSV statement import, and reconciliation.
  - Bank account master data is editable **only by the Super Admin**.
- **FIN‑08 Cheques.**
  - Received and issued cheques, each with a number, bank and due date.
  - Statuses: in hand → deposited → cleared / bounced.
  - Show a "due this week" list.
- **FIN‑09 Petty cash and site expenses.** Engineers upload receipts. **AI OCR** extracts the vendor, date and amount as a suggestion. The accountant approves and posts it.
- **FIN‑10 Project budgets.** Approved budget vs actual per project, with an alert at 90% and at 100% or more (shown red).
- **FIN‑11 Approvals.** Payments above a threshold (configurable, for example QAR 50,000) need CEO approval.
- **FIN‑12 Reports.** P&L, balance sheet, trial balance, cash flow, AR/AP aging and project profitability. Export to PDF and Excel, in EN and AR.
  - Check value for P&L October 2026: revenue 840,000, cost of works 552,000, gross 288,000, opex 120,000, net **168,000**.
- **FIN‑13 Tax.** **Qatar has no VAT yet.** Build tax fields but keep them **switched off** behind a setting, so VAT can be enabled later without a migration.
- **FIN‑14 Currency.** The base currency is QAR. Foreign-currency invoices are optional, with a stored exchange rate.
- **FIN‑15 Audit.** Every create, edit, post, reverse and delete in accounting is logged with the user, time, before and after values, and IP.

Seed the dashboard data so it matches the kit:
- Cash in banks: QAR 1.84M
  - QNB 1,240,500
  - CBQ 412,300
  - Doha Bank 186,200
- Owed to ASAS: QAR 726K, of which 212K is overdue.
- ASAS owes: QAR 318K, across 12 bills.

---

## 7. Payroll and WPS

**The flow has 4 steps** (shown as a stepper):
1. **Attendance.** HR sends the attendance report.
2. **Salary report.** The accountant prepares the salary report: basic, allowances, deductions (late, absence, advances) and net.
3. **Approved.** The CEO approves it.
4. **Pay.** The accountant pays.

**Payment methods:**
- **Bank transfer.** A **WPS (Qatar Wage Protection System) SIF file** is generated from the employee bank, IBAN and amounts, and then uploaded to the bank.
- **Cash / cheque.** A list is printed and signed for each employee.

The Pay modal shows the total, the source bank, the approver and the month, plus two options: "Create and upload the WPS salary file" and "Email payslips". Then **Confirm & pay**, followed by a toast.

**Posting:** the payroll creates journal entries:
- Salary expense goes to salaries payable.
- On payment, salaries payable goes to the bank, or to cash.

**Payslips:** PDF in EN and AR, emailed and visible to the employee under "own".

**Check values (October 2026):**
- Bank transfer: 44 employees, **QAR 468,850**, paid from QNB Main •••• 1102.
- Cash / cheque: 4 employees, QAR 17,400.
- Total accrual: **QAR 486,250**.

Bank details are editable only by the Super Admin. The payroll screen shows them masked (`•••• 4471`).

---

## 8. AI features (Claude API)

Create `src/server/ai/` with one function per feature. All of them run server side. Each one:
- has a typed input and output (validated with Zod);
- passes the user's locale;
- logs usage;
- never sends or posts by itself.

| Feature | Where | Output |
|---|---|---|
| Email summary + "needs me" | Overview, Email | A short summary and an action list |
| Draft email reply | Email | A draft for the user to edit |
| Daily report from notes | Report form | Filled fields for the engineer to review |
| Report consistency check | Report form | Warnings, for example "progress jumped 20% in one day" |
| Weekly client report | Reports | A draft of the weekly report, in the client's language |
| CV / ATS scoring | Careers | A score from 0 to 100, with reasons and a match to the job post |
| Receipt OCR | Accounting | Vendor, date and amount, with a confidence value |
| Assistant drawer | Everywhere | An answer plus suggested actions that need a confirm click |

Data scoping: the AI only receives data the current user is allowed to see. Use the same RBAC layer.

---

## 9. Data model (Prisma, starting point)

`User`, `Session`, `TwoFactor`, `Role`, `ModulePermission` (userId, module, level), `AccessRequest` (status: pending/approved/declined, requestedRole, message, reviewedBy), `AuditLog` (append‑only).

`Employee` (empNo `ASAS-0000`, positionEn/Ar, department, joinDate, mobile, idNo, idExpiry, passportExpiry, visaExpiry, bankId, iban, basic, allowances), `Attendance` (date, checkIn, checkOut, status), `LeaveRequest`, `LeaveBalance`, `JobPost`, `Applicant` (cvFile, aiScore, stage).

`Client` (nameEn/Ar), `Project` (code, nameEn/Ar, service, clientId, budget, progress, status), `DailyReport` (projectId, date, weather, service, workers, subcontractors, progress, issues), `ReportItem`, `ReportPhoto`, `WeeklyReport`.

`PriceListItem` (trade, nameEn/Ar, unit, rate, year), `Offer` (number `OF-YYYY-NNN`, clientId, projectId?, status, discountPct, validUntil, language), `OfferLine` (room, work, l, w, h, qty, unit, rate, total).

`Document` (titleEn/Ar, type, projectId?, folder, status, expiresAt), `DocumentVersion` (file, version, uploadedBy), `DocumentShare`, `DocumentSendLog`.

`Account` (code, nameEn/Ar, type, parentId, projectTag?), `JournalEntry` (date, period, memo, sourceType, sourceId, postedBy, reversedById?), `JournalLine` (accountId, debit, credit, projectId?), `Period`, `Invoice` (number `INV-YYYY-NNN`, progressPct, retentionPct), `Receipt`, `Supplier`, `Bill`, `Payment`, `BankAccount` (name, bank, last4, ibanEncrypted), `BankTransaction`, `Cheque` (direction in/out, number, bank, dueDate, status), `Expense` (receiptFile, ocrJson, status), `Budget`.

`PayrollRun` (month, status: attendance/prepared/approved/paid, approvedBy, paidFrom), `PayrollLine` (employeeId, basic, allowances, deductions, net, method bank/cash/cheque), `WpsFile`, `Payslip`.

`EmailAccount`, `EmailThread` (link to project/client/document), `Notification`, `Setting` (incl. `vatEnabled=false`, `paymentApprovalThreshold`).

Encrypt IBANs and ID numbers at rest. Soft‑delete business records. Never hard‑delete accounting records.

---

## 10. Folder structure

```
src/
  app/
    [locale]/
      (auth)/sign-in, register, forgot-password, verify
      (app)/layout.tsx            # sidebar + topbar + AI drawer
      (app)/overview, users, hr/*, reports/*, offers/*, documents, accounting/*, payroll/*, email, settings
    api/                          # webhooks, file upload signing, cron
  components/ui/                  # Button, Badge, Card, Table, Drawer, Modal, Toast… (ported from asas.css)
  components/app/                 # Sidebar, Topbar, LanguageSwitch, ThemeToggle, AiDrawer, KpiCard…
  features/<module>/              # components, actions.ts (Server Actions), queries.ts, schema.ts
  server/{auth,rbac,audit,ai,pdf,wps,email,storage}/
  lib/{format.ts (Intl helpers, latn digits, QAR), money.ts, dates.ts (Asia/Qatar, Sun–Thu week)}
  i18n/{routing.ts, request.ts}
messages/{en.json, ar.json}
prisma/{schema.prisma, seed.ts}   # seed = the kit's demo data (same names and numbers)
ui-kit/                           # this HTML/CSS prototype, for reference only
```

---

## 11. Build phases (do them in order, and stop for review after each)

1. **Foundation.**
   - Next.js app, Tailwind mapped to the tokens, fonts, next-intl EN/AR with RTL, and theme light/dark.
   - App shell (sidebar per role, top bar, language switch, theme toggle, AI drawer placeholder).
   - The UI component library, plus a `/[locale]/kit` page showing every component in both languages.
2. **Auth & access.** Register, sign in, 2FA, basic staff dashboard, request access, Super Admin review drawer, RBAC matrix, audit log, and Settings.
3. **HR.** Employees, attendance grid, leave, careers + ATS (AI scoring stubbed first), expiry reminders.
4. **Projects & reports.** Projects, daily report (photos), weekly report (AI draft), client PDF.
5. **Dimensions & offers.** Price list, wizard, auto quantities, letterhead PDF in EN and AR, statuses, convert to project.
6. **Documents.** Folders, versions, sharing, expiry, sent log.
7. **Accounting.** COA, journal, AR/AP, progress invoices + retention, banks, cheques, expenses + OCR, budgets, approvals, reports.
8. **Payroll.** Runs, the CEO approval step, WPS SIF export, payslips, postings.
9. **Email + AI.** Provider adapter, inbox, summaries, drafts, assistant actions.
10. **Hardening.** Full EN/AR e2e, phone width tests, accessibility audit, performance (aim for LCP under 2.5 s), security review (OWASP ASVS L2), backups, and a deployment runbook.

---

## 12. Acceptance criteria (for every screen)

- [ ] It looks the same as the kit or Figma at 1440 px and 390 px, in **EN and AR**, in **light and dark**.
- [ ] There are no hard‑coded strings, and every key exists in `en.json` and `ar.json`.
- [ ] RTL is correct: logical spacing, flipped directional icons, drawers from the correct side, and no horizontal scroll at 390 px.
- [ ] Numbers use Western digits. Money is formatted as QAR. Dates are in Asia/Qatar. The weekend is Fri and Sat.
- [ ] Server-side RBAC is enforced, and there is a test that a lower role gets 403.
- [ ] Important actions are written to the audit log.
- [ ] Every money flow posts balanced journal entries, and there is a test for it.
- [ ] Loading, empty and error states are designed (skeletons, empty illustrations with text, and a retry option).
- [ ] Keyboard and screen reader use works for dialogs, drawers, tables and forms.
- [ ] Demo seed numbers match the kit (bank totals, payroll totals, P&L, offer and invoice examples).

---

## 13. Open questions. Ask the user before building these parts.

1. Which email provider: Microsoft 365, Google Workspace, or plain IMAP/SMTP?
2. Which SMS gateway for 2‑step codes (e.g. Ooredoo, Vodafone Qatar, Twilio)? Or should we use authenticator apps (TOTP) only?
3. Hosting: Vercel + managed Postgres, or a Qatar/GCC data centre (data residency)?
4. Which bank's WPS SIF format comes first (QNB?), and what is the employer ID / MOL establishment number?
5. What payment approval threshold should apply to CEO sign‑off?
6. Should offers and invoices default to bilingual PDFs, or the client's language?

---

## 14. How to use the UI kit in this repo

- `ui-kit/*.html` contains 12 working pages: sign in, register, staff, overview, users, employees, daily report, new offer, documents, accounting, salary run and settings. Open them in a browser. The EN/ع switch, theme toggle, mobile menu, modals, drawers and toasts all work.
- `ui-kit/assets/css/asas.css` holds every token and component. Port it, and keep the variable names.
- `ui-kit/assets/i18n/en.json` / `ar.json` are the starting translation files. Copy them into `messages/` and regroup them into nested namespaces if you prefer, but keep the meanings.
- `ui-kit/build.py` generates the kit. It is reference only and not part of the app.

**First task:** do Phase 1, then show me the `/en/kit` and `/ar/kit` pages.
