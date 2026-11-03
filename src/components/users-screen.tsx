"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { Tabs } from "@/components/ui/data";

type PersonId = "mohammed" | "fatima" | "yousef" | "aisha" | "reem" | "layla" | "omar";

const directory: {
  id: PersonId;
  employeeId: string;
  role: "engineerShort" | "staff" | "accountant" | "seniorAccountant" | "hrShort";
  department: "projects" | "people" | "finance" | "site";
  status: "verified" | "reqHR" | "reqEng";
  lastActive: "today0912" | "today0840" | "today0815" | "yesterday" | "none";
  pending: boolean;
}[] = [
  { id: "mohammed", employeeId: "ASAS-0142", role: "engineerShort", department: "projects", status: "verified", lastActive: "today0912", pending: false },
  { id: "fatima", employeeId: "ASAS-0187", role: "staff", department: "people", status: "reqHR", lastActive: "none", pending: true },
  { id: "yousef", employeeId: "ASAS-0191", role: "staff", department: "projects", status: "reqEng", lastActive: "none", pending: true },
  { id: "aisha", employeeId: "ASAS-0108", role: "accountant", department: "finance", status: "verified", lastActive: "today0840", pending: false },
  { id: "reem", employeeId: "ASAS-0131", role: "seniorAccountant", department: "finance", status: "verified", lastActive: "today0815", pending: false },
  { id: "layla", employeeId: "ASAS-0120", role: "hrShort", department: "people", status: "verified", lastActive: "yesterday", pending: false },
  { id: "omar", employeeId: "ASAS-0115", role: "staff", department: "site", status: "verified", lastActive: "yesterday", pending: false },
];

export function UsersScreen() {
  const t = useTranslations();
  const [tab, setTab] = useState("users");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<PersonId>>(() => new Set(["fatima", "yousef"]));

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return directory;
    return directory.filter((person) => {
      const name = t(`person.${person.id}`).toLowerCase();
      return name.includes(needle) || person.employeeId.toLowerCase().includes(needle);
    });
  }, [query, t]);

  function toggle(id: PersonId) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AppShell title={t("nav.users")}>
      <div className="page-header">
        <div>
          <span className="eyebrow">{t("role.superAdmin")}</span>
          <h2 className="page-title">{t("nav.users")}</h2>
          <p className="page-sub">{t("us.sub")}</p>
        </div>
        <div className="hstack">
          <button type="button" className="btn btn--secondary">
            <Icon name="download" />
            {t("btn.export")}
          </button>
          <button type="button" className="btn btn--primary">
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
          { id: "requests", label: t("ut.req") },
          { id: "roles", label: t("ut.roles") },
          { id: "bank", label: t("ut.bank") },
        ]}
      />
      {tab === "users" ? (
        <>
          <div className="hstack">
            <label className="search" style={{ width: 320 }}>
              <Icon name="search" className="icon icon--sm" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("us.search")} />
            </label>
            <select className="select" style={{ width: 160 }} aria-label={t("us.allRoles")}>
              <option>{t("us.allRoles")}</option>
            </select>
            <select className="select" style={{ width: 180 }} aria-label={t("us.allDepts")}>
              <option>{t("us.allDepts")}</option>
            </select>
          </div>
          {selected.size > 0 ? (
            <div className="bulk">
              <span className="check">
                <span>{t("us.selectedCount", { count: selected.size })}</span>
              </span>
              <span className="sep" />
              <button type="button">
                <Icon name="check" className="icon icon--sm" />
                {t("btn.approve")}
              </button>
              <button type="button">
                <Icon name="users" className="icon icon--sm" />
                {t("us.changeRole")}
              </button>
              <button type="button">
                <Icon name="lock" className="icon icon--sm" />
                {t("us.disable")}
              </button>
              <button type="button" className="clear" onClick={() => setSelected(new Set())}>
                {t("us.clear")}
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
                {visible.map((person) => {
                  const isSelected = selected.has(person.id);
                  return (
                    <tr key={person.id} className={isSelected ? "is-selected" : undefined}>
                      <td data-label="">
                        <div className="person">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            aria-label={t(`person.${person.id}`)}
                            onChange={() => toggle(person.id)}
                          />
                          <span className="avatar">{t(`person.initials.${person.id}`)}</span>
                          <div>
                            <b>{t(`person.${person.id}`)}</b>
                            <small className="num">
                              <bdi>{person.employeeId}</bdi>
                            </small>
                          </div>
                        </div>
                      </td>
                      <td data-label={t("col.role")}>
                        <select className="select select--sm" style={{ width: "100%", maxWidth: 220 }} aria-label={t("col.role")}>
                          <option>{t(`role.${person.role}`)}</option>
                        </select>
                      </td>
                      <td data-label={t("col.dept")}>{t(`dir.${person.department}`)}</td>
                      <td data-label={t("col.status")}>
                        <span className={`badge ${person.pending ? "badge--warn" : "badge--ok"}`}>
                          {t(`st.${person.status}`)}
                        </span>
                      </td>
                      <td data-label={t("col.last")} className="muted">
                        {t(`time.${person.lastActive}`)}
                      </td>
                      <td className="end" data-label="">
                        {person.pending ? (
                          <button type="button" className="btn btn--secondary btn--sm">
                            {t("btn.reviewReq")}
                          </button>
                        ) : (
                          <button type="button" className="icon-btn" style={{ border: 0, background: "transparent" }} aria-label={t(`person.${person.id}`)}>
                            <Icon name="more" />
                          </button>
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
    </AppShell>
  );
}
