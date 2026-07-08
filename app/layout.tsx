import type { Metadata } from "next";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import AuthProvider from "@/components/AuthProvider";
import UserMenu from "@/components/UserMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASCOM STACASA",
  description: "Sistema de Gestão de Demandas da Comunicação",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning data-theme="dark">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var saved=localStorage.getItem("sgdc-theme");var theme=saved==="light"||saved==="dark"?saved:"dark";document.documentElement.setAttribute("data-theme",theme);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`,
          }}
        />
        <AuthProvider>
          <div style={container}>
            <header style={header}>
              <Link href="/" style={brand}>
                <div style={brandIcon}>S</div>

                <div>
                  <strong style={brandTitle}>ASCOM STACASA</strong>
                  <p style={brandSubtitle}>Gestão da Comunicação</p>
                </div>
              </Link>

              <nav style={nav}>
                <Link href="/relatorios-quantitativos" style={linkStyle}>
                  Indicadores
                </Link>
                <Link href="/" style={linkStyle}>
                  Dashboard
                </Link>
                <Link href="/nova-demanda" style={linkStyle}>
                  Nova Demanda
                </Link>
                <Link href="/demandas" style={linkStyle}>
                  Demandas
                </Link>
                <Link href="/calendario-editorial" style={linkStyle}>
                  Calendário
                </Link>
                <Link href="/relatorios" style={linkStyle}>
                  Relatórios
                </Link>
                <Link href="/configuracoes" style={linkStyle}>
                  Configurações
                </Link>
              </nav>

              <div style={rightSpace}>
                <UserMenu />
              </div>
            </header>

            <main style={main}>
              <AuthGate>{children}</AuthGate>
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

const container = {
  minHeight: "100vh",
  background: "var(--sg-layout-bg)",
  color: "var(--sg-text-primary)",
};

const header = {
  minHeight: "76px",
  background: "var(--sg-header-bg)",
  borderBottom: "1px solid var(--sg-header-border)",
  padding: "10px 28px",
  display: "grid",
  gridTemplateColumns: "240px minmax(0, 1fr) 260px",
  alignItems: "center",
  gap: "16px",
  position: "sticky" as const,
  top: 0,
  zIndex: 10,
  boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
};

const brand = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "var(--sg-text-primary)",
  textDecoration: "none",
};

const brandIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "8px",
  background: "var(--sg-brand-icon-bg)",
  border: "1px solid rgba(255,255,255,0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold",
  fontSize: "20px",
};

const brandTitle = {
  fontSize: "20px",
  lineHeight: "20px",
};

const brandSubtitle = {
  margin: 0,
  color: "var(--sg-brand-subtitle)",
  fontSize: "12px",
};

const nav = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const rightSpace = {
  width: "260px",
  minWidth: 0,
};

const linkStyle = {
  color: "var(--sg-nav-chip-text)",
  textDecoration: "none",
  fontSize: "13px",
  padding: "9px 10px",
  borderRadius: "8px",
  background: "var(--sg-nav-chip-bg)",
  border: "1px solid var(--sg-nav-chip-border)",
  whiteSpace: "nowrap" as const,
};

const main = {
  padding: "32px",
};
