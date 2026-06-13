import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SGDC",
  description: "Sistema de Gestão de Demandas da Comunicação",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <div style={container}>
          <header style={header}>
            <a href="/" style={brand}>
              <div style={brandIcon}>S</div>

              <div>
                <strong style={brandTitle}>SGDC</strong>
                <p style={brandSubtitle}>Gestão da Comunicação</p>
              </div>
            </a>

            <nav style={nav}>
              <a href="/" style={linkStyle}>📊 Dashboard</a>
              <a href="/nova-demanda" style={linkStyle}>➕ Nova Demanda</a>
              <a href="/demandas" style={linkStyle}>📋 Demandas</a>
              <a href="/relatorios" style={linkStyle}>📈 Relatórios</a>
              <a href="/relatorios-quantitativos" style={destaqueLink}>📊 Indicadores</a>
              <a href="/configuracoes" style={linkStyle}>⚙️ Configurações</a>
            </nav>

            <div style={rightSpace}></div>
          </header>

          <main style={main}>{children}</main>
        </div>
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
  height: "76px",
  background: "linear-gradient(90deg, #450a0a, #7f1d1d, #991b1b)",
  borderBottom: "1px solid #ef4444",
  padding: "0 28px",
  display: "grid",
  gridTemplateColumns: "260px 1fr 260px",
  alignItems: "center",
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
  borderRadius: "12px",
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
  gap: "10px",
  flexWrap: "wrap" as const,
};

const rightSpace = {
  width: "260px",
};

const linkStyle = {
  color: "#fee2e2",
  textDecoration: "none",
  fontSize: "14px",
  padding: "10px 12px",
  borderRadius: "10px",
  background: "rgba(127, 29, 29, 0.45)",
  border: "1px solid rgba(252, 165, 165, 0.18)",
  whiteSpace: "nowrap" as const,
};

const destaqueLink = {
  ...linkStyle,
  background: "linear-gradient(135deg, #dc2626, #991b1b)",
  border: "1px solid rgba(254, 202, 202, 0.35)",
  fontWeight: "bold",
};

const main = {
  padding: "32px",
};