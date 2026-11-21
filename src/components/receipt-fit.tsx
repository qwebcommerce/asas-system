"use client";

import { useEffect, useRef } from "react";

/** The voucher's width in CSS pixels (842pt). */
const VOUCHER_PX = 842 * (4 / 3);

/**
 * Shows the fixed-size voucher whole on narrow screens (phones open the client's link
 * from WhatsApp) by zooming it down to the available width. Printing is unaffected
 * (one landscape A4 page).
 */
export function ReceiptFit({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    const fit = () => {
      const scale = Math.min(1, box.clientWidth / VOUCHER_PX);
      content.style.setProperty("--rv-zoom", String(Math.max(scale, 0.2)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="rv-wrap" ref={outer}>
      {/* Pages that show a voucher print in landscape: overrides the system's default A4 portrait page */}
      <style>{"@media print { @page { size: A4 landscape; margin: 0; } }"}</style>
      <div className="rv-fit" ref={inner}>{children}</div>
    </div>
  );
}
