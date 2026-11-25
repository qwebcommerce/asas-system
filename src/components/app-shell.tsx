"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AssistantPanel } from "@/components/assistant-panel";
import { useAuth } from "@/components/auth-provider";
import Image from "next/image";
import { Icon } from "@/components/icon";
import { LanguageSwitch } from "@/components/language-switch";
import { ThemeToggle } from "@/components/theme";
import { usePermissions } from "@/components/permissions-provider";
import { useDocuments } from "@/components/use-documents";
import { moduleVisible, type MatrixModule } from "@/lib/access";
import { initials } from "@/lib/directory";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

const workspace = [
  { id: "overview", href: "/overview", icon: "grid" },
  { id: "projects", href: "/projects", icon: "home" },
  { id: "users", href: "/users", icon: "users" },
  { id: "hr", href: "/hr", icon: "brief" },
  { id: "reports", href: "/reports", icon: "report" },
  { id: "offers", href: "/offers", icon: "ruler" },
  { id: "documents", href: "/documents", icon: "folder" },
  { id: "accounting", href: "/accounting", icon: "wallet" },
  { id: "payroll", href: "/payroll", icon: "card" },
  { id: "website", href: "/website", icon: "globe" },
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
  const { expiring, canView: canViewDocuments } = useDocuments();
  const { level } = usePermissions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const isSuperAdmin = profile?.role === "superAdmin";

  useEffect(() => {
    if (ready && configured && !user) router.replace("/sign-in");
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
            {/* Official silver logo (transparent PNG made from the brand artwork) */}
            <Link href="/overview" className="brand-link" onClick={() => setMenuOpen(false)}>
              <Image className="brand-logo" src="/asas-logo-silver.png" alt="ASAS EXECUTION" width={247} height={409} priority unoptimized />
            </Link>
          </div>
          <div className="nav-label">{t("nav.workspace")}</div>
          <nav>
            {workspace.filter((item) => item.id === "overview" || moduleVisible(item.id as MatrixModule, level(item.id as MatrixModule))).map((item) => (
              <NavItem
                key={item.id}
                href={item.href}
                icon={item.icon}
                label={t(`nav.${item.id}`)}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
            {canViewDocuments ? (
              <NavItem
                href="/notifications"
                icon="bell"
                label={t("nav.notifications")}
                count={expiring.length}
                active={pathname === "/notifications" || pathname.startsWith("/notifications/")}
                onNavigate={() => setMenuOpen(false)}
              />
            ) : null}
          </nav>
          <div className="nav-label">{t("nav.assist")}</div>
          {isSuperAdmin ? (
            <button type="button" className="nav-item" onClick={() => setAiOpen(true)}>
              <Icon name="mail" />
              <span>{t("nav.ai")}</span>
            </button>
          ) : null}
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
                void signOutUser().then(() => router.replace("/sign-in"));
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
            {isSuperAdmin ? (
              <button
                type="button"
                className="icon-btn icon-btn--ai"
                aria-label={t("top.ai")}
                onClick={() => setAiOpen(true)}
              >
                <Icon name="spark" />
              </button>
            ) : null}
            {canViewDocuments ? (
              <Link href="/notifications" className="icon-btn" aria-label={t("top.notifications")}>
                <Icon name="bell" />
                {expiring.length > 0 ? <span className="dot" /> : null}
              </Link>
            ) : null}
          </header>
          <main className="content">{children}</main>
        </div>
      </div>
      {/* Email assistant: Super Admins only (the report assistant lives on the Project reports page) */}
      {isSuperAdmin ? <AssistantPanel mode="email" open={aiOpen} onClose={() => setAiOpen(false)} /> : null}
      <div className={`overlay${menuOpen ? " is-open" : ""}`} onClick={() => setMenuOpen(false)} />
    </>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  count,
  onNavigate,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  count?: number;
  onNavigate: () => void;
}) {
  const locale = useLocale();
  const content = (
    <>
      <Icon name={icon} />
      <span>{label}</span>
      {count === undefined ? null : (
        <bdi className={`nav-count num${count > 0 ? " is-live" : ""}`}>
          {new Intl.NumberFormat(locale, { numberingSystem: "latn" }).format(count)}
        </bdi>
      )}
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
