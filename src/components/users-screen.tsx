"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useAccessAdmin } from "@/components/use-access";
import { useDirectory } from "@/components/use-directory";
import { Tabs } from "@/components/ui/data";
import { Modal, Toast } from "@/components/ui/overlay";
import { levelKey, matrixModules, matrixRoles, moduleKey, permissionLevels, type BankAccount, type MatrixRole, type PermissionLevel, type RoleMatrix } from "@/lib/access";
import { departments, initials, roles, type Department, type DirectoryUser, type Role } from "@/lib/directory";
import { deleteBankAccount, saveBankAccount, updatePermission } from "@/server/access";
import { createDirectoryUser, deleteDirectoryUser, setUsersDisabled, updateDirectoryUser } from "@/server/directory";

export function UsersScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { profile, getToken } = useAuth();
  const { users, ready } = useDirectory();
  const { banks, matrix } = useAccessAdmin(profile?.role === "superAdmin");
  const [tab, setTab] = useState("users");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<DirectoryUser | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);
  const [error, setError] = useState("");
  const admin = profile?.role === "superAdmin";

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((person) => {
      if (roleFilter !== "all" && person.role !== roleFilter) return false;
      if (deptFilter !== "all" && person.department !== deptFilter) return false;
      if (!needle) return true;
      return person.name.toLowerCase().includes(needle) || person.email.toLowerCase().includes(needle) || person.employeeId.toLowerCase().includes(needle);
    });
  }, [deptFilter, query, roleFilter, users]);

  const roleCount = new Set(users.map((person) => person.role)).size;

  function notify(title: string, detail: string) {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, title: string, detail: string) {
    const result = await action();
    if (!result.ok) {
      setError(t(result.error ?? "auth.failed"));
      return false;
    }
    setError("");
    notify(title, detail);
    return true;
  }

  if (!admin) {
    return (
      <AppShell title={t("nav.users")}>
        <p className="muted">{t("us.forbidden")}</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={t("nav.users")}>
      <div className="page-header">
        <div>
          <span className="eyebrow">{t("role.superAdmin")}</span>
          <h2 className="page-title">{t("nav.users")}</h2>
          <p className="page-sub">{ready ? t("us.count", { count: users.length, roles: roleCount }) : t("common.loading")}</p>
        </div>
        <div className="hstack">
          <button type="button" className="btn btn--secondary" onClick={() => exportUsers(visible, t)}>
            <Icon name="download" />
            {t("btn.export")}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setInviteOpen(true)}>
            <Icon name="plus" />
            {t("us.invite")}
          </button>
        </div>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "users", label: t("ut.users") },
          { id: "roles", label: t("ut.roles") },
          { id: "bank", label: t("ut.bank") },
        ]}
      />
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      {tab === "users" ? (
        <>
          <div className="hstack">
            <label className="search" style={{ width: 320 }}>
              <Icon name="search" className="icon icon--sm" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("us.search")} />
            </label>
            <select className="select" style={{ width: 160 }} aria-label={t("us.allRoles")} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="all">{t("us.allRoles")}</option>
              {roles.map((role) => (
                <option key={role} value={role}>{t(`role.${role}`)}</option>
              ))}
            </select>
            <select className="select" style={{ width: 180 }} aria-label={t("us.allDepts")} value={deptFilter} onChange={(event) => setDeptFilter(event.target.value)}>
              <option value="all">{t("us.allDepts")}</option>
              {departments.map((department) => (
                <option key={department} value={department}>{t(`dir.${department}`)}</option>
              ))}
            </select>
          </div>
          {selected.size > 0 ? (
            <div className="bulk">
              <span className="check">
                <span>{t("us.selectedCount", { count: selected.size })}</span>
              </span>
              <span className="sep" />
              <button
                type="button"
                onClick={() => {
                  const turningOff = users.some((person) => selected.has(person.id) && person.status !== "disabled");
                  void run(async () => setUsersDisabled(await getToken(), [...selected], turningOff), turningOff ? t("us.disabledDone") : t("us.enabledDone"), "");
                }}
              >
                <Icon name="lock" className="icon icon--sm" />
                {users.some((person) => selected.has(person.id) && person.status !== "disabled") ? t("us.deactivate") : t("us.activate")}
              </button>
              <button
                type="button"
                onClick={() => void run(async () => {
                  const token = await getToken();
                  const results = await Promise.all([...selected].map((id) => deleteDirectoryUser(token, id)));
                  const failed = results.find((result) => !result.ok);
                  if (!failed) setSelected(new Set());
                  return failed ?? { ok: true };
                }, t("us.deleted"), "")}
              >
                {t("us.delete")}
              </button>
            </div>
          ) : null}
          <div className="card card--flush table-wrap">
            <table className="table table--cards">
              <thead>
                <tr>
                  <th>{t("col.name")}</th>
                  <th>{t("col.role")}</th>
                  <th>{t("col.dept")}</th>
                  <th>{t("col.status")}</th>
                  <th>{t("col.last")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={6}>{ready ? t("us.empty") : t("common.loading")}</td>
                  </tr>
                ) : null}
                {visible.map((person) => {
                  const isSelected = selected.has(person.id);
                  const locked = person.role === "superAdmin";
                  return (
                    <tr key={person.id} className={isSelected ? "is-selected" : undefined}>
                      <td data-label="">
                        <div className="person">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={locked}
                            aria-label={person.name}
                            onChange={() => {
                              setSelected((current) => {
                                const next = new Set(current);
                                if (next.has(person.id)) next.delete(person.id);
                                else next.add(person.id);
                                return next;
                              });
                            }}
                          />
                          <span className="avatar">{initials(person.name)}</span>
                          <div>
                            <b>{person.name}</b>
                            <small className="num">
                              <bdi>{person.employeeId}</bdi> · <bdi>{person.email}</bdi>
                            </small>
                          </div>
                        </div>
                      </td>
                      <td data-label={t("col.role")}>{t(`role.${person.role}`)}</td>
                      <td data-label={t("col.dept")}>{t(`dir.${person.department}`)}</td>
                      <td data-label={t("col.status")}>
                        {person.status === "disabled" ? (
                          <span className="badge badge--danger">{t("st.disabled")}</span>
                        ) : (
                          <span className="badge badge--ok">{t("st.active")}</span>
                        )}
                      </td>
                      <td data-label={t("col.last")} className="muted">
                        {formatActive(person.lastActiveAt, locale, t("time.none"))}
                      </td>
                      <td className="end" data-label="">
                        {locked ? null : (
                          <div className="hstack">
                            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setEditing(person)}>{t("us.edit")}</button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => void run(async () => setUsersDisabled(await getToken(), [person.id], person.status !== "disabled"), person.status === "disabled" ? t("us.enabledDone") : t("us.disabledDone"), person.name)}
                            >
                              {person.status === "disabled" ? t("us.activate") : t("us.deactivate")}
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => void run(async () => deleteDirectoryUser(await getToken(), person.id), t("us.deleted"), person.name)}
                            >
                              {t("us.delete")}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {tab === "roles" ? (
        <RolesMatrix
          matrix={matrix}
          onChange={(role, module, level) => void run(async () => updatePermission(await getToken(), role, module, level), t("us.roleUpdated"), "")}
        />
      ) : null}
      {tab === "bank" ? (
        <BankPanel
          banks={banks}
          locale={locale}
          onSave={async (input) => run(async () => saveBankAccount(await getToken(), input), t("us.bankSaved"), input.name)}
          onDelete={async (id, name) => run(async () => deleteBankAccount(await getToken(), id), t("us.bankDeleted"), name)}
        />
      ) : null}
      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreate={async (input) => {
          const result = await createDirectoryUser(await getToken(), input);
          if (!result.ok) return result.error;
          setInviteOpen(false);
          notify(t("us.created"), t("us.createdS"));
          return "";
        }}
      />
      <EditUserDialog
        person={editing}
        onClose={() => setEditing(null)}
        onSave={async (input) => {
          if (!editing) return "auth.failed";
          const result = await updateDirectoryUser(await getToken(), editing.id, input);
          if (!result.ok) return result.error ?? "auth.failed";
          setEditing(null);
          notify(t("us.updated"), editing.name);
          return "";
        }}
      />
      <Toast open={Boolean(toast)} title={toast?.title ?? ""} detail={toast?.detail ?? ""} />
    </AppShell>
  );
}

function InviteDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; email: string; employeeId: string; mobile: string; password: string; role: Role; department: Department }) => Promise<string>;
}) {
  const t = useTranslations();
  const [error, setError] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [department, setDepartment] = useState<Department>("projects");

  return (
    <Modal open={open} title={t("us.inviteTitle")} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void onCreate({
            name: String(data.get("name") ?? ""),
            email: String(data.get("email") ?? ""),
            employeeId: String(data.get("employeeId") ?? ""),
            mobile: String(data.get("mobile") ?? ""),
            password: String(data.get("password") ?? ""),
            role,
            department,
          }).then((message) => setError(message ? t(message) : ""));
        }}
      >
        <Field name="name" label={t("reg.name")} />
        <Field name="employeeId" label={t("reg.empId")} />
        <Field name="email" label={t("auth.email")} type="email" />
        <Field name="mobile" label={t("reg.mobile")} />
        <Field name="password" label={t("us.tempPassword")} type="password" />
        <div className="form-grid form-grid--2">
          <div className="field">
            <label>{t("col.role")}</label>
            <select className="select" value={role} onChange={(event) => setRole(event.target.value as Role)}>
              {roles.filter((item) => item !== "superAdmin").map((item) => (
                <option key={item} value={item}>{t(`role.${item}`)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t("col.dept")}</label>
            <select className="select" value={department} onChange={(event) => setDepartment(event.target.value as Department)}>
              {departments.map((item) => (
                <option key={item} value={item}>{t(`dir.${item}`)}</option>
              ))}
            </select>
          </div>
        </div>
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        <div className="hstack" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>{t("btn.cancel")}</button>
          <button type="submit" className="btn btn--primary">{t("us.invite")}</button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ name, label, type = "text", value, onChange, required }: { name?: string; label: string; type?: string; value?: string; onChange?: (value: string) => void; required?: boolean }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} type={type} required={required ?? type !== "number"} value={onChange ? value : undefined} onChange={onChange ? (event) => onChange(event.target.value) : undefined} />
    </div>
  );
}

