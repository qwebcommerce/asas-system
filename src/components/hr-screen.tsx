"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useDirectory } from "@/components/use-directory";
import { useHr } from "@/components/use-hr";
import { Kpi } from "@/components/ui/card";
import { Tabs } from "@/components/ui/data";
import { Drawer, Modal, Toast } from "@/components/ui/overlay";
import { departments, initials, type Department } from "@/lib/directory";
import { applicantStages, attendanceStatuses, currentMonthKey, hrDocStatuses, isPast, leaveKinds, positionOf, type ApplicantStage, type AttendanceStatus, type Employee, type HrDocStatus, type LeaveKind } from "@/lib/hr";
import { createApplicant, createEmployee, createHrDocument, createJob, createLeaveRequest, reviewLeave, sendAttendanceReport, setApplicantStage, updateEmployee } from "@/server/hr";

export function HrScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { profile, getToken } = useAuth();
  const { users } = useDirectory();
  const { employees, leaves, jobs, applicants, documents, reports, ready, canManage, canViewAll } = useHr();
  const [tab, setTab] = useState("employees");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
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

  const present = employees.filter((person) => person.status === "present").length;
  const annual = employees.filter((person) => person.status === "annual").length;
  const sick = employees.filter((person) => person.status === "sick").length;
  const late = employees.filter((person) => person.status === "late");
  const departmentCount = new Set(employees.map((person) => person.department)).size;

  function notify(title: string, detail: string) {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), 3000);
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
      <div className="page-header">
        <div>
          <span className="eyebrow">{t("hr.eyebrow")}</span>
          <h2 className="page-title">{t("hr.title")}</h2>
          <p className="page-sub">{ready ? t("hr.count", { count: employees.length, departments: departmentCount }) : t("common.loading")}</p>
        </div>
        <div className="hstack">
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
          <div className="grid-4">
            <Kpi label={t("hr.k1")} value={String(employees.length)} note={t("hr.deptNote", { count: departmentCount })} />
            <Kpi label={t("hr.k2")} value={String(present)} note={t("hr.k2n")} noteTone="ok" />
            <Kpi label={t("hr.k3")} value={String(annual + sick)} note={t("hr.leaveSplit", { annual, sick })} />
            <Kpi label={t("hr.k4")} value={String(late.length)} note={late[0]?.name ?? t("hr.lateNone")} noteTone={late.length ? "danger" : undefined} />
          </div>
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
          <label className="search" style={{ width: 320 }}>
            <Icon name="search" className="icon icon--sm" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("hr.search")} />
          </label>
          <EmployeeTable people={visible} locale={locale} canManage={canManage} empty={ready ? t("hr.empty") : t("common.loading")} onOpen={setSelected} onStatus={(person, status) => void run(async () => updateEmployee(await getToken(), { ...profileOf(person), status }), t("hr.saved"), person.name)} />
        </>
      ) : null}
      {tab === "attendance" ? (
        <AttendancePanel
          people={employees}
          leaves={leaves}
          canManage={canManage}
          locale={locale}
          onStatus={(person, status) => void run(async () => updateEmployee(await getToken(), { ...profileOf(person), status }), t("hr.saved"), person.name)}
          onLeave={async (employeeId, kind, days, note) => run(async () => createLeaveRequest(await getToken(), { employeeId, kind, days, note }), t("hr.leaveSent"), "")}
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
            onApplicant={async (jobId, name, score, note) => run(async () => createApplicant(await getToken(), { jobId, name, score, note }), t("hr.saved"), name)}
            onStage={(id, stage) => void run(async () => setApplicantStage(await getToken(), id, stage), t("hr.saved"), "")}
          />
        ) : <p className="muted">{t("hr.forbidden")}</p>
      ) : null}
      {tab === "docs" ? (
        canViewAll ? (
          <DocumentsPanel
            documents={documents}
            canManage={canManage}
            locale={locale}
            onCreate={async (titleEn, titleAr, status, expiresAt) => run(async () => createHrDocument(await getToken(), { titleEn, titleAr, status, expiresAt }), t("hr.saved"), titleEn)}
          />
        ) : <p className="muted">{t("hr.forbidden")}</p>
      ) : null}
      <EmployeeDrawer
        person={selected}
        locale={locale}
        canManage={canManage}
        onClose={() => setSelected(null)}
        onSave={async (input) => {
          const ok = await run(async () => updateEmployee(await getToken(), input), t("hr.saved"), selected?.name ?? "");
          if (ok) setSelected(null);
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
    </AppShell>
  );
}

