"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { RecordModal, type Book } from "@/components/accounting-screen";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { ProjectModal, formatQar, projectMoney, statusTone } from "@/components/projects-screen";
import { useAccounting } from "@/components/use-accounting";
import { useDocuments } from "@/components/use-documents";
import { useOffers } from "@/components/use-offers";
import { useProjects } from "@/components/use-projects";
import { useReports } from "@/components/use-reports";
import { Kpi } from "@/components/ui/card";
import { Tabs } from "@/components/ui/data";
import { Modal, Toast } from "@/components/ui/overlay";
import { Link, useRouter } from "@/i18n/navigation";
import { billState, invoiceMath, invoiceState, partyName } from "@/lib/accounting";
import { documentTitle } from "@/lib/documents";
import { qatarToday } from "@/lib/hr";
import { offerTitle, offerTotals, type Offer } from "@/lib/offers";
import type { ProjectReport } from "@/lib/reports";
import { projectName, type Project } from "@/lib/projects";
import { openLibraryFile } from "@/server/documents";
import { deleteProject } from "@/server/projects";

type Tab = "overview" | "reports" | "costs" | "receipts" | "documents";

/** One project: its client and budget, and everything recorded against it. */
export function ProjectScreen({ projectId }: { projectId: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { getToken } = useAuth();
  const { projects, ready, canView, canManage } = useProjects();
  const accounting = useAccounting();
  const reportsData = useReports();
  const offersData = useOffers();
  const docsData = useDocuments();
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [record, setRecord] = useState<{ book: Book; id: string | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);
  const project = projects.find((item) => item.id === projectId);

  function notify(title: string, detail: string) {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), 3000);
  }

  if (ready && !canView) return <AppShell title={t("nav.projects")}><p className="muted">{t("common.forbidden")}</p></AppShell>;
  if (!ready) return <AppShell title={t("nav.projects")}><p className="muted">{t("common.loading")}</p></AppShell>;
  if (!project) {
    return (
      <AppShell title={t("nav.projects")}>
        <Link href="/projects" className="back">{t("prj.back")}</Link>
        <p className="muted">{t("prj.missing")}</p>
      </AppShell>
    );
  }

  const today = qatarToday();
  const money = projectMoney(project.id, accounting);
  const remaining = project.budget - money.spent;
  const reports = reportsData.reports.filter((r) => r.projectId === project.id).sort((a, b) => b.date.localeCompare(a.date));
  const bills = accounting.bills.filter((b) => b.projectId === project.id);
  const expenses = accounting.expenses.filter((e) => e.projectId === project.id);
  const receipts = accounting.receipts.filter((r) => r.projectId === project.id).sort((a, b) => b.receivedOn.localeCompare(a.receivedOn));
  const invoices = accounting.invoices.filter((i) => i.projectId === project.id);
  const offers = offersData.offers.filter((o) => o.projectId === project.id);
  const documents = docsData.documents.filter((d) => d.projectId === project.id);
  const preset = { projectId: project.id, projectEn: project.nameEn, projectAr: project.nameAr, clientEn: project.clientEn, clientAr: project.clientAr };
  const costRows = [
    ...bills.map((b) => ({ id: `bills:${b.id}`, book: "bills" as const, recordId: b.id, title: partyName(b, locale), meta: [b.reference, formatDay(b.issuedOn, locale)].filter(Boolean).join(" · "), category: t(`fin.cat.${b.category}`), state: billState(b, today), amount: b.amount, date: b.issuedOn })),
    ...expenses.map((e) => ({ id: `expenses:${e.id}`, book: "expenses" as const, recordId: e.id, title: partyName(e, locale), meta: [e.reference, formatDay(e.spentOn, locale)].filter(Boolean).join(" · "), category: t(`fin.cat.${e.category}`), state: e.paid >= e.amount ? "paid" : "open", amount: e.amount, date: e.spentOn })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  async function openDocument(id: string) {
    const result = await openLibraryFile(await getToken(), id);
    if (result.ok) window.open(result.url, "_blank", "noopener,noreferrer");
  }

  async function remove() {
    if (!project) return;
    const result = await deleteProject(await getToken(), project.id);
    setConfirmDelete(false);
    if (!result.ok) notify(t(result.error), projectName(project, locale));
    else router.push("/projects");
  }

  return (
    <AppShell title={projectName(project, locale)}>
      <div className="prj stack">
        <Link href="/projects" className="back">
          <Icon name="chevl" className="icon icon--sm icon--flip" />
          <span>{t("prj.back")}</span>
        </Link>
        <div className="page-header">
          <div>
            <span className="eyebrow"><bdi>{project.code}</bdi> · {t(`off.${project.kind}`)}</span>
            <h2 className="page-title">{projectName(project, locale)}</h2>
            <p className="page-sub">{locale === "ar" ? project.nameEn : project.nameAr}</p>
            <p className="kind-chosen">
              <span className={`badge badge--${statusTone(project.status)}`}>{t(`prj.status.${project.status}`)}</span>
              {project.published ? <span className="badge badge--info badge--plain">{t("prj.onWebsite")}</span> : null}
            </p>
          </div>
          {canManage ? (
            <div className="hstack page-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(true)}>{t("us.delete")}</button>
              <button type="button" className="btn btn--primary" onClick={() => setEditing(true)}>{t("us.edit")}</button>
            </div>
          ) : null}
        </div>

        <div className="grid-4">
          <Kpi label={t("prj.budget")} value={project.budget ? formatQar(project.budget, locale) : "—"} note={project.startOn ? `${formatDay(project.startOn, locale)}${project.endOn ? ` – ${formatDay(project.endOn, locale)}` : ""}` : t("prj.noDates")} />
          {accounting.canView ? (
            <>
              <Kpi label={t("prj.spent")} value={formatQar(money.spent, locale)} note={t("prj.spentNote", { count: bills.length + expenses.length })} noteTone={project.budget && money.spent > project.budget ? "danger" : undefined} />
              <Kpi label={t("prj.remaining")} value={project.budget ? formatQar(remaining, locale) : "—"} note={project.budget ? t("prj.usedPct", { pct: Math.round((money.spent / project.budget) * 100) }) : t("prj.noBudget")} noteTone={remaining < 0 ? "danger" : undefined} />
              <Kpi label={t("prj.received")} value={formatQar(money.received, locale)} note={t("prj.receiptsNote", { count: receipts.length })} dark />
            </>
          ) : null}
        </div>

        <Tabs
          value={tab}
          onChange={(id) => setTab(id as Tab)}
          items={[
            { id: "overview", label: t("prj.tabOverview") },
            { id: "reports", label: `${t("prj.tabReports")} · ${reports.length}` },
            { id: "costs", label: `${t("prj.tabCosts")} · ${costRows.length}` },
            { id: "receipts", label: `${t("prj.tabReceipts")} · ${receipts.length}` },
            { id: "documents", label: `${t("prj.tabDocuments")} · ${offers.length + invoices.length + documents.length}` },
          ]}
        />

        {tab === "overview" ? <Overview project={project} offers={offers} reports={reports} /> : null}

        {tab === "reports" ? (
          <Section
            canView={reportsData.canView}
            action={reportsData.canManage ? <Link href={`/reports/new?project=${project.id}`} className="btn btn--primary btn--sm"><Icon name="plus" />{t("rep.new")}</Link> : null}
          >
            <Rows
              empty={t("prj.noReports")}
              head={[t("rep.date"), t("prj.service"), t("prj.progress"), ""]}
              rows={reports.map((report) => [
                <b key="d" className="num">{formatDay(report.date, locale)}</b>,
                t(`svc.${report.service}`),
                <span key="p" className="num">{report.progress}%</span>,
                <Link key="v" href={`/reports/${report.id}`} className="btn btn--secondary btn--sm">{t("rep.view")}</Link>,
              ])}
            />
          </Section>
        ) : null}

        {tab === "costs" ? (
          <Section
            canView={accounting.canView}
            action={accounting.canManage ? <button type="button" className="btn btn--primary btn--sm" onClick={() => setRecord({ book: "bills", id: null })}><Icon name="plus" />{t("fin.billAdd")}</button> : null}
          >
            <Rows
              empty={t("prj.noCosts")}
              head={[t("col.name"), t("fin.category"), t("col.status"), t("col.net"), ""]}
              rows={costRows.map((row) => [
                <span key="n"><b>{row.title}</b><small className="muted" style={{ display: "block" }}><bdi>{row.meta}</bdi></small></span>,
                row.category,
                <span key="s" className={`badge badge--${row.state === "paid" ? "ok" : row.state === "overdue" ? "danger" : "warn"}`}>{t(`fin.${row.state}`)}</span>,
                <bdi key="a" className="num">{formatQar(row.amount, locale)}</bdi>,
                accounting.canManage ? <button key="e" type="button" className="btn btn--secondary btn--sm" onClick={() => setRecord({ book: row.book, id: row.recordId })}>{t("us.edit")}</button> : null,
              ])}
            />
          </Section>
        ) : null}

        {tab === "receipts" ? (
          <Section
            canView={accounting.canView}
            action={accounting.canManage ? <button type="button" className="btn btn--primary btn--sm" onClick={() => setRecord({ book: "receipts", id: null })}><Icon name="plus" />{t("fin.add.receipts")}</button> : null}
          >
            <Rows
              empty={t("prj.noReceipts")}
              head={[t("fin.receipt"), t("fin.payer"), t("fin.methodLabel"), t("fin.amount"), ""]}
              rows={receipts.map((receipt) => [
                <span key="n"><b className="num">{receipt.number}</b><small className="muted" style={{ display: "block" }}>{formatDay(receipt.receivedOn, locale)}</small></span>,
                locale === "ar" ? receipt.payerAr || receipt.payerEn : receipt.payerEn || receipt.payerAr,
                t(`fin.method.${receipt.method}`),
                <bdi key="a" className="num">{formatQar(receipt.amount, locale)}</bdi>,
                <div key="e" className="hstack" style={{ justifyContent: "flex-end" }}>
                  <Link className="btn btn--secondary btn--sm" href={`/accounting/receipts/${receipt.id}`}>{t("rcpt.open")}</Link>
                  {accounting.canManage ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRecord({ book: "receipts", id: receipt.id })}>{t("us.edit")}</button> : null}
                </div>,
              ])}
            />
          </Section>
        ) : null}

        {tab === "documents" ? (
          <div className="stack">
            <Section
              title={t("prj.docOffers")}
              canView={offersData.canView}
              action={offersData.canManage ? <Link href={`/offers/new?type=${project.kind}`} className="btn btn--secondary btn--sm"><Icon name="plus" />{t("prj.newOffer")}</Link> : null}
            >
              <Rows
                empty={t("prj.noOffers")}
                head={[t("prj.offer"), t("col.status"), t("off.total"), ""]}
                rows={offers.map((offer) => [
                  <span key="n"><b className="num">{offer.number}</b><small className="muted" style={{ display: "block" }}>{t(`off.${offer.kind}`)} · {offerTitle(offer, locale)}</small></span>,
                  t(`off.${offer.status}`),
                  <bdi key="a" className="num">{formatQar(offerTotals(offer.lines, offer.discount).total, locale)}</bdi>,
                  <span key="l" className="hstack">
                    <Link href={`/offers/${offer.id}/quotation`} className="btn btn--ghost btn--sm">{t("prj.quotation")}</Link>
                    <Link href={`/offers/${offer.id}/contract`} className="btn btn--secondary btn--sm">{t("prj.contract")}</Link>
                  </span>,
                ])}
              />
            </Section>
            <Section
              title={t("prj.docInvoices")}
              canView={accounting.canView}
              action={accounting.canManage ? <button type="button" className="btn btn--secondary btn--sm" onClick={() => setRecord({ book: "invoices", id: null })}><Icon name="plus" />{t("acc.invoice")}</button> : null}
            >
              <Rows
                empty={t("prj.noInvoices")}
                head={[t("fin.invoice"), t("col.status"), t("col.net"), ""]}
                rows={invoices.map((invoice) => {
                  const state = invoiceState(invoice, today);
                  return [
                    <span key="n"><b className="num">{invoice.number}</b><small className="muted" style={{ display: "block" }}>{formatDay(invoice.issuedOn, locale)}</small></span>,
                    <span key="s" className={`badge badge--${state === "paid" ? "ok" : state === "overdue" ? "danger" : "neutral"}`}>{t(`fin.${state}`)}</span>,
                    <bdi key="a" className="num">{formatQar(invoiceMath(invoice.contract, invoice.progressPct, invoice.retentionPct).net, locale)}</bdi>,
                    accounting.canManage ? <button key="e" type="button" className="btn btn--secondary btn--sm" onClick={() => setRecord({ book: "invoices", id: invoice.id })}>{t("us.edit")}</button> : null,
                  ];
                })}
              />
            </Section>
            <Section
              title={t("prj.docFiles")}
              canView={docsData.canView}
              action={docsData.canCreate ? <Link href="/documents" className="btn btn--secondary btn--sm"><Icon name="upload" />{t("doc.upload")}</Link> : null}
            >
              <Rows
                empty={t("prj.noFiles")}
                head={[t("col.name"), t("col.type"), ""]}
                rows={documents.map((doc) => [
                  <b key="n">{documentTitle(doc, locale)}</b>,
                  t(`dt.${doc.kind}`),
                  doc.hasFile ? <button key="o" type="button" className="btn btn--ghost btn--sm" onClick={() => void openDocument(doc.id)}>{t("hr.fileOpen")}</button> : null,
                ])}
              />
            </Section>
          </div>
        ) : null}

        <ProjectModal
          project={editing ? project : null}
          onClose={() => setEditing(false)}
          onSaved={(title) => {
            setEditing(false);
            notify(t("prj.saved"), title);
          }}
          getToken={getToken}
        />
        <RecordModal
          editor={record}
          preset={preset}
          invoices={accounting.invoices}
          bills={accounting.bills}
          expenses={accounting.expenses}
          receipts={accounting.receipts}
          onClose={() => setRecord(null)}
          onSaved={(detail) => {
            setRecord(null);
            notify(t("fin.saved"), detail);
          }}
          getToken={getToken}
        />
        <Modal open={confirmDelete} title={t("prj.deleteQ")} onClose={() => setConfirmDelete(false)}>
          <p className="muted">{t("prj.deleteNote")}</p>
          <div className="hstack" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>{t("btn.cancel")}</button>
            <button type="button" className="btn btn--primary" style={{ background: "var(--danger)" }} onClick={() => void remove()}>{t("us.delete")}</button>
          </div>
        </Modal>
        <Toast open={Boolean(toast)} title={toast?.title ?? ""} detail={toast?.detail ?? ""} />
      </div>
    </AppShell>
  );
}

