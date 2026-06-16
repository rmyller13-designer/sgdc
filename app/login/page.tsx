"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setMensagem("");

    if (!email.trim()) {
      setMensagem("Digite seu email.");
      return;
    }

    if (!senha) {
      setMensagem("Digite sua senha.");
      return;
    }

    setCarregando(true);
    const resultado = await login(email.trim(), senha);
    setCarregando(false);

    if (!resultado.ok) {
      setMensagem(resultado.mensagem || "Nao foi possivel entrar.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    router.push(params.get("next") || "/");
  }

  return (
    <div style={page}>
      <section style={painel}>
        <p style={eyebrow}>Acesso ASCOM STACASA</p>
        <h1 style={titulo}>Entrar</h1>
        <p style={descricao}>
          Entre com o email e a senha da sua conta do sistema.
        </p>

        <label style={label}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void entrar();
          }}
          style={campo}
          placeholder="voce@stacasa.com.br"
          disabled={carregando}
          autoComplete="email"
        />

        <label style={labelSenha}>Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void entrar();
          }}
          style={campo}
          placeholder="Digite sua senha"
          disabled={carregando}
          autoComplete="current-password"
        />

        <button
          type="button"
          onClick={entrar}
          style={botao}
          disabled={carregando}
        >
          {carregando ? "Aguarde..." : "Entrar"}
        </button>

        <p style={rodape}>
          Primeiro acesso? <Link href="/registro" style={link}>Criar conta</Link>
        </p>

        {mensagem && <p style={mensagemStyle}>{mensagem}</p>}
      </section>
    </div>
  );
}

const page = {
  minHeight: "calc(100vh - 140px)",
  display: "grid",
  placeItems: "center",
};

const painel = {
  width: "min(480px, 100%)",
  background: "rgba(15, 23, 42, 0.78)",
  border: "1px solid rgba(252, 165, 165, 0.2)",
  borderRadius: "8px",
  padding: "28px",
  boxShadow: "0 18px 42px rgba(0,0,0,0.28)",
};

const eyebrow = {
  margin: 0,
  color: "#fecaca",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const titulo = {
  margin: "8px 0",
  fontSize: "30px",
};

const descricao = {
  color: "#fecaca",
  lineHeight: "22px",
  marginBottom: "22px",
};

const label = {
  color: "#fecaca",
  fontSize: "13px",
  fontWeight: 700,
};

const labelSenha = {
  ...label,
  display: "block",
  marginTop: "14px",
};

const campo = {
  width: "100%",
  boxSizing: "border-box" as const,
  marginTop: "8px",
  background: "rgba(2, 6, 23, 0.72)",
  color: "white",
  border: "1px solid rgba(252, 165, 165, 0.28)",
  borderRadius: "8px",
  padding: "12px",
};

const botao = {
  width: "100%",
  background: "linear-gradient(135deg, #dc2626, #991b1b)",
  color: "white",
  border: "none",
  padding: "12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
  marginTop: "18px",
};

const rodape = {
  color: "#fecaca",
  marginTop: "16px",
  marginBottom: 0,
  fontSize: "13px",
};

const link = {
  color: "white",
  fontWeight: 700,
};

const mensagemStyle = {
  color: "#fecaca",
  marginBottom: 0,
};