function profileOf(person: Employee) {
  return {
    id: person.id,
    status: person.status,
    idExpiry: person.idExpiry,
    passportExpiry: person.passportExpiry,
    visaExpiry: person.visaExpiry,
    bankName: person.bankName,
    ibanLast4: person.ibanLast4,
    basic: person.basic,
  };
}

function EmployeeTable({
  people,
  locale,
  canManage,
  empty,
  onOpen,
  onStatus,
}: {
  people: Employee[];
  locale: string;
  canManage: boolean;
  empty: string;
  onOpen: (person: Employee) => void;
  onStatus: (person: Employee, status: AttendanceStatus) => void;
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
            <th>{t("col.today")}</th>
            <th>{t("col.joined")}</th>
          </tr>
        </thead>
        <tbody>
          {people.length === 0 ? (
            <tr><td colSpan={6}>{empty}</td></tr>
          ) : null}
          {people.map((person) => (
            <tr key={person.id}>
              <td data-label="">
                <button type="button" className="person" onClick={() => onOpen(person)} style={{ background: "transparent", border: 0, color: "inherit", textAlign: "start" }}>
                  <span className="avatar">{initials(person.name)}</span>
                  <div>
                    <b>{person.name}</b>
                    <small className="num"><bdi>{person.employeeId}</bdi></small>
                  </div>
                </button>
              </td>
              <td data-label={t("col.position")}>{positionOf(person, locale)}</td>
              <td data-label={t("col.dept")} className="muted">{t(`dir.${person.department}`)}</td>
              <td data-label={t("col.mobile")} className="num muted"><bdi>{person.mobile || t("time.none")}</bdi></td>
              <td data-label={t("col.today")}>
                {canManage ? (
                  <select className="select select--sm" aria-label={t("col.today")} value={person.status} onChange={(event) => onStatus(person, event.target.value as AttendanceStatus)}>
                    {attendanceStatuses.map((status) => <option key={status} value={status}>{t(statusKey(status))}</option>)}
                  </select>
                ) : (
                  <span className={`badge badge--${person.status === "present" ? "ok" : person.status === "late" ? "danger" : "warn"}`}>{t(statusKey(person.status))}</span>
                )}
              </td>
              <td data-label={t("col.joined")} className="muted">{formatMonth(person.joined, locale, t("time.none"))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttendancePanel({
  people,
  leaves,
  canManage,
  canRequest,
  locale,
  onStatus,
  onLeave,
  onReview,
}: {
  people: Employee[];
  leaves: import("@/lib/hr").LeaveRequest[];
  canManage: boolean;
  canRequest: boolean;
  locale: string;
  onStatus: (person: Employee, status: AttendanceStatus) => void;
  onLeave: (employeeId: string, kind: LeaveKind, days: number, note: string) => Promise<boolean>;
  onReview: (id: string, decision: "approved" | "declined") => void;
}) {
  const t = useTranslations();
  const [employeeId, setEmployeeId] = useState(people[0]?.id ?? "");
  const [kind, setKind] = useState<LeaveKind>("annual");
  const [days, setDays] = useState("1");
  const [note, setNote] = useState("");
  const pending = leaves.filter((item) => item.status === "pending");

  return (
    <div className="stack">
      <EmployeeTable people={people} locale={locale} canManage={canManage} empty={t("hr.empty")} onOpen={() => undefined} onStatus={onStatus} />
      <div className="card stack">
        <h3 className="card-title">{t("hr.leaveTitle")}</h3>
        {canRequest && people.length > 0 ? (
          <form
            className="form-grid form-grid--2"
            onSubmit={(event) => {
              event.preventDefault();
              const count = Number(days);
              void onLeave(employeeId || people[0].id, kind, count, note).then((ok) => {
                if (ok) setNote("");
              });
            }}
          >
            <div className="field">
              <label>{t("col.employee")}</label>
              <select className="select" value={employeeId || people[0].id} onChange={(event) => setEmployeeId(event.target.value)}>
                {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>{t("col.type")}</label>
              <select className="select" value={kind} onChange={(event) => setKind(event.target.value as LeaveKind)}>
                {leaveKinds.map((item) => <option key={item} value={item}>{t(`st.${item}`)}</option>)}
              </select>
            </div>
            <Field label={t("hr.leaveDays")} value={days} onChange={setDays} type="number" />
            <Field label={t("hr.leaveNote")} value={note} onChange={setNote} />
            <button type="submit" className="btn btn--primary">{t("hr.leaveSend")}</button>
          </form>
        ) : <p className="muted">{t("hr.empty")}</p>}
        {pending.length === 0 ? <p className="muted">{t("hr.leaveEmpty")}</p> : null}
        {pending.map((item) => (
          <div className="list-row" key={item.id}>
            <span className="avatar">{initials(item.name)}</span>
            <div className="grow">
              <b>{item.name}</b>
              <small>{t(`st.${item.kind}`)} · {item.days}</small>
            </div>
            {canManage ? (
              <div className="hstack">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => onReview(item.id, "declined")}>{t("btn.decline")}</button>
                <button type="button" className="btn btn--primary btn--sm" onClick={() => onReview(item.id, "approved")}>{t("btn.approve")}</button>
              </div>
            ) : <span className="badge badge--warn">{t("st.pending")}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CareersPanel({
  jobs,
  applicants,
  canManage,
  locale,
  onJob,
  onApplicant,
  onStage,
}: {
  jobs: import("@/lib/hr").JobPost[];
  applicants: import("@/lib/hr").Applicant[];
  canManage: boolean;
  locale: string;
  onJob: (titleEn: string, titleAr: string, department: Department) => Promise<boolean>;
  onApplicant: (jobId: string, name: string, score: number | null, note: string) => Promise<boolean>;
  onStage: (id: string, stage: ApplicantStage) => void;
}) {
  const t = useTranslations();
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [department, setDepartment] = useState<Department>("site");
  const [jobId, setJobId] = useState("");
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="split">
      <div className="card stack">
        <h3 className="card-title">{t("hr.t3")}</h3>
        {jobs.length === 0 ? <p className="muted">{t("hr.jobEmpty")}</p> : null}
        {jobs.map((job) => (
          <div className="list-row" key={job.id}>
            <div className="grow">
              <b>{locale === "ar" ? job.titleAr || job.titleEn : job.titleEn}</b>
              <small>{t(`dir.${job.department}`)}</small>
            </div>
          </div>
        ))}
        {canManage ? (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              void onJob(titleEn, titleAr, department).then((ok) => {
                if (!ok) return;
                setTitleEn("");
                setTitleAr("");
              });
            }}
          >
            <Field label={t("hr.jobTitle")} value={titleEn} onChange={setTitleEn} />
            <Field label={t("hr.jobTitleAr")} value={titleAr} onChange={setTitleAr} />
            <DepartmentField value={department} onChange={setDepartment} />
            <button type="submit" className="btn btn--primary">{t("hr.jobAdd")}</button>
          </form>
        ) : null}
      </div>
      <div className="card stack">
        <h3 className="card-title">{t("hr.applicant")}</h3>
        <p className="muted">{t("hr.scoreHint")}</p>
        {applicants.map((person) => (
          <div className="list-row" key={person.id}>
            <span className="avatar">{initials(person.name)}</span>
            <div className="grow">
              <b>{person.name}</b>
              <small>{person.score === null ? t("time.none") : person.score} · {jobTitle(jobs.find((job) => job.id === person.jobId), locale)}</small>
            </div>
            {canManage ? (
              <select className="select select--sm" aria-label={t("col.status")} value={person.stage} onChange={(event) => onStage(person.id, event.target.value as ApplicantStage)}>
                {applicantStages.map((stage) => <option key={stage} value={stage}>{t(stageKey(stage))}</option>)}
              </select>
            ) : <span className="badge">{t(stageKey(person.stage))}</span>}
          </div>
        ))}
        {canManage && jobs.length > 0 ? (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const parsed = score.trim() === "" ? null : Number(score);
              void onApplicant(jobId || jobs[0].id, name, parsed, note).then((ok) => {
                if (!ok) return;
                setName("");
                setScore("");
                setNote("");
              });
            }}
          >
            <div className="field">
              <label>{t("hr.jobTitle")}</label>
              <select className="select" value={jobId || jobs[0].id} onChange={(event) => setJobId(event.target.value)}>
                {jobs.map((job) => <option key={job.id} value={job.id}>{locale === "ar" ? job.titleAr || job.titleEn : job.titleEn}</option>)}
              </select>
            </div>
            <Field label={t("hr.applicant")} value={name} onChange={setName} />
            <Field label={t("hr.score")} value={score} onChange={setScore} type="number" />
            <Field label={t("hr.leaveNote")} value={note} onChange={setNote} />
            <button type="submit" className="btn btn--secondary">{t("hr.applicantAdd")}</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function DocumentsPanel({
  documents,
  canManage,
  locale,
  onCreate,
}: {
  documents: import("@/lib/hr").HrDocument[];
  canManage: boolean;
  locale: string;
  onCreate: (titleEn: string, titleAr: string, status: HrDocStatus, expiresAt: string) => Promise<boolean>;
}) {
  const t = useTranslations();
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [status, setStatus] = useState<HrDocStatus>("draft");
  const [expiresAt, setExpiresAt] = useState("");

  return (
    <div className="card stack">
      <h3 className="card-title">{t("hr.t4")}</h3>
      {documents.length === 0 ? <p className="muted">{t("hr.docEmpty")}</p> : null}
      {documents.map((document) => {
        const expired = document.status === "expired" || isPast(document.expiresAt);
        return (
          <div className="list-row" key={document.id}>
            <span className="tile-icon"><Icon name="report" className="icon icon--sm" /></span>
            <div className="grow">
              <b>{locale === "ar" ? document.titleAr || document.titleEn : document.titleEn}</b>
              <small className="muted">{expired ? t("ds.expired") : t(`ds.${document.status}`)}{document.expiresAt ? ` · ${document.expiresAt}` : ""}</small>
            </div>
          </div>
        );
      })}
      {canManage ? (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            void onCreate(titleEn, titleAr, status, expiresAt).then((ok) => {
              if (!ok) return;
              setTitleEn("");
              setTitleAr("");
              setExpiresAt("");
            });
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
          <button type="submit" className="btn btn--primary">{t("hr.docAdd")}</button>
        </form>
      ) : null}
    </div>
  );
}

function EmployeeDrawer({
  person,
  locale,
  canManage,
  onClose,
  onSave,
}: {
  person: Employee | null;
  locale: string;
  canManage: boolean;
  onClose: () => void;
  onSave: (input: ReturnType<typeof profileOf>) => Promise<void>;
}) {
  const t = useTranslations();
  const [draft, setDraft] = useState<ReturnType<typeof profileOf> | null>(null);
  const current = person && draft?.id === person.id ? draft : person ? profileOf(person) : null;

  return (
    <Drawer open={person !== null} title={person?.name ?? ""} onClose={onClose}>
      {person && current ? (
        <div className="stack">
          <p className="muted"><bdi>{person.employeeId}</bdi> · {positionOf(person, locale)} · {t(`dir.${person.department}`)}</p>
          <Field label={t("hr.idExpiry")} value={current.idExpiry} onChange={(idExpiry) => setDraft({ ...current, idExpiry })} type="date" readOnly={!canManage} />
          <Field label={t("hr.passportExpiry")} value={current.passportExpiry} onChange={(passportExpiry) => setDraft({ ...current, passportExpiry })} type="date" readOnly={!canManage} />
          <Field label={t("hr.visaExpiry")} value={current.visaExpiry} onChange={(visaExpiry) => setDraft({ ...current, visaExpiry })} type="date" readOnly={!canManage} />
          <Field label={t("hr.bank")} value={current.bankName} onChange={(bankName) => setDraft({ ...current, bankName })} readOnly={!canManage} />
          <Field label={t("hr.ibanLast4")} value={current.ibanLast4} onChange={(ibanLast4) => setDraft({ ...current, ibanLast4 })} readOnly={!canManage} />
          <Field label={t("hr.basic")} value={current.basic === null ? "" : String(current.basic)} onChange={(value) => setDraft({ ...current, basic: value.trim() === "" ? null : Number(value) })} type="number" readOnly={!canManage} />
          {canManage ? <button type="button" className="btn btn--primary" onClick={() => void onSave(current)}>{t("set.save")}</button> : null}
        </div>
      ) : null}
    </Drawer>
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
  if (status === "annual") return "hr.statusAnnual";
  return "hr.statusSick";
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

function formatMonth(value: string, locale: string, empty: string) {
  if (!value) return empty;
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${value}T00:00:00+03:00`));
}

function exportEmployees(people: Employee[], locale: string, t: (key: string) => string) {
  const header = [t("col.employee"), t("reg.empId"), t("col.position"), t("col.dept"), t("col.mobile"), t("col.today"), t("col.joined")];
  const lines = people.map((person) => [person.name, person.employeeId, positionOf(person, locale), t(`dir.${person.department}`), person.mobile, t(statusKey(person.status)), person.joined]);
  const csv = [header, ...lines].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "asas-employees.csv";
  link.click();
  URL.revokeObjectURL(url);
}
