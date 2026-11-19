"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PhoneIcon, PillIcon } from "./icons";

type NavLink = { href: string; label: string; current: boolean };

/**
 * Menu button + slide-in drawer for tablets and phones (shown below 1024px wide).
 * Holds the page links, the language switch, the phone number and the consultation button.
 */
export function MobileNav({
  links,
  language,
  phone,
  cta,
  labels,
}: {
  links: NavLink[];
  language: { current: string; other: string; otherHref: string; otherLang: string };
  phone: { href: string; label: string };
  cta: { href: string; label: string };
  labels: { open: string; close: string; menu: string; language: string };
}) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = toggle.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const wide = window.matchMedia("(min-width: 1025px)");
    const onWide = () => wide.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
      opener?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={toggle}
        type="button"
        className="nav-toggle"
        aria-label={labels.open}
        aria-expanded={open}
        aria-controls="site-drawer"
        onClick={() => setOpen(true)}
      >
        <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </button>

      <div className={`site-drawer__veil${open ? " is-open" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        id="site-drawer"
        className={`site-drawer${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={labels.menu}
        inert={!open}
      >
        <div className="site-drawer__head">
          <span className="label">{labels.menu}</span>
          <button ref={close} type="button" className="site-drawer__close" aria-label={labels.close} onClick={() => setOpen(false)}>
            <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <nav className="site-drawer__links">
          {links.map((link, i) => (
            <Link key={link.href} href={link.href} aria-current={link.current ? "page" : undefined} onClick={() => setOpen(false)}>
              <small>{String(i + 1).padStart(2, "0")}</small>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="site-drawer__foot">
          <div className="site-drawer__lang" role="group" aria-label={labels.language}>
            <span aria-current="true">{language.current}</span>
            <a className="alt" href={language.otherHref} lang={language.otherLang} hrefLang={language.otherLang}>{language.other}</a>
          </div>
          <a className="phone" href={phone.href} dir="ltr">
            <PhoneIcon />
            {phone.label}
          </a>
          <Link className="pill pill--silver" href={cta.href} onClick={() => setOpen(false)}>
            {cta.label}
            <PillIcon />
          </Link>
        </div>
      </div>
    </>
  );
}