function EditUserDialog({
  person,
  onClose,
  onSave,
}: {
  person: DirectoryUser | null;
  onClose: () => void;
  onSave: (input: { name: string; email: string; employeeId: string; mobile: string; password: string; role: Role; department: Department }) => Promise<string>;
}) {
  const t = useTranslations();
  const [error, setError] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [department, setDepartment] = useState<Department>("projects");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [mobile, setMobile] = useState("");

  useEffect(() => {
    if (!person) return;
    setRole(person.role === "superAdmin" ? "staff" : person.role);
    setDepartment(person.department);
    setName(person.name);
    setEmail(person.email);
    setEmployeeId(person.employeeId);
    setMobile(person.mobile);
    setError("");
  }, [person]);

  return (
    <Modal open={person !== null} title={t("us.edit")} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void onSave({
            name,
            email,
            employeeId,
            mobile,
            password: String(data.get("password") ?? ""),
            role,
            department,
          }).then((message) => setError(message ? t(message) : ""));
        }}
      >
        <Field label={t("reg.name")} value={name} onChange={setName} />
        <Field label={t("reg.empId")} value={employeeId} onChange={setEmployeeId} />
        <Field label={t("auth.email")} value={email} onChange={setEmail} type="email" />
        <Field label={t("reg.mobile")} value={mobile} onChange={setMobile} required={false} />
        <Field name="password" label={t("us.passwordOptional")} type="password" required={false} />
        <div className="form-grid form-grid--2">
          <div className="field">
            <label>{t("col.role")}</label>
            <select className="select" value={role} onChange={(event) => setRole(event.target.value as Role)}>
              {roles.filter((item) => item !== "superAdmin").map((item) => (
                <option key={item} value={item}>{t(`role.${item}`)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t("col.dept")}</label>
            <select className="select" value={department} onChange={(event) => setDepartment(event.target.value as Department)}>
              {departments.map((item) => (
                <option key={item} value={item}>{t(`dir.${item}`)}</option>
              ))}
            </select>
          </div>
        </div>
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        <div className="hstack" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn--ghost" onClick={onClose}>{t("btn.cancel")}</button>
          <button type="submit" className="btn btn--primary">{t("set.save")}</button>
        </div>
      </form>
    </Modal>
  );
}

function formatActive(value: number | null, locale: string, empty: string) {
  if (!value) return empty;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", numberingSystem: "latn", timeZone: "Asia/Qatar" }).format(value);
}

function RolesMatrix({ matrix, onChange }: { matrix: RoleMatrix; onChange: (role: MatrixRole, module: (typeof matrixModules)[number], level: PermissionLevel) => void }) {
  const t = useTranslations();
  return (
    <div className="card card--flush table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{t("acc.modules")}</th>
            {matrixRoles.map((role) => <th key={role}>{role === "ceo" ? t("sample.ceo") : t(`role.${role}`)}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrixModules.map((module) => (
            <tr key={module}>
              <td className="strong">{t(moduleKey(module))}</td>
              {matrixRoles.map((role) => (
                <td key={role}>
                  {role === "superAdmin" && module === "users" ? t(levelKey("full")) : (
                    <select className="select select--sm" aria-label={`${t(moduleKey(module))} ${role}`} value={matrix[role][module]} onChange={(event) => onChange(role, module, event.target.value as PermissionLevel)}>
                      {permissionLevels.map((level) => <option key={level} value={level}>{t(levelKey(level))}</option>)}
                    </select>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BankPanel({
  banks,
  locale,
  onSave,
  onDelete,
}: {
  banks: BankAccount[];
  locale: string;
  onSave: (input: { id?: string; name: string; bank: string; last4: string; balance: number }) => Promise<boolean>;
  onDelete: (id: string, name: string) => Promise<boolean>;
}) {
  const t = useTranslations();
  const [id, setId] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [last4, setLast4] = useState("");
  const [balance, setBalance] = useState("");
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "QAR", numberingSystem: "latn" });

  return (
    <div className="stack">
      {banks.length === 0 ? <p className="muted">{t("us.bankEmpty")}</p> : null}
      {banks.map((account) => (
        <div className="card between" key={account.id}>
          <div>
            <b>{account.name}</b>
            <small className="muted" style={{ display: "block" }}>{account.bank} ···· {account.last4}</small>
          </div>
          <div className="hstack">
            <span className="num">{money.format(account.balance)}</span>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                setId(account.id);
                setName(account.name);
                setBank(account.bank);
                setLast4(account.last4);
                setBalance(String(account.balance));
              }}
            >
              {t("us.edit")}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => void onDelete(account.id, account.name).then((ok) => {
                if (!ok || id !== account.id) return;
                setId(undefined);
                setName("");
                setBank("");
                setLast4("");
                setBalance("");
              })}
            >
              {t("us.delete")}
            </button>
          </div>
        </div>
      ))}
      <form
        className="card stack"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave({ id, name, bank, last4, balance: Number(balance) }).then((ok) => {
            if (!ok) return;
            setId(undefined);
            setName("");
            setBank("");
            setLast4("");
            setBalance("");
          });
        }}
      >
        <h3 className="card-title">{id ? t("us.edit") : t("us.addBank")}</h3>
        <Field label={t("us.accountName")} value={name} onChange={setName} />
        <Field label={t("us.bankName")} value={bank} onChange={setBank} />
        <Field label={t("us.last4")} value={last4} onChange={setLast4} />
        <Field label={t("us.balance")} value={balance} onChange={setBalance} type="number" />
        <button type="submit" className="btn btn--primary">{t("set.save")}</button>
      </form>
      <p className="muted">{t("pay.lock")}</p>
    </div>
  );
}

function exportUsers(people: DirectoryUser[], t: (key: string) => string) {
  const header = [t("col.name"), t("auth.email"), t("reg.empId"), t("col.role"), t("col.dept"), t("col.status")];
  const lines = people.map((person) => [person.name, person.email, person.employeeId, t(`role.${person.role}`), t(`dir.${person.department}`), person.status === "disabled" ? t("st.disabled") : t("st.active")]);
  const csv = [header, ...lines].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "asas-users.csv";
  link.click();
  URL.revokeObjectURL(url);
}
