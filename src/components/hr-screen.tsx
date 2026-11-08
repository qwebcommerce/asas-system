"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useDirectory } from "@/components/use-directory";
import { useHr } from "@/components/use-hr";
import { Kpi } from "@/components/ui/card";
import { Tabs } from "@/components/ui/data";
import { Modal, Toast } from "@/components/ui/overlay";
import { departments, initials, type Department } from "@/lib/directory";
import { FilePick, StoredPreview } from "@/components/file-pick";
import { fileProblem } from "@/lib/files";
import { Link } from "@/i18n/navigation";
import { applicantStages, attendanceStatuses, currentMonthKey, hrDocStatuses, inclusiveDays, isPast, leaveKinds, positionOf, qatarToday, type ApplicantStage, type AttendanceStatus, type Employee, type HrDocStatus, type LeaveKind } from "@/lib/hr";
import { clearHrDocumentFile, createApplicant, createEmployee, createHrDocument, createJob, createLeaveRequest, deleteApplicant, deleteEmployee, deleteHrDocument, deleteJob, deleteLeaveRequest, openStoredFile, reviewLeave, saveTodayAttendance, sendAttendanceReport, updateApplicant, updateEmployee, updateHrDocument, updateJob, updateLeaveRequest } from "@/server/hr";

export function HrScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { profile, getToken } = useAuth();
  const { users } = useDirectory();
  const { employees, leaves, jobs, applicants, documents, reports, today, ready, canManage, canViewAll } = useHr();
  const [tab, setTab] = useState("employees");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);
  const [error, setError] = useState("");
  const monthKey = currentMonthKey();
  const sent = reports.some((report) => report.monthKey === monthKey);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date());

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return employees;
    return employees.filter((person) => person.name.toLowerCase().includes(needle) || person.employeeId.toLowerCase().includes(needle));
  }, [employees, query]);

  const activePeople = employees.filter((person) => person.employment === "active");
  const present = activePeople.filter((person) => today[person.id] === "present").length;
  const annual = activePeople.filter((person) => today[person.id] === "annual").length;
  const sick = activePeople.filter((person) => today[person.id] === "sick").length;
  const late = activePeople.filter((person) => today[person.id] === "late");
  const absent = activePeople.filter((person) => today[person.id] === "absent");
  const departmentCount = new Set(employees.map((person) => person.department)).size;

  function notify(title: string, detail: string) {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function openRecord(id: string, kind: "employee" | "hr") {
    const result = await openStoredFile(await getToken(), kind, id);
    if (!result.ok) {
      setError(t(result.error));
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, title: string, detail = "") {
    const result = await action();
    if (!result.ok) {
      setError(t(result.error ?? "auth.failed"));
      return false;
    }
    setError("");
    notify(title, detail);
    return true;
  }

  return (
    <AppShell title={t("hr.title")}>
      <div className="hr">
      <div className="page-header">
        <div>
          <span className="eyebrow">{t("hr.eyebrow")}</span>
          <h2 className="page-title">{t("hr.title")}</h2>
          <p className="page-sub">{ready ? t("hr.count", { count: employees.length, departments: departmentCount }) : t("common.loading")}</p>
        </div>
        <div className="hstack page-actions">
          <button type="button" className="btn btn--secondary" onClick={() => exportEmployees(visible, locale, t)}>
            <Icon name="download" />
            {t("btn.export")}
          </button>
          {canManage ? (
            <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
              <Icon name="plus" />
              {t("hr.add")}
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid-5">
        <Kpi label={t("hr.k1")} value={String(employees.length)} note={t("hr.deptNote", { count: departmentCount })} />
        <Kpi label={t("hr.k2")} value={String(present)} note={t("hr.k2n")} noteTone="ok" />
        <Kpi label={t("hr.k3")} value={String(annual + sick)} note={t("hr.leaveSplit", { annual, sick })} />
        <Kpi label={t("hr.k4")} value={String(late.length)} note={late[0]?.name ?? t("hr.lateNone")} noteTone={late.length ? "danger" : undefined} />
        <Kpi label={t("hr.k5")} value={String(absent.length)} note={absent[0]?.name ?? t("hr.absentNone")} noteTone={absent.length ? "danger" : undefined} />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "employees", label: t("hr.t1") },
          { id: "attendance", label: t("hr.t2") },
          { id: "careers", label: t("hr.t3") },
          { id: "docs", label: t("hr.t4") },
        ]}
      />
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      {tab === "employees" ? (
        <>
          {canManage ? (
            <div className="ai">
              <Icon name="send" />
              <div className="grow">
                <b>{t("hr.reportT")} · <span className="num">{monthLabel}</span></b>
                <span>{sent ? t("hr.sentAlready") : t("hr.reportS")}</span>
              </div>
              <button type="button" className="btn btn--accent btn--sm" disabled={sent} onClick={() => void run(async () => sendAttendanceReport(await getToken()), t("hr.sentT"), t("hr.sentS"))}>
                <Icon name="send" />
                {t("hr.send")}
              </button>
            </div>
          ) : null}
          <label className="search">
            <Icon name="search" className="icon icon--sm" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("hr.search")} />
          </label>
          <EmployeeTable
            people={visible}
            locale={locale}
            canManage={canManage}
            empty={ready ? t("hr.empty") : t("common.loading")}
            onEdit={setEditing}
            onDelete={(person) => void run(async () => deleteEmployee(await getToken(), person.id), t("hr.removed"), person.name)}
          />
        </>
      ) : null}
      {tab === "attendance" ? (
        <AttendancePanel
          people={employees}
          today={today}
          leaves={leaves}
          canManage={canManage}
          locale={locale}
          onSave={(lines) => run(async () => saveTodayAttendance(await getToken(), lines), t("hr.attendanceSaved"), "")}
          onLeave={async (employeeId, kind, days, note, startsOn, endsOn) => run(async () => createLeaveRequest(await getToken(), { employeeId, kind, days, note, startsOn, endsOn }), canManage ? t("hr.leaveApproved") : t("hr.leaveSent"), "")}
          onUpdateLeave={async (id, employeeId, kind, days, note, startsOn, endsOn) => run(async () => updateLeaveRequest(await getToken(), id, { employeeId, kind, days, note, startsOn, endsOn }), t("hr.leaveUpdated"), "")}
          onDeleteLeave={(id) => void run(async () => deleteLeaveRequest(await getToken(), id), t("hr.leaveDeleted"), "")}
          ownUserId={profile?.id ?? ""}
          canRequest={canManage || !canViewAll}
          onReview={(id, decision) => void run(async () => reviewLeave(await getToken(), id, decision), t("hr.saved"), "")}
        />
      ) : null}
      {tab === "careers" ? (
        canViewAll ? (
          <CareersPanel
            jobs={jobs}
            applicants={applicants}
            canManage={canManage}
            locale={locale}
            onJob={async (titleEn, titleAr, department) => run(async () => createJob(await getToken(), { titleEn, titleAr, department }), t("hr.saved"), titleEn)}
            onUpdateJob={async (id, titleEn, titleAr, department) => run(async () => updateJob(await getToken(), id, { titleEn, titleAr, department }), t("hr.saved"), titleEn)}
            onDeleteJob={(id) => void run(async () => deleteJob(await getToken(), id), t("hr.jobRemoved"), "")}
            onApplicant={async (jobId, name, score, note, stage) => run(async () => createApplicant(await getToken(), { jobId, name, score, note, stage }), t("hr.saved"), name)}
            onUpdateApplicant={async (id, jobId, name, score, note, stage) => run(async () => updateApplicant(await getToken(), id, { jobId, name, score, note, stage }), t("hr.saved"), name)}
            onDeleteApplicant={(id) => void run(async () => deleteApplicant(await getToken(), id), t("hr.applicantRemoved"), "")}
          />
        ) : <p className="muted">{t("hr.forbidden")}</p>
      ) : null}
      {tab === "docs" ? (
        canViewAll ? (
          <DocumentsPanel
            documents={documents}
            canManage={canManage}
            locale={locale}
            onCreate={async (titleEn, titleAr, status, expiresAt) => {
              const result = await createHrDocument(await getToken(), { titleEn, titleAr, status, expiresAt });
              if (!result.ok || !result.id) {
                setError(t(result.ok ? "auth.failed" : result.error ?? "auth.failed"));
                return "";
              }
              notify(t("hr.saved"), titleEn);
              return result.id;
            }}
            onUpdate={async (id, titleEn, titleAr, status, expiresAt) => run(async () => updateHrDocument(await getToken(), id, { titleEn, titleAr, status, expiresAt }), t("hr.saved"), titleEn)}
            onDelete={(id) => void run(async () => deleteHrDocument(await getToken(), id), t("hr.docRemoved"), "")}
            onClearFile={(id) => run(async () => clearHrDocumentFile(await getToken(), id), t("hr.fileRemoved"), "")}
            onOpenFile={(id) => void openRecord(id, "hr")}
            getToken={getToken}
          />
        ) : <p className="muted">{t("hr.forbidden")}</p>
      ) : null}
      <EditEmployee
        person={editing}
        users={profile?.role === "superAdmin" ? users : []}
        onClose={() => setEditing(null)}
        onSave={async (input) => {
          const result = await updateEmployee(await getToken(), input);
          if (!result.ok) return result.error ?? "auth.failed";
          setEditing(null);
          notify(t("hr.saved"), input.name);
          return "";
        }}
      />
      <AddEmployee
        open={adding}
        users={profile?.role === "superAdmin" ? users : []}
        onClose={() => setAdding(false)}
        onCreate={async (input) => {
          const result = await createEmployee(await getToken(), input);
          if (!result.ok) return result.error ?? "auth.failed";
          setAdding(false);
          notify(t("hr.added"), t("hr.addedS"));
          return "";
        }}
      />
      <Toast open={Boolean(toast)} title={toast?.title ?? ""} detail={toast?.detail ?? ""} />
      </div>
    </AppShell>
  );
}

