"use client";

import { useEffect } from "react";

/** Counts a number up from 0 (e.g. "10+"), as in the design's statistics. */
function countUp(el: HTMLElement) {
  const end = Number.parseInt(el.dataset.count ?? "", 10);
  if (!Number.isFinite(end)) return;
  const suffix = el.dataset.suffix ?? "";
  let start: number | null = null;
  const step = (time: number) => {
    start ??= time;
    const progress = Math.min(1, (time - start) / 1400);
    el.textContent = `${Math.round(end * (1 - Math.pow(1 - progress, 3)))}${suffix}`;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * Scroll effects of the public site: fades `.reveal` sections in, draws the step bars and the
 * About timeline (`.steps__list`, `.track`), and counts up `[data-count]` numbers.
 * Rendered at the end of each page so it runs only after that page has hydrated.
 */
export function SiteEffects() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-in), .track, .steps__list, [data-count]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.classList.add("is-in");
          if (el.dataset.count && !reduced) countUp(el);
          io.unobserve(el);
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
