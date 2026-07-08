"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";

export default function UserMenu() {
  const router = useRouter();
  const { usuario, logout, carregando } = useAuth();

  if (carregando) {
    return <div style={box}>...</div>;
  }

  if (!usuario) {
    return (
      <div style={box}>
        <ThemeToggle />
        <Link href="/login" style={loginLink}>
          Entrar
        </Link>
      </div>
    );
  }

  async function sair() {
    await logout();
    router.push("/login");
  }

  return (
    <div style={box}>
      <ThemeToggle />

      <div style={usuarioTexto}>
        <strong style={nome}>{usuario.nome}</strong>
        <span style={permissoes}>{usuario.funcao || "Usuario"}</span>
      </div>

      <button type="button" onClick={sair} style={botaoSair}>
        Sair
      </button>
    </div>
  );
}

const box = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
};

const usuarioTexto = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-end",
  minWidth: 0,
};

const nome = {
  color: "var(--sg-text-primary)",
  fontSize: "13px",
  lineHeight: "18px",
  maxWidth: "150px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
};

const permissoes = {
  color: "var(--sg-brand-subtitle)",
  fontSize: "11px",
  lineHeight: "15px",
  maxWidth: "170px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
};

const botaoSair = {
  background: "var(--sg-button-neutral-bg)",
  color: "var(--sg-nav-chip-text)",
  border: "1px solid var(--sg-nav-chip-border)",
  borderRadius: "8px",
  padding: "8px 10px",
  cursor: "pointer",
  fontWeight: 700,
};

const loginLink = {
  ...botaoSair,
  textDecoration: "none",
};
