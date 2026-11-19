/* Inline SVG icons used by the public website. All use the shared `.arrow` stroke style. */

export function ArrowIcon() {
  return (
    <svg className="arrow" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5 11 11 5M6 5h5v5" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

export function DocIcon() {
  return (
    <svg className="arrow" viewBox="0 0 20 20" style={{ color: "var(--silver-2)" }} aria-hidden="true">
      <path d="M5 2h7l4 4v12H5zM12 2v4h4M8 10h6M8 13h6" />
    </svg>
  );
}

export function LongArrowIcon() {
  return (
    <svg className="arrow doc__arrow" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

/** Round icon inside a `.pill` button */
export function PillIcon() {
  return (
    <span className="pill__icon">
      <ArrowIcon />
    </span>
  );
}
