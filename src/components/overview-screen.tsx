"use client";

import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useAccounting } from "@/components/use-accounting";
import { useDirectory } from "@/components/use-directory";
import { usePermissions } from "@/components/permissions-provider";
import { useDocuments } from "@/components/use-documents";
import { useHr } from "@/components/use-hr";
import { useOffers } from "@/components/use-offers";
import { useReports } from "@/components/use-reports";
import { Kpi } from "@/components/ui/card";
import { Bars, ListRow } from "@/components/ui/data";
import { Link } from "@/i18n/navigation";
import { invoiceState, monthProfit, owed, payable, shiftDate, weekdayIndex } from "@/lib/accounting";
import { canOpenModule, canReadAll, canWriteModule } from "@/lib/access";
import { initials, requestLabelKey } from "@/lib/directory";
import { currentMonthKey, qatarToday } from "@/lib/hr";
import { offerTitle, offerTotals } from "@/lib/offers";
import { projectTitle } from "@/lib/reports";

export function OverviewScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { profile } = useAuth();
  const { level } = usePermissions();
  const { users, requests } = useDirectory();
  const { reports, canView: canViewReports } = useReports();
  const { offers, canView: canViewOffers } = useOffers();
  const { employees, today } = useHr();
  const { expiring, canView: canViewDocuments } = useDocuments();
  const { invoices, bills, expenses, canView: canViewAccounts } = useAccounting();
  const role = profile?.role;
  const admin = role === "superAdmin";
  const todayKey = qatarToday();
  const weekStart = shiftDate(todayKey, -6);
  const weekReports = reports.filter((report) => report.date >= weekStart && report.date <= todayKey);
  const todayReports = reports.filter((report) => report.date === todayKey);
  const waiting = requests.filter((request) => request.createdAt !== null && Date.now() - request.createdAt > 24 * 60 * 60 * 1000);
  const activeUsers = users.filter((user) => user.status === "active");
  const roles = new Set(activeUsers.map((user) => user.role)).size;
  const sent = offers.filter((offer) => offer.status === "sent");
  const sentTotal = sent.reduce((sum, offer) => sum + offerTotals(offer.lines, offer.discountPct, offer.packageAmount).total, 0);
  const activeEmployees = employees.filter((employee) => employee.employment === "active");
  const present = activeEmployees.filter((employee) => today[employee.id] === "present").length;
  const late = activeEmployees.filter((employee) => today[employee.id] === "late").length;
  const absent = activeEmployees.filter((employee) => today[employee.id] === "absent").length;
  const onLeave = activeEmployees.filter((employee) => today[employee.id] === "annual" || today[employee.id] === "sick").length;
  const departments = new Set(activeEmployees.map((employee) => employee.department)).size;
  const profit = monthProfit(invoices, bills, expenses, currentMonthKey());
  const days = Array.from({ length: 7 }, (_, index) => shiftDate(todayKey, index - 6));
  const peak = Math.max(1, ...days.map((day) => reports.filter((report) => report.date === day).length));

  const cards = role === "hr" && canReadAll(level("hr"))
    ? [
        { label: t("hr.k1"), value: String(activeEmployees.length), note: t("hr.deptNote", { count: departments }) },
        { label: t("hr.k2"), value: String(present), note: t("ov.onLeave", { count: onLeave }), noteTone: "ok" as const },
        { label: t("hr.k4"), value: String(late), note: late ? t("ov.marked") : t("hr.lateNone"), noteTone: late ? "warn" as const : undefined },
        { label: t("hr.k5"), value: String(absent), note: absent ? t("ov.marked") : t("hr.absentNone"), noteTone: absent ? "danger" as const : undefined },
      ]
    : role === "accountant" && canViewAccounts
      ? [
          { label: t("acc.k2"), value: formatQar(owed(invoices), locale), note: t("fin.openNote", { count: invoices.filter((invoice) => invoice.issued && invoiceState(invoice, todayKey) !== "paid").length }) },
          { label: t("acc.k3"), value: formatQar(payable(bills, expenses), locale), note: t("fin.billNote", { count: bills.filter((bill) => bill.paid < bill.amount).length + expenses.filter((expense) => expense.paid < expense.amount).length }) },
          { label: t("fin.profit"), value: formatQar(profit.profit, locale), note: formatMonth(currentMonthKey(), locale), dark: true },
          { label: t("ov.k4"), value: String(sent.length), note: formatQar(sentTotal, locale) },
        ]
      : [
          ...(admin && canReadAll(level("users")) ? [
            { label: t("ov.k1"), value: String(requests.length), note: t("ov.waiting", { count: waiting.length }), noteTone: waiting.length ? "warn" as const : undefined },
            { label: t("ov.k2"), value: String(activeUsers.length), note: t("ov.roles", { count: roles }) },
          ] : []),
          ...(canViewReports ? [
            { label: t("ov.k3"), value: String(weekReports.length), note: t("ov.todayReports", { count: todayReports.length }), noteTone: "ok" as const },
          ] : []),
          ...(canViewOffers ? [
            { label: t("ov.k4"), value: String(sent.length), note: formatQar(sentTotal, locale), dark: true },
          ] : []),
        ];

  const activity = [
    ...(canViewReports ? weekReports.map((report) => ({ id: report.id, sort: report.date, href: `/reports/${report.id}`, icon: "report", title: projectTitle(report, locale), detail: formatDay(report.date, locale) })) : []),
    ...(canViewOffers ? sent.map((offer) => ({ id: offer.id, sort: offer.validUntil || offer.number, href: `/offers/${offer.id}`, icon: "ruler", title: `${offer.number} · ${offerTitle(offer, locale)}`, detail: offer.validUntil ? formatDay(offer.validUntil, locale) : "" })) : []),
    ...(canViewAccounts ? invoices.filter((invoice) => invoice.issued).map((invoice) => ({ id: invoice.id, sort: invoice.issuedOn, href: "/accounting", icon: "wallet", title: `${invoice.number} · ${locale === "ar" ? invoice.clientAr : invoice.clientEn}`, detail: formatDay(invoice.issuedOn, locale) })) : []),
    ...(role === "hr" && canReadAll(level("hr")) ? activeEmployees.filter((employee) => today[employee.id]).slice(0, 5).map((employee) => ({ id: employee.id, sort: employee.name, href: `/hr/${employee.id}`, icon: "brief", title: employee.name, detail: t(attendanceKey(today[employee.id])) })) : []),
  ].sort((a, b) => b.sort.localeCompare(a.sort)).slice(0, 5);

  return (
    <AppShell title={t("page.overview")}>
      <div className="page-header">
        <div>
          <span className="eyebrow">{profile ? t(`role.${profile.role}`) : ""}</span>
          <h2 className="page-title">{profile?.name || t("page.overview")}</h2>
          <p className="page-sub">{formatDay(todayKey, locale, true)}</p>
        </div>
        <div className="hstack page-actions">
          {role === "superAdmin" && canWriteModule(level("users")) ? <Link href="/users" className="btn btn--primary"><Icon name="plus" />{t("ov.newUser")}</Link> : null}
          {role === "engineer" && canWriteModule(level("reports")) ? <Link href="/reports/new" className="btn btn--primary"><Icon name="plus" />{t("rep.new")}</Link> : null}
          {role === "accountant" && canViewAccounts ? <Link href="/accounting" className="btn btn--primary">{t("nav.accounting")}</Link> : null}
          {role === "hr" && canOpenModule(level("hr")) ? <Link href="/hr" className="btn btn--primary">{t("nav.hr")}</Link> : null}
        </div>
      </div>
      {cards.length > 0 ? (
        <div className="grid-4">
          {cards.map((card) => <Kpi key={card.label} label={card.label} value={card.value} note={card.note} noteTone={"noteTone" in card ? card.noteTone : undefined} dark={"dark" in card ? card.dark : false} />)}
        </div>
      ) : null}
      <div className="split">
        <div className="stack">
          {canViewReports ? (
            <div className="card">
              <div className="between">
                <div>
                  <h3 className="card-title">{t("ov.chart")}</h3>
                  <p className="card-sub">{t("ov.chartLive")}</p>
                </div>
              </div>
              <Bars
                items={days.map((day) => {
                  const count = reports.filter((report) => report.date === day).length;
                  const weekend = weekdayIndex(day) === 5 || weekdayIndex(day) === 6;
                  return {
                    label: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC", numberingSystem: "latn" }).format(new Date(`${day}T00:00:00Z`)),
                    value: formatNumber(count, locale),
                    height: count === 0 ? 8 : Math.round(count / peak * 150),
                    tone: day === todayKey ? "now" as const : weekend ? "weekend" as const : undefined,
                  };
                })}
              />
            </div>
          ) : null}
          <div className="card">
            <h3 className="card-title">{t("ov.activity")}</h3>
            {activity.length === 0 ? <p className="muted">{t("ov.empty")}</p> : null}
            {activity.map((item) => (
              <ListRow
                key={item.id}
                leading={<span className="tile-icon"><Icon name={item.icon} className="icon icon--sm" /></span>}
                title={<Link href={item.href}>{item.title}</Link>}
                action={<small className="muted">{item.detail}</small>}
              />
            ))}
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <div className="between">
              <h3 className="card-title">{t("ov.req")}</h3>
              {admin ? <Link className="link" href="/users">{t("common.viewAll")}</Link> : null}
            </div>
            {requests.length === 0 ? <p className="muted">{t("us.requestsEmpty")}</p> : null}
            {requests.map((request) => (
              <ListRow
                key={request.id}
                leading={<span className="avatar">{initials(request.name)}</span>}
                title={request.name}
                detail={t(requestLabelKey(request.requestedRole))}
                action={admin ? <Link href="/users" className="btn btn--secondary btn--sm">{t("btn.review")}</Link> : null}
              />
            ))}
          </div>
          {canViewDocuments ? (
            <Link href="/notifications" className="ai">
              <Icon name="bell" />
              <span>{expiring.length > 0 ? t("doc.expiringNote", { count: expiring.length }) : t("ntf.empty")}</span>
            </Link>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function attendanceKey(status: string | undefined) {
  if (status === "late") return "hr.statusLate";
  if (status === "absent") return "hr.statusAbsent";
  if (status === "annual") return "hr.statusAnnual";
  if (status === "sick") return "hr.statusSick";
  return "hr.statusPresent";
}

function formatDay(value: string, locale: string, long = false) {
  return new Intl.DateTimeFormat(locale, long
    ? { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Qatar", numberingSystem: "latn" }
    : { dateStyle: "medium", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${value}T12:00:00+03:00`));
}

function formatMonth(month: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${month}-01T12:00:00+03:00`));
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { numberingSystem: "latn" }).format(value);
}

function formatQar(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "QAR", numberingSystem: "latn", maximumFractionDigits: 0 }).format(amount);
}
