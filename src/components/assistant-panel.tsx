"use client";

import { useEffect, useRef, useState } from "react";
import { fileProblem } from "@/lib/files";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useReports } from "@/components/use-reports";
import { Link } from "@/i18n/navigation";
import { assistantTurn, type AssistantDraft, type AssistantMessage, type AssistantMode } from "@/server/assistant";
import { createProjectReport } from "@/server/reports";

type History = AssistantMessage[];
type Bubble = { from: "me" | "ai" | "note"; text: string; reportId?: string };
/** A proof file kept in the browser until the report is submitted; `url` previews images and PDFs */
type Proof = { key: string; file: File; url: string };

const maxProofs = 10;
const proofTypes = "image/jpeg,image/png,image/webp,application/pdf";

/**
 * An assistant drawer. Two separate assistants use it:
 * - mode "reports" (Project reports page): collects a daily report and prepares it; the prepared
 *   report is shown as a card and nothing is saved until the person presses Submit.
 * - mode "email" (sidebar, Super Admins only): questions about the company mailbox, read-only.
 */
export function AssistantPanel({ mode, open, onClose }: { mode: AssistantMode; open: boolean; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken, profile } = useAuth();
  const { canManage: canReport, ready: reportsReady } = useReports();
  const email = mode === "email";
  // Reports: people who write daily reports. Email: Super Admins only.
  const canManage = email ? profile?.role === "superAdmin" : canReport;
  const ready = email ? Boolean(profile) : reportsReady;
  const chips = email ? (["e1", "e2", "e3"] as const) : (["s1", "r2"] as const);
  const [history, setHistory] = useState<History>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState<AssistantDraft | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Reports: proof photos / documents. Only uploaded after the report is saved on Submit.
  const [proofs, setProofs] = useState<Proof[]>([]);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);

  // Free the preview URLs when the panel goes away
  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function addProofs(files: FileList | null) {
    if (!files?.length) return;
    const added: Proof[] = [];
    let problem = "";
    for (const file of Array.from(files)) {
      const issue = fileProblem(file.type, file.size, file.name);
      if (issue) {
        problem = t(issue);
        continue;
      }
      if (proofs.length + added.length >= maxProofs) {
        problem = t("ai.proofLimit", { count: maxProofs });
        break;
      }
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      added.push({ key: `${Date.now()}-${added.length}-${file.name}`, file, url });
    }
    setProofs((current) => [...current, ...added]);
    setError(problem);
  }

  function removeProof(key: string) {
    setProofs((current) => {
      const gone = current.find((item) => item.key === key);
      if (gone) URL.revokeObjectURL(gone.url);
      return current.filter((item) => item.key !== key);
    });
  }

  function clearProofs() {
    setProofs((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
  }

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
      const result = await assistantTurn(await getToken(), mode, locale, history, clean, email ? [] : proofs.map((item) => item.file.name));
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
    if (proofs.length === 0) {
      setError(t("ai.needProof"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { projectCode: _code, ...input } = draft;
      void _code;
      const token = await getToken();
      const result = await createProjectReport(token, input);
      if (!result.ok || !result.id) {
        setError(t(result.ok ? "ai.failed" : result.error));
        return;
      }
      // The report is saved; now upload its proof files
      const failed: string[] = [];
      for (const item of proofs) {
        try {
          const body = new FormData();
          body.set("token", token);
          body.set("purpose", "report");
          body.set("reportId", result.id);
          body.set("name", item.file.name);
          body.set("file", item.file);
          const response = await fetch("/api/hr/files", { method: "POST", body });
          const payload = (await response.json()) as { ok: boolean };
          if (!payload.ok) failed.push(item.file.name);
        } catch {
          failed.push(item.file.name);
        }
      }
      const sent = proofs.length - failed.length;
      clearProofs();
      setDraft(null);
      setBubbles((current) => [
        ...current,
        { from: "note", text: t("ai.submitted", { project: draft.projectEn, date: draft.date }) + " " + t("ai.proofSaved", { count: sent }), reportId: result.id },
        ...(failed.length ? [{ from: "note" as const, text: t("ai.proofFailed", { files: failed.join(", ") }), reportId: result.id }] : []),
      ]);
      // Tell the assistant on the next turn that this report is saved
      setHistory((current) => [...current, { role: "user", content: `(The ${draft.date} report for ${draft.projectEn} was submitted and saved with ${sent} proof file(s).)` }]);
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
    clearProofs();
  }

  const title = (en: string, ar: string) => (locale === "ar" ? ar || en : en || ar);

  const titleId = `ai-title-${mode}`;

  return (
    <>
    <div className={`overlay${open ? " is-open" : ""}`} onClick={onClose} aria-hidden="true" />
    <aside className={`drawer drawer--dark ai-panel${open ? " is-open" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} inert={!open}>
      <div className="between">
        <div className="hstack" style={{ color: "var(--champagne)" }}>
          <Icon name="spark" className="icon icon--lg" />
          <h2 id={titleId} style={{ fontSize: 18, color: "#F2F2F2" }}>{t(email ? "ai.titleMail" : "ai.titleReports")}</h2>
        </div>
        <div className="hstack">
          {bubbles.length > 0 ? <button type="button" className="ai-panel__new" onClick={restart}>{t("ai.newChat")}</button> : null}
          <button type="button" className="close" style={{ background: "#262627", color: "var(--steel)" }} aria-label={t("common.close")} onClick={onClose}>
            <Icon name="x" className="icon icon--sm" />
          </button>
        </div>
      </div>

      <div className="ai-panel__list" ref={list} aria-live="polite">
        {ready && !canManage ? <p className="ai-bubble ai-bubble--ai">{t(email ? "ai.mailOnlyAdmin" : "ai.noAccess")}</p> : null}
        {canManage && bubbles.length === 0 ? (
          <>
            <p className="ai-bubble ai-bubble--ai">{t(email ? "ai.welcomeMail" : "ai.welcome")}</p>
            <div className="ai-panel__chips">
              {chips.map((id) => (
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
            <div className="ai-draft__kv"><span>{t("ai.proof")}</span><b>{proofs.length ? t("ai.proofCount", { count: proofs.length }) : <span className="ai-draft__missing">{t("ai.proofMissing")}</span>}</b></div>
            {proofs.length ? <ProofStrip proofs={proofs} onRemove={removeProof} light /> : null}
            <div className="hstack" style={{ justifyContent: "flex-end" }}>
              {proofs.length === 0 ? <button type="button" className="btn btn--ghost btn--sm ai-draft__ghost" onClick={() => picker.current?.click()}><Icon name="camera" className="icon icon--sm" />{t("ai.attach")}</button> : null}
              <button type="button" className="btn btn--ghost btn--sm ai-draft__ghost" onClick={() => input.current?.focus()}>{t("ai.change")}</button>
              <button type="button" className="btn btn--primary btn--sm ai-draft__submit" disabled={busy || proofs.length === 0} onClick={() => void submit()}>{t("ai.submit")}</button>
            </div>
            <small className="ai-draft__hint">{t("ai.uploadOnSubmit")}</small>
          </div>
        ) : null}
      </div>

      {error ? <p className="ai-panel__error" role="alert">{error}</p> : null}
      {!email && !draft && proofs.length ? <ProofStrip proofs={proofs} onRemove={removeProof} /> : null}
      <form
        className="ai-panel__form"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text);
        }}
      >
        {!email ? (
          <>
            <input
              ref={picker}
              type="file"
              accept={proofTypes}
              multiple
              hidden
              onChange={(event) => {
                addProofs(event.target.files);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="ai-panel__attach"
              disabled={!canManage || busy || proofs.length >= maxProofs}
              aria-label={t("ai.attach")}
              title={t("ai.attachHint")}
              onClick={() => picker.current?.click()}
            >
              <Icon name="camera" className="icon icon--sm" />
              {proofs.length ? <span className="ai-panel__attach-count num">{proofs.length}</span> : null}
            </button>
          </>
        ) : null}
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
      <small style={{ color: "var(--steel)", textAlign: "center" }}>{t(email ? "ai.noteMail" : "ai.note")}</small>
    </aside>
    </>
  );
}

/** Thumbnails of the attached proof files: images show the picture, PDFs a document tile. Both open in a new tab. */
function ProofStrip({ proofs, onRemove, light = false }: { proofs: Proof[]; onRemove: (key: string) => void; light?: boolean }) {
  const t = useTranslations();
  return (
    <ul className={`ai-proofs${light ? " ai-proofs--light" : ""}`} aria-label={t("ai.proof")}>
      {proofs.map((item) => {
        const image = item.file.type.startsWith("image/");
        return (
          <li key={item.key} className="ai-proof">
            <a href={item.url} target="_blank" rel="noreferrer" title={item.file.name}>
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview of a file that isn't uploaded yet
                <img src={item.url} alt={item.file.name} />
              ) : (
                <span className="ai-proof__doc"><Icon name="report" /><small>PDF</small></span>
              )}
            </a>
            <span className="ai-proof__name" dir="auto">{item.file.name}</span>
            <button type="button" className="ai-proof__remove" aria-label={t("ai.removeProof", { name: item.file.name })} onClick={() => onRemove(item.key)}>
              <Icon name="x" className="icon icon--sm" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
