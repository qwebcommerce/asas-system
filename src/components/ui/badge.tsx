type Tone = "ok" | "warn" | "danger" | "info" | "neutral" | "accent";

export function Badge({ tone, children, plain = false }: { tone: Tone; children: React.ReactNode; plain?: boolean }) {
  return <span className={`badge badge--${tone}${plain ? " badge--plain" : ""}`}>{children}</span>;
}

export function Chip({
  pressed = false,
  ai = false,
  children,
  onClick,
}: {
  pressed?: boolean;
  ai?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={`chip${ai ? " chip--ai" : ""}`} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

export function Level({ kind, children }: { kind: "full" | "view" | "own" | "request" | "none"; children: React.ReactNode }) {
  return <span className={`level level--${kind}`}>{children}</span>;
}
