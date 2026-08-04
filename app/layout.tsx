import type { Metadata } from "next";
import AuthGate from "@/components/AuthGate";
import AuthProvider from "@/components/AuthProvider";
import AppHeader from "@/components/AppHeader";
import AppWorkspaceShell from "@/components/AppWorkspaceShell";
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
            <AppHeader />
            <AppWorkspaceShell>
              <AuthGate>{children}</AuthGate>
            </AppWorkspaceShell>
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
