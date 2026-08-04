"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "@/components/UserMenu";

const NAV_ITEMS = [
  { href: "/relatorios-quantitativos", label: "Indicadores" },
  { href: "/clipping", label: "Clipping" },
  { href: "/", label: "Home" },
  { href: "/nova-demanda", label: "Nova demanda" },
  { href: "/demandas", label: "Demandas" },
  { href: "/calendario-editorial", label: "Calendário" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/configuracoes", label: "Configurações" },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header style={header}>
      <div style={headerRow}>
        <Link href="/" style={brand} className="sg-interactive sg-brand-hover">
          <div style={brandIcon}>S</div>

          <div style={brandText}>
            <strong style={brandTitle}>ASCOM STACASA</strong>
            <p style={brandSubtitle}>Gestão da Comunicação</p>
          </div>
        </Link>

        <div style={rightSpace}>
          <UserMenu />
        </div>
      </div>

      <div style={navWrap} className="sg-nav-scroll">
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
                style={{
                  ...linkStyle,
                  ...(ativo ? linkStyleAtivo : null),
                }}
                className="sg-interactive sg-nav-link"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

const header = {
  position: "sticky" as const,
  top: 0,
  zIndex: 30,
  display: "grid",
  gap: "10px",
  padding: "14px 22px 12px",
  background:
    "linear-gradient(180deg, rgba(69,10,10,.92), rgba(127,29,29,.86), rgba(127,29,29,.72))",
  borderBottom: "1px solid var(--sg-header-border)",
  boxShadow: "0 10px 30px rgba(0,0,0,.28)",
  backdropFilter: "blur(16px)",
};

const headerRow = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "16px",
};

const brand = {
  display: "inline-flex",
  alignItems: "center",
  gap: "12px",
  color: "var(--sg-text-primary)",
  textDecoration: "none",
  width: "fit-content",
};

const brandIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  background: "var(--sg-brand-icon-bg)",
  border: "1px solid rgba(255,255,255,0.22)",
  display: "grid",
  placeItems: "center",
  fontWeight: 800,
  fontSize: "20px",
  boxShadow: "0 10px 18px rgba(0,0,0,.18)",
};

const brandText = {
  display: "grid",
  gap: "2px",
};

const brandTitle = {
  fontSize: "18px",
  lineHeight: "20px",
};

const brandSubtitle = {
  margin: 0,
  color: "var(--sg-brand-subtitle)",
  fontSize: "12px",
};

const navWrap = {
  overflowX: "auto" as const,
  overflowY: "hidden" as const,
  paddingBottom: "2px",
};

const nav = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  minWidth: "max-content",
};

const rightSpace = {
  minWidth: 0,
};

const linkStyle = {
  color: "var(--sg-nav-chip-text)",
  textDecoration: "none",
  fontSize: "13px",
  padding: "9px 12px",
  borderRadius: "999px",
  background: "var(--sg-nav-chip-bg)",
  border: "1px solid var(--sg-nav-chip-border)",
  whiteSpace: "nowrap" as const,
  fontWeight: 700,
};

const linkStyleAtivo = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.22)",
  color: "#ffffff",
  boxShadow: "0 10px 20px rgba(0,0,0,.16)",
};
