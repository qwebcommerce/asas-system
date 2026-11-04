"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { Drawer } from "@/components/ui/overlay";

const filters = [
  { id: "all", label: "f1", count: "214" },
  { id: "shared", label: "f2", count: "38" },
  { id: "expiring", label: "f3", count: "4" },
  { id: "contracts", label: "f4", count: "46" },
  { id: "drawings", label: "f5", count: "71" },
  { id: "permits", label: "f6", count: "18" },
] as const;

const documents = [
  { id: "contract", name: "docContract", type: "contract", project: "projectWaab", ver: "v3", status: "signed", badge: "ok", updated: "upd28", folder: "contracts" },
  { id: "permit", name: "docPermit", type: "permit", project: "projectLusail", ver: "v1", status: "expires", badge: "warn", updated: "upd21", folder: "permits" },
  { id: "draw", name: "docDraw", type: "drawing", project: "projectWest", ver: "v3", status: "review", badge: "info", updated: "upd19", folder: "drawings" },
  { id: "marble", name: "docMarble", type: "contract", project: "clientAll", ver: "v2", status: "signed", badge: "ok", updated: "upd15", folder: "contracts" },
  { id: "hand", name: "docHand", type: "cert", project: "projectTower", ver: "v1", status: "draft", badge: "neutral", updated: "upd12", folder: "shared" },
  { id: "ins", name: "docIns", type: "policy", project: "clientCompany", ver: "v1", status: "expired", badge: "danger", updated: "upd2", folder: "expiring" },
] as const;

export function DocumentsScreen() {
  const t = useTranslations();
  const [folder, setFolder] = useState<(typeof filters)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents.filter((doc) => {
      const inFolder = folder === "all" || doc.folder === folder || (folder === "expiring" && (doc.status === "expires" || doc.status === "expired"));
      if (!inFolder) return false;
      if (!needle) return true;
      return t(`sample.${doc.name}`).toLowerCase().includes(needle);
    });
  }, [folder, query, t]);

  return (
    <AppShell title={t("nav.documents")}>
      <div className="page-header">
        <div>
          <span className="eyebrow">{t("doc.eyebrow")}</span>
          <h2 className="page-title">{t("nav.documents")}</h2>
          <p className="page-sub">{t("doc.sub")}</p>
        </div>
        <button type="button" className="btn btn--primary">
          <Icon name="upload" />
          {t("doc.upload")}
        </button>
      </div>
      <div className="row">
        <nav className="stack stack--sm" style={{ width: 220, flex: "none" }} aria-label={t("nav.documents")}>
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              className="nav-item"
              style={{
                color: "var(--text)",
                background: folder === item.id ? "var(--surface)" : "transparent",
                fontWeight: folder === item.id ? 600 : 400,
              }}
              onClick={() => setFolder(item.id)}
            >
              <span className="grow">{t(`doc.${item.label}`)}</span>
              <small className="muted num">{item.count}</small>
            </button>
          ))}
        </nav>
        <div className="stack grow">
          <label className="search" style={{ width: "min(320px, 100%)" }}>
            <Icon name="search" className="icon icon--sm" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("doc.search")} />
          </label>
          <div className="card card--flush table-wrap">
            <table className="table table--cards">
              <thead>
                <tr>
                  <th>{t("col.name")}</th>
                  <th>{t("col.type")}</th>
                  <th>{t("col.project")}</th>
                  <th>{t("col.ver")}</th>
                  <th>{t("col.status")}</th>
                  <th>{t("col.updated")}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((doc) => (
                  <tr key={doc.id} style={{ cursor: "pointer" }} onClick={() => setOpen(true)}>
                    <td data-label="">
                      <div className="person">
                        <span className="tile-icon"><Icon name="report" className="icon icon--sm" /></span>
                        <b>{t(`sample.${doc.name}`)}</b>
                      </div>
                    </td>
                    <td data-label={t("col.type")}>
                      <span className="badge badge--accent badge--plain">{t(`dt.${doc.type}`)}</span>
                    </td>
                    <td data-label={t("col.project")} className="muted">{t(`sample.${doc.project}`)}</td>
                    <td data-label={t("col.ver")} className="num muted"><bdi>{doc.ver}</bdi></td>
                    <td data-label={t("col.status")}>
                      <span className={`badge badge--${doc.badge}`}>{t(`ds.${doc.status}`)}</span>
                    </td>
                    <td data-label={t("col.updated")} className="muted">{t(`sample.${doc.updated}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ai">
            <Icon name="clock" />
            <span>{t("doc.alert")}</span>
          </div>
        </div>
      </div>
      <Drawer open={open} title={t("sample.docPermit")} onClose={() => setOpen(false)}>
        <div className="hstack">
          <span className="badge badge--accent badge--plain">{t("dt.permit")}</span>
          <span className="badge badge--warn">{t("ds.expires")}</span>
        </div>
        <div className="dropzone" style={{ minHeight: 220 }}>
          <Icon name="report" className="icon icon--lg" />
          <b><bdi>{t("sample.permitFile")}</bdi></b>
          <small className="num">{t("sample.permitMeta")}</small>
        </div>
        <div>
          <div className="kv"><span>{t("doc.project")}</span><span>{t("sample.projectLusail")}</span></div>
          <div className="kv"><span>{t("doc.issued")}</span><span>{t("sample.issuer")}</span></div>
          <div className="kv"><span>{t("doc.owner")}</span><span>{t("person.mohammed")}</span></div>
        </div>
        <h3 className="card-title">{t("doc.sent")}</h3>
        <div className="list-row">
          <Icon name="send" className="icon icon--sm" />
          <div className="grow">
            <b>{t("sample.sentWho")}</b>
            <small>{t("doc.sent1")}</small>
          </div>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn btn--secondary">
            <Icon name="download" />
            {t("doc.download")}
          </button>
          <button type="button" className="btn btn--primary">
            <Icon name="upload" />
            {t("doc.newVer")}
          </button>
        </div>
      </Drawer>
    </AppShell>
  );
}
