"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Badge, Chip, Level } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiNote, Banner, Card, Kpi } from "@/components/ui/card";
import { Avatar, Bars, BulkBar, ListRow, Paper, Steps, Tabs } from "@/components/ui/data";
import { Check, Dropzone, Field, Input, Segmented, Select, Switch, Textarea } from "@/components/ui/field";
import { Drawer, Modal, Toast } from "@/components/ui/overlay";

export function KitScreen() {
  const t = useTranslations();
  const [tab, setTab] = useState("users");
  const [segment, setSegment] = useState("light");
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  return (
    <AppShell title={t("kit.title")}>
      <div className="page-header">
        <div>
          <span className="eyebrow">ASAS</span>
          <h2 className="page-title">{t("kit.title")}</h2>
          <p className="page-sub">{t("kit.intro")}</p>
        </div>
      </div>

      <Card>
        <h3 className="card-title">{t("btn.approve")}</h3>
        <div className="hstack" style={{ marginTop: 12 }}>
          <Button>{t("btn.approve")}</Button>
          <Button variant="accent">{t("acc.approve")}</Button>
          <Button variant="secondary">{t("btn.export")}</Button>
          <Button variant="ghost">{t("btn.cancel")}</Button>
          <Button size="sm">{t("btn.review")}</Button>
          <Button size="lg">{t("auth.signIn")}</Button>
        </div>
      </Card>

      <div className="hstack">
        <Badge tone="ok">{t("st.verified")}</Badge>
        <Badge tone="warn">{t("st.pending")}</Badge>
        <Badge tone="danger">{t("st.late")}</Badge>
        <Badge tone="info">{t("st.present")}</Badge>
        <Badge tone="neutral">{t("role.staff")}</Badge>
        <Badge tone="accent" plain>{t("nav.ai")}</Badge>
        <Chip>{t("role.engineer")}</Chip>
        <Chip pressed>{t("role.hr")}</Chip>
        <Chip ai>{t("ai.s1")}</Chip>
        <Level kind="full">full</Level>
        <Level kind="view">view</Level>
        <Level kind="own">own</Level>
        <Level kind="request">request</Level>
        <Level kind="none">none</Level>
      </div>

      <div className="grid-4">
        <Kpi label={t("ov.k1")} value="6" note={t("ov.k1n")} noteTone="warn" />
        <Kpi label={t("ov.k4")} value="4" note={t("ov.k4n")} dark />
      </div>
      <Banner title={t("ai.title")} action={<Button variant="accent">{t("btn.approve")}</Button>}>
        {t("ai.note")}
      </Banner>
      <AiNote title={t("ov.aiT")}>{t("ov.aiS")}</AiNote>

      <Card>
        <ListRow leading={<Avatar>AS</Avatar>} title={t("person.layla")} detail={t("role.hr")} action={<Button size="sm" variant="secondary">{t("btn.review")}</Button>} />
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "users", label: t("ut.users") },
            { id: "requests", label: t("ut.req") },
          ]}
        />
        <div style={{ marginTop: 16 }}>
          <Steps
            items={[
              { title: t("nav.hr"), detail: t("st.present"), state: "done" },
              { title: t("nav.payroll"), detail: t("st.pending"), state: "current" },
              { title: t("nav.accounting"), detail: t("role.accountant"), state: "todo" },
            ]}
          />
        </div>
        <Bars items={[{ label: t("d.today"), value: "5", height: 80, tone: "now" }, { label: t("d.fri"), value: "1", height: 24, tone: "weekend" }]} />
      </Card>

      <BulkBar>
        <span>{t("us.selectedCount", { count: 2 })}</span>
        <span className="sep" />
        <button type="button">{t("btn.approve")}</button>
        <button type="button" className="clear">{t("us.clear")}</button>
      </BulkBar>

      <Card>
        <div className="form-grid">
          <Field label={t("auth.email")}>
            <Input type="email" defaultValue="a.salah@asasqa.com" />
          </Field>
          <Field label={t("col.role")}>
            <Select defaultValue="hr">
              <option value="hr">{t("role.hr")}</option>
              <option value="staff">{t("role.staff")}</option>
            </Select>
          </Field>
          <Field label={t("req.msg")}>
            <Textarea defaultValue={t("ai.ask")} />
          </Field>
        </div>
        <div className="hstack" style={{ marginTop: 12 }}>
          <Check label={t("auth.keep")} defaultChecked />
          <Switch defaultChecked />
          <Segmented
            value={segment}
            onChange={setSegment}
            options={[
              { id: "light", label: "EN" },
              { id: "dark", label: "ع" },
            ]}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <Dropzone>{t("acc.receipt")}</Dropzone>
        </div>
      </Card>

      <div className="hstack">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>{t("common.viewAll")}</Button>
        <Button variant="secondary" onClick={() => setDrawerOpen(true)}>{t("acc.title")}</Button>
        <Button variant="secondary" onClick={() => setToastOpen(true)}>{t("acc.done")}</Button>
      </div>
      <Paper>
        <b>ASAS</b>
        <p>{t("auth.note")}</p>
      </Paper>

      <Modal open={modalOpen} title={t("kit.title")} onClose={() => setModalOpen(false)}>
        <p className="muted">{t("kit.intro")}</p>
      </Modal>
      <Drawer open={drawerOpen} title={t("acc.title")} onClose={() => setDrawerOpen(false)}>
        <p>{t("req.sub")}</p>
      </Drawer>
      <Toast open={toastOpen} title={t("acc.done")} detail={t("acc.doneS")} />
    </AppShell>
  );
}