function Overview({ project, offers, reports }: { project: Project; offers: Offer[]; reports: ProjectReport[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const pick = (en: string, ar: string) => (locale === "ar" ? ar || en : en || ar) || "—";
  // Contract value = accepted offers; progress = the latest daily report
  const accepted = offers.filter((offer) => offer.status === "accepted");
  const contract = accepted.reduce((sum, offer) => sum + offerTotals(offer.lines, offer.discount).total, 0);
  const latest = reports[0] ?? null;
  return (
    <div className="grid-2">
      <div className="card stack stack--sm" style={{ gridColumn: "1 / -1" }}>
        <h3 className="card-title">{t("prj.delivery")}</h3>
        <div className="kv"><span>{t("prj.contractValue")}</span><b className="num"><bdi>{accepted.length ? formatQar(contract, locale) : "—"}</bdi></b></div>
        <div className="kv">
          <span>{t("prj.acceptedOffers")}</span>
          <span>{accepted.length ? accepted.map((offer, i) => <span key={offer.id}>{i ? ", " : ""}<Link href={`/offers/${offer.id}/contract`}><bdi>{offer.number}</bdi></Link></span>) : t("prj.noAccepted", { count: offers.length })}</span>
        </div>
        <div className="kv">
          <span>{t("prj.lastProgress")}</span>
          <span>{latest ? <Link href={`/reports/${latest.id}`}><bdi className="num">{latest.progress}%</bdi> · {formatDay(latest.date, locale)}</Link> : t("prj.noReportsYet")}</span>
        </div>
        {latest ? <div className="progress progress--accent" aria-hidden="true"><span style={{ width: `${latest.progress}%` }} /></div> : null}
      </div>
      <div className="card stack stack--sm">
        <h3 className="card-title">{t("prj.sectionClient")}</h3>
        <div className="kv"><span>{t("prj.clientName")}</span><b>{pick(project.clientEn, project.clientAr)}</b></div>
        <div className="kv"><span>{t("prj.phone")}</span><bdi dir="ltr">{project.clientPhone || "—"}</bdi></div>
        <div className="kv"><span>{t("prj.email")}</span><bdi dir="ltr">{project.clientEmail || "—"}</bdi></div>
        <div className="kv"><span>{t("prj.idNo")}</span><bdi className="num">{project.clientIdNo || "—"}</bdi></div>
        <div className="kv"><span>{t("prj.address")}</span><span>{pick(project.clientAddressEn, project.clientAddressAr)}</span></div>
      </div>
      <div className="card stack stack--sm">
        <h3 className="card-title">{t("prj.sectionProject")}</h3>
        <div className="kv"><span>{t("prj.type")}</span><span>{t(`off.${project.kind}`)}</span></div>
        <div className="kv"><span>{t("prj.location")}</span><span>{pick(project.locationEn, project.locationAr)}</span></div>
        <div className="kv"><span>{t("prj.startOn")}</span><span className="num">{project.startOn ? formatDay(project.startOn, locale) : "—"}</span></div>
        <div className="kv"><span>{t("prj.endOn")}</span><span className="num">{project.endOn ? formatDay(project.endOn, locale) : "—"}</span></div>
        <div className="kv"><span>{t("prj.sectionWebsite")}</span><span>{project.published ? t("prj.onWebsite") : t("prj.notOnWebsite")}</span></div>
      </div>
      {project.notesEn || project.notesAr ? (
        <div className="card stack stack--sm" style={{ gridColumn: "1 / -1" }}>
          <h3 className="card-title">{t("prj.notes")}</h3>
          <p style={{ whiteSpace: "pre-line" }}>{pick(project.notesEn, project.notesAr)}</p>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, canView, action, children }: { title?: string; canView: boolean; action?: React.ReactNode; children: React.ReactNode }) {
  const t = useTranslations();
  return (
    <div className="stack stack--sm">
      {title || action ? (
        <div className="between">
          {title ? <h3 className="card-title">{title}</h3> : <span />}
          {canView ? action : null}
        </div>
      ) : null}
      {canView ? children : <p className="muted">{t("prj.noModuleAccess")}</p>}
    </div>
  );
}

function Rows({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  return (
    <div className="card card--flush table-wrap">
      <table className="table table--cards">
        <thead>
          <tr>{head.map((label, i) => <th key={i} className={i === head.length - 2 && head.length > 3 ? "end" : undefined}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={head.length}>{empty}</td></tr> : null}
          {rows.map((cells, r) => (
            <tr key={r}>
              {cells.map((cell, c) => <td key={c} data-label={head[c] || ""} className={c === cells.length - 1 ? "end" : c === cells.length - 2 && cells.length > 3 ? "num end" : undefined}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDay(value: string, locale: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", numberingSystem: "latn", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
