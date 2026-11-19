"use client";

import { useState } from "react";

type Option = { key: string; label: string };

/**
 * Single-choice filter. Shows only elements with a matching `data-cat` inside `scope`
 * (a CSS selector), like the Blogs and Documents filters of the static site.
 */
export function FilterButtons({
  options,
  scope,
  buttonClass,
  label,
  list = false,
}: {
  options: Option[];
  scope: string;
  buttonClass: string;
  label: string;
  /** Render as <ul><li> (Documents sidebar) instead of a plain group (Blogs) */
  list?: boolean;
}) {
  const [active, setActive] = useState("all");

  function choose(key: string) {
    setActive(key);
    document.querySelectorAll<HTMLElement>(`${scope} [data-cat]`).forEach((item) => {
      item.hidden = !(key === "all" || item.dataset.cat === key);
    });
  }

  const buttons = options.map((option) => {
    const button = (
      <button
        key={option.key}
        type="button"
        className={buttonClass}
        aria-pressed={active === option.key}
        onClick={() => choose(option.key)}
      >
        {option.label}
      </button>
    );
    return list ? <li key={option.key}>{button}</li> : button;
  });

  return list ? (
    <ul role="group" aria-label={label}>
      {buttons}
    </ul>
  ) : (
    <div className="filters" role="group" aria-label={label}>
      {buttons}
    </div>
  );
}
