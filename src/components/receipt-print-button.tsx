"use client";

import { Icon } from "@/components/icon";

export function ReceiptPrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn btn--primary" onClick={() => window.print()}>
      <Icon name="download" />
      {label}
    </button>
  );
}
