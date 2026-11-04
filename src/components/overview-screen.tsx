"use client";

import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useDirectory } from "@/components/use-directory";
import { initials, requestLabelKey } from "@/lib/directory";
import { AiNote, Kpi } from "@/components/ui/card";
import { Bars, ListRow } from "@/components/ui/data";
import { Link } from "@/i18n/navigation";

const bars = [
  { key: "tue", value: "5", height: 130 },
  { key: "wed", value: "6", height: 156 },
  { key: "thu", value: "5", height: 130 },
  { key: "fri", value: "1", height: 26, tone: "weekend" as const },
  { key: "sat", value: "2", height: 52, tone: "weekend" as const },
  { key: "sun", value: "5", height: 130 },
  { key: "today", value: "5", height: 130, tone: "now" as const },
];

export function OverviewScreen() {
  const t = useTranslations();
  const { profile } = useAuth();
  const { users, requests } = useDirectory();
  const admin = profile?.role === "superAdmin";

  return (
    <AppShell title={t("page.overview")}>
      <div className="page-header">
        <div>
          <span className="eyebrow">{profile ? t(`role.${profile.role}`) : t("role.superAdmin")}</span>
          <h2 className="page-title">{profile?.name || t("ov.hello")}</h2>
          <p className="page-sub">{t("date.today")}</p>
        </div>
        <div className="hstack">
          <button type="button" className="btn btn--secondary">
            <Icon name="download" />
            {t("btn.export")}
          </button>
          <Link href="/users" className="btn btn--primary">
            <Icon name="plus" />
            {t("ov.newUser")}
          </Link>
        </div>
      </div>
      <div className="grid-4">
        <Kpi label={t("ov.k1")} value={String(requests.length)} note={t("us.openNote", { count: requests.length })} noteTone="warn" />
        <Kpi label={t("ov.k2")} value={String(users.length)} note={t("ov.k2n")} />
        <Kpi label={t("ov.k3")} value="10" note={t("ov.k3n")} noteTone="ok" />
        <Kpi label={t("ov.k4")} value="4" note={t("ov.k4n")} dark />
      </div>
      <div className="split">
        <div className="stack">
          <div className="card">
            <div className="between">
              <div>
                <h3 className="card-title">{t("ov.chart")}</h3>
                <p className="card-sub">{t("ov.chartS")}</p>
              </div>
              <select className="select select--sm" style={{ width: "auto" }} aria-label={t("ov.chart")}>
                <option>{t("ov.thisWeek")}</option>
              </select>
            </div>
            <Bars
              items={bars.map((bar) => ({
                label: t(`d.${bar.key}`),
                value: bar.value,
                height: bar.height,
                tone: bar.tone,
              }))}
            />
          </div>
          <div className="card">
            <h3 className="card-title">{t("ov.activity")}</h3>
            <ListRow
              leading={<span className="tile-icon"><Icon name="report" className="icon icon--sm" /></span>}
              title={t("act1")}
              action={<small className="muted">{t("act1t")}</small>}
            />
            <ListRow
              leading={<span className="tile-icon"><Icon name="wallet" className="icon icon--sm" /></span>}
              title={t("act2")}
              action={<small className="muted">{t("act2t")}</small>}
            />
            <ListRow
              leading={<span className="tile-icon"><Icon name="ruler" className="icon icon--sm" /></span>}
              title={t("act3")}
              action={<small className="muted">{t("act3t")}</small>}
            />
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <div className="between">
              <h3 className="card-title">{t("ov.req")}</h3>
              <Link className="link" href="/users">
                {t("common.viewAll")}
              </Link>
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
          <AiNote title={t("ov.aiT")}>{t("ov.aiS")}</AiNote>
        </div>
      </div>
    </AppShell>
  );
}
