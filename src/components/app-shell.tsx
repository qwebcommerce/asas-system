"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { LanguageSwitch } from "@/components/language-switch";
import { ThemeToggle } from "@/components/theme";
import { initials } from "@/lib/directory";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

const workspace = [
  { id: "overview", href: "/overview", icon: "grid" },
  { id: "users", href: "/users", icon: "users" },
  { id: "hr", href: "/hr", icon: "brief" },
  { id: "reports", href: "/reports", icon: "report" },
  { id: "offers", href: "/offers", icon: "ruler" },
  { id: "documents", href: "/documents", icon: "folder" },
  { id: "accounting", href: "/accounting", icon: "wallet" },
  { id: "payroll", href: "/payroll", icon: "card" },
  { id: "email", href: "/email", icon: "mail" },
] as const;

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { ready, configured, user, profile, signOutUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (ready && configured && !user) router.replace("/");
  }, [configured, ready, router, user]);

  if (!ready || (configured && user && !profile)) return null;
  if (!configured) {
    return (
      <main className="content">
        <p>{t("auth.notConfigured")}</p>
      </main>
    );
  }
  if (!profile) return null;

  return (
    <>
      <div className="app">
        <aside className={`sidebar${menuOpen ? " is-open" : ""}`} id="sidebar" aria-label="Main">
          <div className="brand">
            <svg aria-hidden="true">
              <use href="#i-logo" />
            </svg>
            <div>
              <b>ASAS</b>
              <small>{t("brand.execution")}</small>
            </div>
          </div>
          <div className="nav-label">{t("nav.workspace")}</div>
          <nav>
            {workspace.map((item) => (
              <NavItem
                key={item.id}
                href={item.href}
                icon={item.icon}
                label={t(`nav.${item.id}`)}
                active={pathname === item.href}
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
          </nav>
          <div className="nav-label">{t("nav.assist")}</div>
          <button type="button" className="nav-item" onClick={() => setAiOpen(true)}>
            <Icon name="spark" />
            <span>{t("nav.ai")}</span>
          </button>
          <NavItem
            href="/settings"
            icon="shield"
            label={t("nav.settings")}
            active={pathname === "/settings"}
            onNavigate={() => setMenuOpen(false)}
          />
          <div className="spacer" />
          <div className="me">
            <span className="avatar">{initials(profile.name)}</span>
            <div className="grow">
              <b>{profile.name}</b>
              <small>{t(`role.${profile.role}`)}</small>
            </div>
            <button
              type="button"
              className="icon-btn"
              style={{ background: "transparent", border: 0, color: "var(--steel)" }}
              aria-label={t("nav.signOut")}
              onClick={() => {
                void signOutUser().then(() => router.replace("/"));
              }}
            >
              <Icon name="logout" className="icon icon--flip" />
            </button>
          </div>
        </aside>
        <div className="main">
          <header className="topbar">
            <button
              type="button"
              className="menu-btn"
              aria-label={t("top.menu")}
              onClick={() => setMenuOpen(true)}
            >
              <Icon name="menu" className="icon icon--lg" />
            </button>
            <h1>{title}</h1>
            <label className="search">
              <Icon name="search" className="icon icon--sm" />
              <input type="search" placeholder={t("top.search")} />
            </label>
            <LanguageSwitch />
            <ThemeToggle />
            <button
              type="button"
              className="icon-btn icon-btn--ai"
              aria-label={t("top.ai")}
              onClick={() => setAiOpen(true)}
            >
              <Icon name="spark" />
            </button>
            <button type="button" className="icon-btn" aria-label={t("top.notifications")}>
              <Icon name="bell" />
              <span className="dot" />
            </button>
          </header>
          <main className="content">{children}</main>
        </div>
      </div>
      <aside
        className={`drawer drawer--dark${aiOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-title"
      >
        <div className="between">
          <div className="hstack" style={{ color: "var(--champagne)" }}>
            <Icon name="spark" className="icon icon--lg" />
            <h2 id="ai-title" style={{ fontSize: 18, color: "#F2F2F2" }}>
              {t("ai.title")}
            </h2>
          </div>
          <button
            type="button"
            className="close"
            style={{ background: "#262627", color: "var(--steel)" }}
            aria-label={t("common.close")}
            onClick={() => setAiOpen(false)}
          >
            <Icon name="x" className="icon icon--sm" />
          </button>
        </div>
        <div
          style={{
            alignSelf: "flex-end",
            maxWidth: "80%",
            background: "var(--champagne)",
            color: "var(--onyx)",
            padding: "12px 14px",
            borderRadius: "16px 16px 4px 16px",
          }}
        >
          {t("ai.q1")}
        </div>
        <div
          style={{
            maxWidth: "90%",
            background: "#262627",
            padding: "12px 14px",
            borderRadius: "16px 16px 16px 4px",
            color: "var(--mist)",
          }}
        >
          {t("ai.a1")}
        </div>
        <div className="hstack">
          {(["s1", "s2", "s3"] as const).map((id) => (
            <button
              key={id}
              type="button"
              className="chip"
              style={{ background: "transparent", borderColor: "#3A3A3B", color: "var(--silver)" }}
            >
              {t(`ai.${id}`)}
            </button>
          ))}
        </div>
        <div style={{ marginTop: "auto" }} className="stack stack--sm">
          <label className="search" style={{ width: "100%", height: 52, background: "#262627", borderColor: "#333334" }}>
            <Icon name="spark" className="icon icon--sm" />
            <input placeholder={t("ai.ask")} />
          </label>
          <small style={{ color: "var(--steel)", textAlign: "center" }}>{t("ai.note")}</small>
        </div>
      </aside>
      <div
        className={`overlay${menuOpen || aiOpen ? " is-open" : ""}`}
        onClick={() => {
          setMenuOpen(false);
          setAiOpen(false);
        }}
      />
    </>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  onNavigate,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  const content = (
    <>
      <Icon name={icon} />
      <span>{label}</span>
    </>
  );

  if (!href) {
    return (
      <span className="nav-item" style={{ cursor: "default" }}>
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className="nav-item" aria-current={active ? "page" : undefined} onClick={onNavigate}>
      {content}
    </Link>
  );
}
