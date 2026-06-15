import type { Metadata } from "next";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import AuthProvider from "@/components/AuthProvider";
import UserMenu from "@/components/UserMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASCOM STACASA",
  description: "Sistema de Gestao de Demandas da Comunicacao",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <div style={container}>
            <header style={header}>
              <Link href="/" style={brand}>
                <div style={brandIcon}>S</div>

                <div>
                  <strong style={brandTitle}>ASCOM STACASA</strong>
                  <p style={brandSubtitle}>Gestao da Comunicacao</p>
                </div>
              </Link>

              <nav style={nav}>
                <Link href="/" style={linkStyle}>Dashboard</Link>
                <Link href="/nova-demanda" style={linkStyle}>Nova Demanda</Link>
                <Link href="/demandas" style={linkStyle}>Demandas</Link>
                <Link href="/calendario-editorial" style={linkStyle}>Calendario</Link>
                <Link href="/relatorios" style={linkStyle}>Relatorios</Link>
                <Link href="/relatorios-quantitativos" style={linkStyle}>Indicadores</Link>
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
  background:
    "radial-gradient(circle at top left, #450a0a 0%, #ad1111 35%, #2b0000 100%)",
  color: "#fff",
};

const header = {
  minHeight: "76px",
  background: "linear-gradient(90deg, #450a0a, #7f1d1d, #991b1b)",
  borderBottom: "1px solid #ef4444",
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
  color: "white",
  textDecoration: "none",
};

const brandIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "8px",
  background: "linear-gradient(135deg, #ef4444, #7f1d1d)",
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
  color: "#fecaca",
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
  color: "#fee2e2",
  textDecoration: "none",
  fontSize: "13px",
  padding: "9px 10px",
  borderRadius: "8px",
  background: "rgba(127, 29, 29, 0.45)",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  whiteSpace: "nowrap" as const,
};

const main = {
  padding: "32px",
};
