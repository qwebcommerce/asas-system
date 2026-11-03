export function Avatar({ children, size = "md" }: { children: React.ReactNode; size?: "md" | "lg" | "xl" }) {
  return <span className={`avatar${size === "lg" ? " avatar--lg" : size === "xl" ? " avatar--xl" : ""}`}>{children}</span>;
}

export function ListRow({
  leading,
  title,
  detail,
  action,
}: {
  leading: React.ReactNode;
  title: React.ReactNode;
  detail?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="list-row">
      {leading}
      <div className="grow">
        <b>{title}</b>
        {detail ? <small>{detail}</small> : null}
      </div>
      {action}
    </div>
  );
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="tab"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Steps({
  items,
}: {
  items: { title: string; detail: string; state: "done" | "current" | "todo" }[];
}) {
  return (
    <div className="steps">
      {items.map((item, index) => (
        <div key={item.title} style={{ display: "contents" }}>
          {index > 0 ? <span className="step-line" /> : null}
          <div className={`step${item.state === "current" ? " step--current" : item.state === "todo" ? " step--todo" : ""}`}>
            <span className="n">{index + 1}</span>
            <span>
              <b>{item.title}</b>
              <small>{item.detail}</small>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Bars({
  items,
}: {
  items: { label: string; value: string; height: number; tone?: "now" | "weekend" }[];
}) {
  return (
    <div className="bars">
      {items.map((item) => (
        <div key={item.label} className={`bar${item.tone ? ` bar--${item.tone}` : ""}`}>
          <span className="num">{item.value}</span>
          <i style={{ height: item.height }} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function BulkBar({ children }: { children: React.ReactNode }) {
  return <div className="bulk">{children}</div>;
}

export function Paper({ children }: { children: React.ReactNode }) {
  return (
    <div className="paper">
      <div className="sheet">{children}</div>
    </div>
  );
}
