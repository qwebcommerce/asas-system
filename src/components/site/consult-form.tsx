"use client";

import { FormEvent, useState } from "react";
import { DEFAULT_DISCIPLINES, DISCIPLINES, type Discipline } from "./content";
import { PillIcon } from "./icons";

export type ConsultFormText = {
  label: string;
  name: string;
  namePh: string;
  phone: string;
  phonePh: string;
  help: string;
  project: string;
  projectPh: string;
  submit: string;
  sending: string;
  note: string;
  thanks: string;
  invalid: string;
  failed: string;
  disciplines: Record<Discipline, string>;
};

type State = "idle" | "sending" | "sent" | "invalid" | "error";

/** Consultation request form. Sends to /api/consultations, which stores it in Firestore. */
export function ConsultForm({
  text,
  locale,
  source,
  className,
}: {
  text: ConsultFormText;
  locale: string;
  source: "hero" | "contact";
  className: string;
}) {
  const [selected, setSelected] = useState<Discipline[]>(DEFAULT_DISCIPLINES);
  const [state, setState] = useState<State>("idle");

  function toggle(key: Discipline) {
    setSelected((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    if (name.length < 2 || phone.replace(/\D/g, "").length < 6) {
      setState("invalid");
      return;
    }
    setState("sending");
    try {
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          services: selected,
          project: String(data.get("project") ?? ""),
          website: String(data.get("website") ?? ""),
          locale,
          source,
        }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (result?.ok) {
        setState("sent");
        form.reset();
        setSelected(DEFAULT_DISCIPLINES);
      } else {
        setState(result?.error === "invalid" ? "invalid" : "error");
      }
    } catch {
      setState("error");
    }
  }

  const note =
    state === "sent" ? text.thanks : state === "invalid" ? text.invalid : state === "error" ? text.failed : text.note;

  return (
    <form className={className} aria-label={text.label} onSubmit={submit} noValidate>
      <div className="form__row">
        <label className="field">
          <span>{text.name}</span>
          <input type="text" name="name" placeholder={text.namePh} autoComplete="name" required maxLength={120} />
        </label>
        <label className="field">
          <span>{text.phone}</span>
          <input type="tel" name="phone" placeholder={text.phonePh} autoComplete="tel" required maxLength={30} dir="ltr" />
        </label>
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="form__legend">{text.help}</legend>
        <div className="chips">
          {DISCIPLINES.map((key) => (
            <button key={key} type="button" className="chip" aria-pressed={selected.includes(key)} onClick={() => toggle(key)}>
              {text.disciplines[key]}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>{text.project}</span>
        <textarea name="project" placeholder={text.projectPh} maxLength={2000} />
      </label>
      {/* Spam trap: hidden from people, filled in by bots */}
      <label className="form__trap" aria-hidden="true">
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="form__submit">
        <button className="pill pill--silver" type="submit" disabled={state === "sending"}>
          {state === "sending" ? text.sending : text.submit}
          <PillIcon />
        </button>
        <span className="form__note" role="status" data-state={state === "invalid" || state === "error" ? "error" : undefined}>
          {note}
        </span>
      </div>
    </form>
  );
}
