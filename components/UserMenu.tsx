"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function UserMenu() {
  const router = useRouter();
  const { usuario, logout, carregando } = useAuth();

  if (carregando) {
    return <div style={box}>...</div>;
  }

  if (!usuario) {
    return (
      <Link href="/login" style={loginLink}>
        Entrar
      </Link>
    );
  }

  async function sair() {
    await logout();
    router.push("/login");
  }

  return (
    <div style={box}>
      <div style={usuarioTexto}>
        <strong style={nome}>{usuario.nome}</strong>
        <span style={permissoes}>{usuario.funcao || "Usuário"}</span>
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
  color: "white",
  fontSize: "13px",
  lineHeight: "18px",
  maxWidth: "150px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
};

const permissoes = {
  color: "#fecaca",
  fontSize: "11px",
  lineHeight: "15px",
  maxWidth: "170px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
};

const botaoSair = {
  background: "rgba(15, 23, 42, 0.75)",
  color: "#fee2e2",
  border: "1px solid rgba(252, 165, 165, 0.3)",
  borderRadius: "8px",
  padding: "8px 10px",
  cursor: "pointer",
  fontWeight: 700,
};

const loginLink = {
  ...botaoSair,
  textDecoration: "none",
};