function EmployeeTable({
  people,
  locale,
  canManage,
  empty,
  onEdit,
  onDelete,
}: {
  people: Employee[];
  locale: string;
  canManage: boolean;
  empty: string;
  onEdit: (person: Employee) => void;
  onDelete: (person: Employee) => void;
}) {
  const t = useTranslations();
  return (
    <div className="card card--flush table-wrap">
      <table className="table table--cards">
        <thead>
          <tr>
            <th>{t("col.employee")}</th>
            <th>{t("col.position")}</th>
            <th>{t("col.dept")}</th>
            <th>{t("col.mobile")}</th>
            <th>{t("col.status")}</th>
            <th>{t("col.joined")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {people.length === 0 ? (
            <tr><td colSpan={7}>{empty}</td></tr>
          ) : null}
          {people.map((person) => (
            <tr key={person.id}>
              <td data-label={t("col.employee")}>
                <span className="person">
                  <span className="avatar">{initials(person.name)}</span>
                  <div>
                    <b>{person.name}</b>
                    <small className="num"><bdi>{person.employeeId}</bdi></small>
                  </div>
                </span>
              </td>
              <td data-label={t("col.position")}>{positionOf(person, locale)}</td>
              <td data-label={t("col.dept")} className="muted">{t(`dir.${person.department}`)}</td>
              <td data-label={t("col.mobile")} className="num muted"><bdi>{person.mobile || t("time.none")}</bdi></td>
              <td data-label={t("col.status")}>
                <span className={`badge badge--${person.employment === "active" ? "ok" : "neutral"}`}>{person.employment === "active" ? t("st.active") : t("hr.inactive")}</span>
              </td>
              <td data-label={t("col.joined")} className="muted">{formatMonth(person.joined, locale, t("time.none"))}</td>
              <td className="end" data-label="">
                <div className="hstack">
                  <Link href={`/hr/${person.id}`} className="btn btn--secondary btn--sm">{t("hr.view")}</Link>
                  {canManage ? (
                    <>
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => onEdit(person)}>{t("us.edit")}</button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDelete(person)}>{t("us.delete")}</button>
                    </>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttendancePanel({
  people,
  today,
  leaves,
  canManage,
  canRequest,
  locale,
  onSave,
  onLeave,
  onUpdateLeave,
  onDeleteLeave,
  onReview,
  ownUserId,
}: {
  people: Employee[];
  today: Record<string, AttendanceStatus>;
  leaves: import("@/lib/hr").LeaveRequest[];
  canManage: boolean;
  canRequest: boolean;
  locale: string;
  onSave: (lines: { employeeId: string; status: AttendanceStatus }[]) => Promise<boolean>;
  onLeave: (employeeId: string, kind: LeaveKind, days: number, note: string, startsOn: string, endsOn: string) => Promise<boolean>;
  onUpdateLeave: (id: string, employeeId: string, kind: LeaveKind, days: number, note: string, startsOn: string, endsOn: string) => Promise<boolean>;
  onDeleteLeave: (id: string) => void;
  onReview: (id: string, decision: "approved" | "declined") => void;
  ownUserId: string;
}) {
  const t = useTranslations();
  const active = people.filter((person) => person.employment === "active");
  const [employeeId, setEmployeeId] = useState(active[0]?.id ?? "");
  const [kind, setKind] = useState<LeaveKind>("annual");
  const [days, setDays] = useState("1");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState<Record<string, AttendanceStatus> | null>(null);
  const [saving, setSaving] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<import("@/lib/hr").LeaveRequest | null>(null);
  const orderedLeaves = [...leaves].sort((a, b) => Number(a.status !== "pending") - Number(b.status !== "pending") || a.name.localeCompare(b.name));
  const todayKey = qatarToday();
  const dateLabel = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${todayKey}T12:00:00+03:00`));
  const chosen = (id: string) => draft?.[id] ?? today[id] ?? "present";
  const dirty = active.some((person) => chosen(person.id) !== today[person.id]);

  const savedKey = active.map((person) => `${person.id}:${today[person.id] ?? ""}`).join("|");

  useEffect(() => {
    if (!draft) return;
    const matches = savedKey.split("|").every((pair) => {
      if (!pair) return true;
      const splitAt = pair.indexOf(":");
      const id = pair.slice(0, splitAt);
      const status = pair.slice(splitAt + 1);
      return draft[id] === (status === "" ? undefined : status);
    });
    if (matches) setDraft(null);
  }, [draft, savedKey]);

  function change(id: string, status: AttendanceStatus) {
    setDraft((previous) => {
      const next = { ...(previous ?? Object.fromEntries(active.map((person) => [person.id, today[person.id] ?? "present"]))) };
      next[id] = status;
      return next;
    });
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    await onSave(active.map((person) => ({ employeeId: person.id, status: chosen(person.id) })));
    setSaving(false);
  }

  return (
    <div className="stack">
      <div className="between">
        <div>
          <span className="eyebrow">{t("col.today")}</span>
          <h3 className="card-title">{dateLabel}</h3>
        </div>
        {canManage ? (
          <button type="button" className="btn btn--primary" disabled={!dirty || saving} onClick={() => void save()}>{t("set.save")}</button>
        ) : null}
      </div>
      <div className="card card--flush table-wrap">
        <table className="table table--cards">
          <thead>
            <tr>
              <th>{t("col.employee")}</th>
              <th>{t("col.position")}</th>
              <th>{t("col.dept")}</th>
              <th>{t("col.today")}</th>
            </tr>
          </thead>
          <tbody>
            {active.length === 0 ? (
              <tr><td colSpan={4}>{t("hr.empty")}</td></tr>
            ) : null}
            {active.map((person) => (
              <tr key={person.id}>
                <td data-label={t("col.employee")}>
                  <span className="person">
                    <span className="avatar">{initials(person.name)}</span>
                    <div>
                      <b>{person.name}</b>
                      <small className="num"><bdi>{person.employeeId}</bdi></small>
                    </div>
                  </span>
                </td>
                <td data-label={t("col.position")}>{positionOf(person, locale)}</td>
                <td data-label={t("col.dept")} className="muted">{t(`dir.${person.department}`)}</td>
                <td data-label={t("col.today")}>
                  {canManage ? (
                    <select className="select select--sm" aria-label={t("col.today")} value={chosen(person.id)} disabled={saving} onChange={(event) => change(person.id, event.target.value as AttendanceStatus)}>
                      {attendanceStatuses.map((status) => <option key={status} value={status}>{t(statusKey(status))}</option>)}
                    </select>
                  ) : (
                    <span className={`badge badge--${attendanceTone(chosen(person.id))}`}>{today[person.id] ? t(statusKey(today[person.id])) : t("time.none")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card card--flush table-wrap">
        <div className="between" style={{ padding: "16px 16px 0" }}>
          <h3 className="card-title">{t("hr.leaveTitle")}</h3>
          {canRequest && people.length > 0 ? (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                setEditingLeave(null);
                setEmployeeId(active[0]?.id ?? people[0].id);
                setKind("annual");
                setDays("1");
                setStartsOn(todayKey);
                setEndsOn(todayKey);
                setNote("");
                setFormError("");
                setLeaveOpen(true);
              }}
            >
              <Icon name="plus" />
              {t("hr.leaveSend")}
            </button>
          ) : null}
        </div>
        <table className="table table--cards">
          <thead>
            <tr>
              <th>{t("col.employee")}</th>
              <th>{t("col.type")}</th>
              <th>{t("hr.leaveDays")}</th>
              <th>{t("hr.leaveNote")}</th>
              <th>{t("col.status")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orderedLeaves.length === 0 ? (
              <tr><td colSpan={6}>{t("hr.leaveEmpty")}</td></tr>
            ) : null}
            {orderedLeaves.map((item) => {
              const canChange = canManage || (canRequest && item.status === "pending" && item.userId === ownUserId);
              return (
                <tr key={item.id}>
                  <td data-label={t("col.employee")} className="strong">{item.name}</td>
                  <td data-label={t("col.type")}>{t(`st.${item.kind}`)}</td>
                  <td data-label={t("hr.leaveDays")}>
                    <span className="num">{item.days}</span>
                    {item.kind === "sick" && item.startsOn && item.endsOn ? (
                      <small className="muted num" style={{ display: "block" }}>
                        <bdi>{formatDay(item.startsOn, locale)}</bdi>
                        {" – "}
                        <bdi>{formatDay(item.endsOn, locale)}</bdi>
                      </small>
                    ) : null}
                  </td>
                  <td data-label={t("hr.leaveNote")} className="muted">{item.note || t("time.none")}</td>
                  <td data-label={t("col.status")}>
                    <span className={`badge badge--${item.status === "approved" ? "ok" : item.status === "declined" ? "danger" : "warn"}`}>{t(`hr.leave${item.status === "approved" ? "Approved" : item.status === "declined" ? "Declined" : "Pending"}`)}</span>
                  </td>
                  <td className="end" data-label="">
                    <div className="hstack">
                      {canChange ? (
                        <>
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => {
                              setEditingLeave(item);
                              setEmployeeId(item.employeeId);
                              setKind(item.kind);
                              setDays(String(item.days));
                              setStartsOn(item.startsOn || todayKey);
                              setEndsOn(item.endsOn || todayKey);
                              setNote(item.note);
                              setFormError("");
                              setLeaveOpen(true);
                            }}
                          >
                            {t("us.edit")}
                          </button>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDeleteLeave(item.id)}>{t("us.delete")}</button>
                        </>
                      ) : null}
                      {canManage && item.status === "pending" ? (
                        <>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onReview(item.id, "declined")}>{t("btn.decline")}</button>
                          <button type="button" className="btn btn--primary btn--sm" onClick={() => onReview(item.id, "approved")}>{t("btn.approve")}</button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Modal
        open={leaveOpen}
        title={editingLeave ? t("us.edit") : t("hr.leaveSend")}
        onClose={() => {
          setLeaveOpen(false);
          setEditingLeave(null);
        }}
      >
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            const sick = kind === "sick";
            const count = sick ? inclusiveDays(startsOn, endsOn) : Number(days);
            if (sick ? count < 1 || count > 60 : !Number.isInteger(count) || count < 1 || count > 60) {
              setFormError(sick ? "hr.leaveDates" : "us.invalid");
              return;
            }
            const chosenId = employeeId || people[0]?.id || "";
            const action = editingLeave
              ? onUpdateLeave(editingLeave.id, chosenId, kind, count, note, sick ? startsOn : "", sick ? endsOn : "")
              : onLeave(chosenId, kind, count, note, sick ? startsOn : "", sick ? endsOn : "");
            void action.then((ok) => {
              if (!ok) return;
              setLeaveOpen(false);
              setEditingLeave(null);
              setNote("");
              setFormError("");
            });
          }}
        >
          <div className="field">
            <label>{t("col.employee")}</label>
            <select className="select" value={employeeId || people[0]?.id || ""} onChange={(event) => setEmployeeId(event.target.value)}>
              {people.filter((person) => person.employment === "active" || person.id === editingLeave?.employeeId).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{t("col.type")}</label>
            <select className="select" value={kind} onChange={(event) => {
              const next = event.target.value as LeaveKind;
              setKind(next);
              setFormError("");
              if (next === "sick") {
                setStartsOn((value) => value || todayKey);
                setEndsOn((value) => value || todayKey);
              }
            }}>
              {leaveKinds.map((item) => <option key={item} value={item}>{t(`st.${item}`)}</option>)}
            </select>
          </div>
          {kind === "sick" ? (
            <>
              <div className="form-grid form-grid--2">
                <Field label={t("hr.leaveStart")} value={startsOn} onChange={setStartsOn} type="date" />
                <Field label={t("hr.leaveEnd")} value={endsOn} onChange={setEndsOn} type="date" />
              </div>
              {inclusiveDays(startsOn, endsOn) > 0 ? <p className="muted num">{t("hr.leaveSpan", { count: inclusiveDays(startsOn, endsOn) })}</p> : null}
            </>
          ) : (
            <Field label={t("hr.leaveDays")} value={days} onChange={setDays} type="number" />
          )}
          <Field label={t("hr.leaveNote")} value={note} onChange={setNote} />
          {formError ? <p style={{ color: "var(--danger)" }}>{t(formError)}</p> : null}
          <div className="hstack" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={() => { setLeaveOpen(false); setEditingLeave(null); }}>{t("btn.cancel")}</button>
            <button type="submit" className="btn btn--primary">{editingLeave ? t("set.save") : t("hr.leaveSend")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function CareersPanel({
  jobs,
  applicants,
  canManage,
  locale,
  onJob,
  onUpdateJob,
  onDeleteJob,
  onApplicant,
  onUpdateApplicant,
  onDeleteApplicant,
}: {
  jobs: import("@/lib/hr").JobPost[];
  applicants: import("@/lib/hr").Applicant[];
  canManage: boolean;
  locale: string;
  onJob: (titleEn: string, titleAr: string, department: Department) => Promise<boolean>;
  onUpdateJob: (id: string, titleEn: string, titleAr: string, department: Department) => Promise<boolean>;
  onDeleteJob: (id: string) => void;
  onApplicant: (jobId: string, name: string, score: number | null, note: string, stage: ApplicantStage) => Promise<boolean>;
  onUpdateApplicant: (id: string, jobId: string, name: string, score: number | null, note: string, stage: ApplicantStage) => Promise<boolean>;
  onDeleteApplicant: (id: string) => void;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [department, setDepartment] = useState<Department>("site");
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [editingApplicant, setEditingApplicant] = useState("");
  const [jobId, setJobId] = useState("");
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<ApplicantStage>("new");

  function close() {
    setOpen(false);
    setEditingId("");
  }

  function closeSuggestion() {
    setSuggestionOpen(false);
    setEditingApplicant("");
  }

  return (
    <div className="stack">
      <div className="between">
        <h3 className="card-title">{t("hr.t3")}</h3>
        {canManage ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              setEditingId("");
              setTitleEn("");
              setTitleAr("");
              setDepartment("site");
              setOpen(true);
            }}
          >
            <Icon name="plus" />
            {t("hr.jobAdd")}
          </button>
        ) : null}
      </div>
      <p className="muted">{t("hr.scoreHint")}</p>
      {jobs.length === 0 ? <div className="card"><p className="muted">{t("hr.jobEmpty")}</p></div> : null}
      {jobs.map((job) => {
        const people = applicants.filter((person) => person.jobId === job.id);
        const title = jobTitle(job, locale);
        const otherTitle = locale === "ar" ? job.titleEn : job.titleAr;
        return (
          <div className="card card--flush" key={job.id}>
            <div className="between" style={{ padding: "16px" }}>
              <div>
                <b>{title}</b>
                <small className="muted" style={{ display: "block" }}>{otherTitle ? `${otherTitle} · ` : ""}{t(`dir.${job.department}`)}</small>
              </div>
              {canManage ? (
                <div className="hstack">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      setEditingApplicant("");
                      setJobId(job.id);
                      setName("");
                      setScore("");
                      setNote("");
                      setStage("new");
                      setSuggestionOpen(true);
                    }}
                  >
                    <Icon name="plus" />
                    {t("hr.applicantAdd")}
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      setEditingId(job.id);
                      setTitleEn(job.titleEn);
                      setTitleAr(job.titleAr);
                      setDepartment(job.department);
                      setOpen(true);
                    }}
                  >
                    {t("us.edit")}
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDeleteJob(job.id)}>{t("us.delete")}</button>
                </div>
              ) : null}
            </div>
            {people.length === 0 ? <p className="muted" style={{ padding: "0 16px 16px" }}>{t("hr.applicantEmpty")}</p> : (
              <div className="table-wrap">
              <table className="table table--cards">
                <thead>
                  <tr>
                    <th>{t("hr.applicant")}</th>
                    <th>{t("hr.score")}</th>
                    <th>{t("hr.leaveNote")}</th>
                    <th>{t("col.status")}</th>
                    {canManage ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {people.map((person) => (
                    <tr key={person.id}>
                      <td data-label={t("hr.applicant")} className="strong">{person.name}</td>
                      <td data-label={t("hr.score")} className="num">{person.score === null ? t("time.none") : person.score}</td>
                      <td data-label={t("hr.leaveNote")} className="muted">{person.note || t("time.none")}</td>
                      <td data-label={t("col.status")}>{t(stageKey(person.stage))}</td>
                      {canManage ? (
                        <td className="end" data-label="">
                          <div className="hstack">
                            <button
                              type="button"
                              className="btn btn--secondary btn--sm"
                              onClick={() => {
                                setEditingApplicant(person.id);
                                setJobId(person.jobId);
                                setName(person.name);
                                setScore(person.score === null ? "" : String(person.score));
                                setNote(person.note);
                                setStage(person.stage);
                                setSuggestionOpen(true);
                              }}
                            >
                              {t("us.edit")}
                            </button>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDeleteApplicant(person.id)}>{t("us.delete")}</button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        );
      })}
      <Modal open={open} title={editingId ? t("us.edit") : t("hr.jobAdd")} onClose={close}>
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            const action = editingId ? onUpdateJob(editingId, titleEn, titleAr, department) : onJob(titleEn, titleAr, department);
            void action.then((ok) => {
              if (ok) close();
            });
          }}
        >
          <Field label={t("hr.jobTitle")} value={titleEn} onChange={setTitleEn} />
          <Field label={t("hr.jobTitleAr")} value={titleAr} onChange={setTitleAr} />
          <DepartmentField value={department} onChange={setDepartment} />
          <div className="hstack" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={close}>{t("btn.cancel")}</button>
            <button type="submit" className="btn btn--primary">{editingId ? t("set.save") : t("hr.jobAdd")}</button>
          </div>
        </form>
      </Modal>
      <Modal open={suggestionOpen} title={editingApplicant ? t("us.edit") : t("hr.applicantAdd")} onClose={closeSuggestion}>
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = score.trim() === "" ? null : Number(score);
            const chosenJob = jobId || jobs[0]?.id || "";
            const action = editingApplicant
              ? onUpdateApplicant(editingApplicant, chosenJob, name, parsed, note, stage)
              : onApplicant(chosenJob, name, parsed, note, stage);
            void action.then((ok) => {
              if (ok) closeSuggestion();
            });
          }}
        >
          <div className="field">
            <label>{t("hr.jobTitle")}</label>
            <input className="input" value={jobTitle(jobs.find((job) => job.id === jobId), locale)} readOnly />
          </div>
          <Field label={t("hr.applicant")} value={name} onChange={setName} />
          <Field label={t("hr.score")} value={score} onChange={setScore} type="number" />
          <Field label={t("hr.leaveNote")} value={note} onChange={setNote} />
          <div className="field">
            <label>{t("col.status")}</label>
            <select className="select" value={stage} onChange={(event) => setStage(event.target.value as ApplicantStage)}>
              {applicantStages.map((item) => <option key={item} value={item}>{t(stageKey(item))}</option>)}
            </select>
          </div>
          <div className="hstack" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={closeSuggestion}>{t("btn.cancel")}</button>
            <button type="submit" className="btn btn--primary">{editingApplicant ? t("set.save") : t("hr.applicantAdd")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function DocumentsPanel({
  documents,
  canManage,
  locale,
  onCreate,
  onUpdate,
  onDelete,
  onClearFile,
  onOpenFile,
  getToken,
}: {
  documents: import("@/lib/hr").HrDocument[];
  canManage: boolean;
  locale: string;
  onCreate: (titleEn: string, titleAr: string, status: HrDocStatus, expiresAt: string) => Promise<string>;
  onUpdate: (id: string, titleEn: string, titleAr: string, status: HrDocStatus, expiresAt: string) => Promise<boolean>;
  onDelete: (id: string) => void;
  onClearFile: (id: string) => Promise<boolean>;
  onOpenFile: (id: string) => void;
  getToken: () => Promise<string>;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [status, setStatus] = useState<HrDocStatus>("draft");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dropFile, setDropFile] = useState(false);
  const [error, setError] = useState("");
  const editing = documents.find((item) => item.id === editingId) ?? null;

  function close() {
    setOpen(false);
    setEditingId("");
    setFile(null);
    setDropFile(false);
    setError("");
  }

  return (
    <div className="stack">
      <div className="between">
        <h3 className="card-title">{t("hr.t4")}</h3>
        {canManage ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              setEditingId("");
              setTitleEn("");
              setTitleAr("");
              setStatus("draft");
              setExpiresAt("");
              setFile(null);
              setDropFile(false);
              setError("");
              setOpen(true);
            }}
          >
            <Icon name="plus" />
            {t("hr.docAdd")}
          </button>
        ) : null}
      </div>
      <div className="card card--flush table-wrap">
        <table className="table table--cards">
          <thead>
            <tr>
              <th>{t("hr.docTitle")}</th>
              <th>{t("hr.docTitleAr")}</th>
              <th>{t("col.status")}</th>
              <th>{t("hr.expires")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? <tr><td colSpan={5}>{t("hr.docEmpty")}</td></tr> : null}
            {documents.map((document) => {
              const expired = document.status === "expired" || isPast(document.expiresAt);
              return (
                <tr key={document.id}>
                  <td data-label={t("hr.docTitle")}>
                    <div className="strong">{document.titleEn}</div>
                    {document.hasFile ? (
                      <StoredPreview
                        title={locale === "ar" ? document.titleAr || document.titleEn : document.titleEn}
                        contentType={document.contentType}
                        previewKey={document.id}
                        loadImage={async () => {
                          const result = await openStoredFile(await getToken(), "hr", document.id);
                          return result.ok ? result.url : "";
                        }}
                        onOpen={() => onOpenFile(document.id)}
                        onRemove={canManage ? () => void onClearFile(document.id) : undefined}
                      />
                    ) : null}
                  </td>
                  <td data-label={t("hr.docTitleAr")}>{document.titleAr}</td>
                  <td data-label={t("col.status")}>{expired ? t("ds.expired") : t(`ds.${document.status}`)}</td>
                  <td data-label={t("hr.expires")} className="num muted">{document.expiresAt || t("time.none")}</td>
                  <td className="end" data-label="">
                    <div className="hstack">
                      {canManage ? (
                        <>
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => {
                              setEditingId(document.id);
                              setTitleEn(document.titleEn);
                              setTitleAr(document.titleAr);
                              setStatus(document.status);
                              setExpiresAt(document.expiresAt);
                              setFile(null);
                              setDropFile(false);
                              setError("");
                              setOpen(true);
                            }}
                          >
                            {t("us.edit")}
                          </button>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDelete(document.id)}>{t("us.delete")}</button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Modal open={open} title={editingId ? t("us.edit") : t("hr.docAdd")} onClose={close}>
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (file) {
              const problem = fileProblem(file.type, file.size, file.name);
              if (problem) {
                setError(t(problem));
                return;
              }
            }
            void (async () => {
              const id = editingId || await onCreate(titleEn, titleAr, status, expiresAt);
              if (!id) return;
              if (editingId) {
                const ok = await onUpdate(editingId, titleEn, titleAr, status, expiresAt);
                if (!ok) return;
              }
              if (dropFile && !file) {
                const cleared = await onClearFile(id);
                if (!cleared) return;
              }
              if (file) {
                const body = new FormData();
                body.set("token", await getToken());
                body.set("purpose", "hr");
                body.set("documentId", id);
                body.set("file", file);
                const response = await fetch("/api/hr/files", { method: "POST", body });
                const result = (await response.json()) as { ok: boolean; error?: string };
                if (!result.ok) {
                  setError(t(result.error ?? "auth.failed"));
                  return;
                }
              }
              close();
            })();
          }}
        >
          <Field label={t("hr.docTitle")} value={titleEn} onChange={setTitleEn} />
          <Field label={t("hr.docTitleAr")} value={titleAr} onChange={setTitleAr} />
          <div className="field">
            <label>{t("col.status")}</label>
            <select className="select" value={status} onChange={(event) => setStatus(event.target.value as HrDocStatus)}>
              {hrDocStatuses.map((item) => <option key={item} value={item}>{t(`ds.${item}`)}</option>)}
            </select>
          </div>
          <Field label={t("hr.expires")} value={expiresAt} onChange={setExpiresAt} type="date" />
          {editing && editing.hasFile && !file && !dropFile ? (
            <StoredPreview
              title={locale === "ar" ? editing.titleAr || editing.titleEn : editing.titleEn}
              contentType={editing.contentType}
              previewKey={editing.id}
              loadImage={async () => {
                const result = await openStoredFile(await getToken(), "hr", editing.id);
                return result.ok ? result.url : "";
              }}
              onOpen={() => onOpenFile(editing.id)}
              onRemove={() => setDropFile(true)}
            />
          ) : null}
          <FilePick
            label={t("hr.file")}
            hint={editingId && !dropFile ? `${t("hr.fileHint")} · ${t("hr.fileKeep")}` : t("hr.fileHint")}
            title={locale === "ar" ? titleAr || titleEn : titleEn || titleAr}
            file={file}
            resetKey={`${open}:${editingId}:${dropFile}`}
            onChange={(next) => {
              setFile(next);
              if (next) setDropFile(false);
            }}
          />
          {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
          <div className="hstack" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={close}>{t("btn.cancel")}</button>
            <button type="submit" className="btn btn--primary">{editingId ? t("set.save") : t("hr.docAdd")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


function EditEmployee({
  person,
  users,
  onClose,
  onSave,
}: {
  person: Employee | null;
  users: { id: string; name: string; employeeId: string }[];
  onClose: () => void;
  onSave: (input: {
    id: string;
    name: string;
    employeeId: string;
    positionEn: string;
    positionAr: string;
    department: Department;
    mobile: string;
    joined: string;
    userId: string;
    idExpiry: string;
    passportExpiry: string;
    visaExpiry: string;
    basic: number | null;
    employment: "active" | "inactive";
  }) => Promise<string>;
}) {
  const t = useTranslations();
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [positionEn, setPositionEn] = useState("");
  const [positionAr, setPositionAr] = useState("");
  const [department, setDepartment] = useState<Department>("site");
  const [mobile, setMobile] = useState("");
  const [joined, setJoined] = useState("");
  const [userId, setUserId] = useState("");
  const [idExpiry, setIdExpiry] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [visaExpiry, setVisaExpiry] = useState("");
  const [basic, setBasic] = useState("");
  const [employment, setEmployment] = useState<"active" | "inactive">("active");

  useEffect(() => {
    if (!person) return;
    setName(person.name);
    setEmployeeId(person.employeeId);
    setPositionEn(person.positionEn);
    setPositionAr(person.positionAr);
    setDepartment(person.department);
    setMobile(person.mobile);
    setJoined(person.joined);
    setUserId(person.userId);
    setIdExpiry(person.idExpiry);
    setPassportExpiry(person.passportExpiry);
    setVisaExpiry(person.visaExpiry);
    setBasic(person.basic === null ? "" : String(person.basic));
    setEmployment(person.employment);
    setError("");
  }, [person]);

  function close() {
    setError("");
    setName("");
    setEmployeeId("");
    onClose();
  }

  return (
    <Modal open={person !== null} title={t("us.edit")} onClose={close}>
      {person ? (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave({
              id: person.id,
              name,
              employeeId,
              positionEn,
              positionAr,
              department,
              mobile,
              joined,
              userId,
              idExpiry,
              passportExpiry,
              visaExpiry,
              basic: basic.trim() === "" ? null : Number(basic),
              employment,
            }).then((message) => setError(message ? t(message) : ""));
          }}
        >
          <Field label={t("reg.name")} value={name} onChange={setName} />
          <Field label={t("reg.empId")} value={employeeId} onChange={setEmployeeId} />
          <Field label={t("hr.position")} value={positionEn} onChange={setPositionEn} />
          <Field label={t("hr.positionAr")} value={positionAr} onChange={setPositionAr} />
          <DepartmentField value={department} onChange={setDepartment} />
          <div className="field">
            <label>{t("col.status")}</label>
            <select className="select" value={employment} onChange={(event) => setEmployment(event.target.value as "active" | "inactive")}>
              <option value="active">{t("st.active")}</option>
              <option value="inactive">{t("hr.inactive")}</option>
            </select>
          </div>
          <Field label={t("reg.mobile")} value={mobile} onChange={setMobile} />
          <Field label={t("hr.joinDate")} value={joined} onChange={setJoined} type="date" />
          <Field label={t("hr.idExpiry")} value={idExpiry} onChange={setIdExpiry} type="date" />
          <Field label={t("hr.passportExpiry")} value={passportExpiry} onChange={setPassportExpiry} type="date" />
          <Field label={t("hr.visaExpiry")} value={visaExpiry} onChange={setVisaExpiry} type="date" />
          <Field label={t("hr.basic")} value={basic} onChange={setBasic} type="number" />
          {users.length > 0 ? (
            <div className="field">
              <label>{t("hr.linkUser")}</label>
              <select className="select" value={userId} onChange={(event) => setUserId(event.target.value)}>
                <option value="">{t("hr.noUser")}</option>
                {users.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.employeeId}</option>)}
              </select>
            </div>
          ) : null}
          {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
          <div className="hstack" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={close}>{t("btn.cancel")}</button>
            <button type="submit" className="btn btn--primary">{t("set.save")}</button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}

function AddEmployee({
  open,
  users,
  onClose,
  onCreate,
}: {
  open: boolean;
  users: { id: string; name: string; employeeId: string }[];
  onClose: () => void;
  onCreate: (input: { name: string; employeeId: string; positionEn: string; positionAr: string; department: Department; mobile: string; joined: string; userId: string }) => Promise<string>;
}) {
  const t = useTranslations();
  const [error, setError] = useState("");
  const [department, setDepartment] = useState<Department>("site");
  const [userId, setUserId] = useState("");

  return (
    <Modal open={open} title={t("hr.add")} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void onCreate({
            name: String(data.get("name") ?? ""),
            employeeId: String(data.get("employeeId") ?? ""),
            positionEn: String(data.get("positionEn") ?? ""),
            positionAr: String(data.get("positionAr") ?? ""),
            department,
            mobile: String(data.get("mobile") ?? ""),
            joined: String(data.get("joined") ?? ""),
            userId,
          }).then((message) => setError(message ? t(message) : ""));
        }}
      >
        <Field name="name" label={t("reg.name")} />
        <Field name="employeeId" label={t("reg.empId")} />
        <Field name="positionEn" label={t("hr.position")} />
        <Field name="positionAr" label={t("hr.positionAr")} />
        <DepartmentField value={department} onChange={setDepartment} />
        <Field name="mobile" label={t("reg.mobile")} />
        <Field name="joined" label={t("hr.joinDate")} type="date" />
        {users.length > 0 ? (
          <div className="field">
            <label>{t("hr.linkUser")}</label>
            <select className="select" value={userId} onChange={(event) => setUserId(event.target.value)}>
              <option value="">{t("hr.noUser")}</option>
              {users.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.employeeId}</option>)}
            </select>
          </div>
        ) : null}
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        <div className="hstack" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>{t("btn.cancel")}</button>
          <button type="submit" className="btn btn--primary">{t("hr.add")}</button>
        </div>
      </form>
    </Modal>
  );
}

function DepartmentField({ value, onChange }: { value: Department; onChange: (value: Department) => void }) {
  const t = useTranslations();
  return (
    <div className="field">
      <label>{t("col.dept")}</label>
      <select className="select" value={value} onChange={(event) => onChange(event.target.value as Department)}>
        {departments.map((item) => <option key={item} value={item}>{t(`dir.${item}`)}</option>)}
      </select>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  name,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input" name={name} type={type} value={onChange ? value : undefined} defaultValue={onChange ? undefined : value} readOnly={readOnly} required={Boolean(name) && name !== "positionAr" && name !== "mobile" && name !== "joined"} onChange={onChange ? (event) => onChange(event.target.value) : undefined} />
    </div>
  );
}

function statusKey(status: AttendanceStatus) {
  if (status === "present") return "hr.statusPresent";
  if (status === "late") return "hr.statusLate";
  if (status === "absent") return "hr.statusAbsent";
  if (status === "annual") return "hr.statusAnnual";
  return "hr.statusSick";
}

function attendanceTone(status: AttendanceStatus) {
  if (status === "present") return "ok";
  if (status === "late" || status === "absent") return "danger";
  return "warn";
}

function jobTitle(job: { titleEn: string; titleAr: string } | undefined, locale: string) {
  if (!job) return "";
  return locale === "ar" ? job.titleAr || job.titleEn : job.titleEn;
}

function stageKey(stage: ApplicantStage) {
  if (stage === "new") return "hr.stageNew";
  if (stage === "review") return "hr.stageReview";
  if (stage === "offer") return "hr.stageOffer";
  return "hr.stageHired";
}

function formatDay(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${value}T12:00:00+03:00`));
}

function formatMonth(value: string, locale: string, empty: string) {
  if (!value) return empty;
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${value}T00:00:00+03:00`));
}

function exportEmployees(people: Employee[], locale: string, t: (key: string) => string) {
  const header = [t("col.employee"), t("reg.empId"), t("col.position"), t("col.dept"), t("col.mobile"), t("col.status"), t("col.joined")];
  const lines = people.map((person) => [person.name, person.employeeId, positionOf(person, locale), t(`dir.${person.department}`), person.mobile, person.employment === "active" ? t("st.active") : t("hr.inactive"), person.joined]);
  const csv = [header, ...lines].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "asas-employees.csv";
  link.click();
  URL.revokeObjectURL(url);
}
