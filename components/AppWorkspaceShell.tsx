"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/relatorios-quantitativos", label: "Indicadores", icon: "◔" },
  { href: "/clipping", label: "Clipping", icon: "◫" },
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/demandas", label: "Demandas", icon: "▤" },
  { href: "/nova-demanda", label: "Nova demanda", icon: "+" },
  { href: "/calendario-editorial", label: "Calendário", icon: "◷" },
  { href: "/relatorios", label: "Relatórios", icon: "≣" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙" },
];

const HIDDEN_ROUTES = ["/login", "/registro"];
const STORAGE_KEY = "sgdc-sidebar-collapsed";

export default function AppWorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved === "0" ? false : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  const hideSidebar = useMemo(
    () => HIDDEN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`)),
    [pathname]
  );

  if (hideSidebar) {
    return <main style={mainSemSidebar}>{children}</main>;
  }

  return (
    <div
      style={{
        ...workspace,
        gridTemplateColumns: collapsed ? "72px minmax(0, 1fr)" : "220px minmax(0, 1fr)",
      }}
    >
      <aside style={sidebar}>
        <div style={sidebarCard}>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="sg-interactive sg-pressable"
            style={toggleButton}
            aria-label={collapsed ? "Expandir navegação" : "Recolher navegação"}
            title={collapsed ? "Expandir navegação" : "Recolher navegação"}
          >
            <span>{collapsed ? "»" : "«"}</span>
            {!collapsed ? <span style={toggleLabel}>Navegação</span> : null}
          </button>

          <nav style={nav}>
            {NAV_ITEMS.map((item) => {
              const ativo =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="sg-interactive sg-sidebar-item"
                  style={{
                    ...navItem,
                    ...(ativo ? navItemAtivo : null),
                    justifyContent: collapsed ? "center" : "flex-start",
                    paddingInline: collapsed ? "0" : "12px",
                  }}
                  title={item.label}
                >
                  <span style={navIcon}>{item.icon}</span>
                  {!collapsed ? <span style={navText}>{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <main style={main}>{children}</main>
    </div>
  );
}

const workspace: CSSProperties = {
  display: "grid",
  gap: "16px",
  alignItems: "start",
  padding: "24px 24px 30px",
};

const sidebar: CSSProperties = {
  minWidth: 0,
  position: "sticky",
  top: "104px",
  alignSelf: "start",
};

const sidebarCard: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "10px",
  borderRadius: "18px",
  background: "linear-gradient(180deg, rgba(10,10,12,0.42), rgba(15,23,42,0.24))",
  border: "1px solid var(--sg-border-strong)",
  boxShadow: "var(--sg-shadow-card)",
};

const toggleButton: CSSProperties = {
  height: "36px",
  borderRadius: "12px",
  border: "1px solid var(--sg-border-soft)",
  background: "var(--sg-button-neutral-bg)",
  color: "var(--sg-text-primary)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
};

const toggleLabel: CSSProperties = {
  color: "var(--sg-text-secondary)",
};

const nav: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const navItem: CSSProperties = {
  minHeight: "42px",
  borderRadius: "14px",
  textDecoration: "none",
  color: "var(--sg-text-muted)",
  border: "1px solid transparent",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const navItemAtivo: CSSProperties = {
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "var(--sg-text-primary)",
  boxShadow: "0 12px 26px rgba(0,0,0,.16)",
};

const navIcon: CSSProperties = {
  width: "20px",
  minWidth: "20px",
  textAlign: "center",
  fontSize: "13px",
  fontWeight: 800,
};

const navText: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const main: CSSProperties = {
  minWidth: 0,
};

const mainSemSidebar: CSSProperties = {
  padding: "24px 24px 30px",
};
