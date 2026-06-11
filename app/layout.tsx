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
        <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a", color: "#fff" }}>
          
          <aside
            style={{
              width: "240px",
              background: "#020617",
              padding: "24px",
              borderRight: "1px solid #1e293b",
            }}
          >
            <h2 style={{ marginBottom: "30px" }}>SGDC</h2>

            <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <a href="/" style={linkStyle}>📊 Dashboard</a>
              <a href="/nova-demanda" style={linkStyle}>➕ Nova Demanda</a>
              <a href="/demandas" style={linkStyle}>📋 Demandas</a>
              <a href="/relatorios" style={linkStyle}>📈 Relatórios</a>
              <a href="/configuracoes" style={linkStyle}>⚙️ Configurações</a>
            </nav>
          </aside>

          <main style={{ flex: 1, padding: "30px" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

const linkStyle = {
  color: "#cbd5e1",
  textDecoration: "none",
  fontSize: "16px",
  padding: "10px 12px",
  borderRadius: "8px",
  background: "#0f172a",
};