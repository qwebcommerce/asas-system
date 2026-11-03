export function Card({
  children,
  flush = false,
  dark = false,
  className = "",
}: {
  children: React.ReactNode;
  flush?: boolean;
  dark?: boolean;
  className?: string;
}) {
  return <div className={`card${flush ? " card--flush" : ""}${dark ? " card--dark" : ""} ${className}`}>{children}</div>;
}

export function Kpi({
  label,
  value,
  note,
  noteTone,
  dark = false,
}: {
  label: string;
  value: string;
  note: string;
  noteTone?: "ok" | "warn" | "danger";
  dark?: boolean;
}) {
  return (
    <div className={`card kpi${dark ? " card--dark" : ""}`}>
      <span className="label">{label}</span>
      <span className="value num">{value}</span>
      <span className={`note${noteTone ? ` note--${noteTone}` : ""}`}>{note}</span>
    </div>
  );
}

export function AiNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ai">
      <svg className="icon" aria-hidden="true">
        <use href="#i-spark" />
      </svg>
      <div>
        <b>{title}</b>
        {children}
      </div>
    </div>
  );
}

export function Banner({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="banner">
      <span className="circle">
        <svg className="icon" aria-hidden="true">
          <use href="#i-spark" />
        </svg>
      </span>
      <div className="grow">
        <b>{title}</b>
        <p>{children}</p>
      </div>
      {action}
    </div>
  );
}
