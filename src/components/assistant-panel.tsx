"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useReports } from "@/components/use-reports";
import { Link } from "@/i18n/navigation";
import { assistantTurn, type AssistantDraft, type AssistantMessage } from "@/server/assistant";
import { createProjectReport } from "@/server/reports";

type History = AssistantMessage[];
type Bubble = { from: "me" | "ai" | "note"; text: string; reportId?: string };

/**
 * The ASAS Assistant drawer: a chat that collects a daily report and prepares it.
 * The prepared report is shown as a card; nothing is saved until the person presses Submit.
 */
export function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();
  const { canManage, ready } = useReports();
  const [history, setHistory] = useState<History>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState<AssistantDraft | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [bubbles, draft, busy]);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  async function send(message: string) {
    const clean = message.trim();
    if (!clean || busy) return;
    setText("");
    setError("");
    setBusy(true);
    setBubbles((current) => [...current, { from: "me", text: clean }]);
    try {
      const result = await assistantTurn(await getToken(), locale, history, clean);
      if (!result.ok) {
        setError(t(result.error));
        return;
      }
      setHistory(result.messages);
      if (result.reply) setBubbles((current) => [...current, { from: "ai", text: result.reply }]);
      if (result.draft) setDraft(result.draft);
    } catch {
      setError(t("ai.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!draft || busy) return;
    setBusy(true);
    setError("");
    try {
      const { projectCode: _code, ...input } = draft;
      void _code;
      const result = await createProjectReport(await getToken(), input);
      if (!result.ok) {
        setError(t(result.error));
        return;
      }
      setDraft(null);
      setBubbles((current) => [...current, { from: "note", text: t("ai.submitted", { project: draft.projectEn, date: draft.date }), reportId: result.id }]);
      // Tell the assistant on the next turn that this report is saved
      setHistory((current) => [...current, { role: "user", content: `(The ${draft.date} report for ${draft.projectEn} was submitted and saved.)` }]);
    } catch {
      setError(t("ai.failed"));
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setHistory([]);
    setBubbles([]);
    setDraft(null);
    setError("");
  }

  const title = (en: string, ar: string) => (locale === "ar" ? ar || en : en || ar);

  return (
    <aside className={`drawer drawer--dark ai-panel${open ? " is-open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="ai-title" inert={!open}>
      <div className="between">
        <div className="hstack" style={{ color: "var(--champagne)" }}>
          <Icon name="spark" className="icon icon--lg" />
          <h2 id="ai-title" style={{ fontSize: 18, color: "#F2F2F2" }}>{t("ai.title")}</h2>
        </div>
        <div className="hstack">
          {bubbles.length > 0 ? <button type="button" className="ai-panel__new" onClick={restart}>{t("ai.newChat")}</button> : null}
          <button type="button" className="close" style={{ background: "#262627", color: "var(--steel)" }} aria-label={t("common.close")} onClick={onClose}>
            <Icon name="x" className="icon icon--sm" />
          </button>
        </div>
      </div>

      <div className="ai-panel__list" ref={list} aria-live="polite">
        {ready && !canManage ? <p className="ai-bubble ai-bubble--ai">{t("ai.noAccess")}</p> : null}
        {canManage && bubbles.length === 0 ? (
          <>
            <p className="ai-bubble ai-bubble--ai">{t("ai.welcome")}</p>
            <div className="ai-panel__chips">
              {(["s1", "s2", "s3"] as const).map((id) => (
                <button key={id} type="button" className="chip ai-chip" onClick={() => void send(t(`ai.${id}`))}>{t(`ai.${id}`)}</button>
              ))}
            </div>
          </>
        ) : null}
        {bubbles.map((bubble, i) => (
          <div key={i} className={`ai-bubble ai-bubble--${bubble.from}`} dir="auto">
            {bubble.text}
            {bubble.reportId ? <> <Link href={`/reports/${bubble.reportId}`} onClick={onClose}>{t("ai.openReport")}</Link></> : null}
          </div>
        ))}
        {busy ? <div className="ai-bubble ai-bubble--ai ai-bubble--typing" aria-label={t("ai.thinking")}><i /><i /><i /></div> : null}

        {draft ? (
          <div className="ai-draft">
            <div className="between">
              <b>{t("ai.draftTitle")}</b>
              <span className="badge badge--warn">{t("ai.notSaved")}</span>
            </div>
            <div className="ai-draft__kv"><span>{t("rep.project")}</span><b>{title(draft.projectEn, draft.projectAr)} <bdi className="num">· {draft.projectCode}</bdi></b></div>
            <div className="ai-draft__kv"><span>{t("rep.date")}</span><bdi className="num">{draft.date}</bdi></div>
            <div className="ai-draft__kv"><span>{t("rep.service")}</span><span>{t(`svc.${draft.service}`)}</span></div>
            <div className="ai-draft__kv"><span>{t("rep.workers")}</span><bdi className="num">{draft.workers}</bdi></div>
            <div className="ai-draft__kv"><span>{t("rep.progress")}</span><bdi className="num">{draft.progress}%</bdi></div>
            {draft.weather ? <div className="ai-draft__kv"><span>{t("rep.weather")}</span><span>{draft.weather}</span></div> : null}
            {draft.subcontractors ? <div className="ai-draft__kv"><span>{t("rep.subs")}</span><span>{draft.subcontractors}</span></div> : null}
            {draft.items.length > 0 ? (
              <ul className="ai-draft__items">
                {draft.items.map((item, i) => (
                  <li key={i}><span>{item.area} · {item.work}</span><bdi className="num">{item.done}% · {t(`wi.${item.status}`)}</bdi></li>
                ))}
              </ul>
            ) : null}
            {draft.issues ? <p className="ai-draft__issues"><b>{t("rep.issues")}:</b> {draft.issues}</p> : null}
            <div className="hstack" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn btn--ghost btn--sm ai-draft__ghost" onClick={() => input.current?.focus()}>{t("ai.change")}</button>
              <button type="button" className="btn btn--primary btn--sm ai-draft__submit" disabled={busy} onClick={() => void submit()}>{t("ai.submit")}</button>
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="ai-panel__error" role="alert">{error}</p> : null}
      <form
        className="ai-panel__form"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text);
        }}
      >
        <textarea
          ref={input}
          rows={1}
          dir="auto"
          value={text}
          disabled={!canManage}
          placeholder={t("ai.ask")}
          aria-label={t("ai.ask")}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(text);
            }
          }}
        />
        <button type="submit" className="ai-panel__send" disabled={!canManage || busy || !text.trim()} aria-label={t("ai.send")}>
          <Icon name="send" className="icon icon--sm" />
        </button>
      </form>
      <small style={{ color: "var(--steel)", textAlign: "center" }}>{t("ai.note")}</small>
    </aside>
  );
}
