"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  nomeDoUsuario,
  ordenarUsuariosAutorizados,
  usuarioEstaAutorizado,
  type UsuarioComunicacao,
} from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";

type UsuarioLogin = UsuarioComunicacao;
const ROTA_INICIAL_APOS_LOGIN = "/relatorios-quantitativos";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioLogin[]>([]);
  const [usuarioId, setUsuarioId] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true);

  useEffect(() => {
    async function carregarUsuarios() {
      const { data, error } = await supabase
        .from("usuarios_comunicacao")
        .select("id, nome, funcao, ativo")
        .order("nome");

      if (error) {
        setMensagem("Nao foi possivel carregar a lista de usuarios agora.");
      } else {
        setUsuarios(prepararUsuariosLogin((data as UsuarioLogin[] | null) || []));
      }

      setCarregandoUsuarios(false);
    }

    void carregarUsuarios();
  }, []);

  async function entrar() {
    setMensagem("");

    if (!usuarioId) {
      setMensagem("Selecione o usuario.");
      return;
    }

    if (!senha) {
      setMensagem("Digite a senha.");
      return;
    }

    setCarregando(true);
    const usuario = usuarios.find((item) => item.id === Number(usuarioId));
    const resultado = await login(usuario || Number(usuarioId), senha);
    setCarregando(false);

    if (!resultado.ok) {
      setMensagem(resultado.mensagem || "Nao foi possivel entrar.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const proximaRota = params.get("next");
    router.push(
      !proximaRota || proximaRota === "/" ? ROTA_INICIAL_APOS_LOGIN : proximaRota
    );
  }

  return (
    <div style={page}>
      <section style={painel}>
        <p style={eyebrow}>Acesso ASCOM STACASA</p>
        <h1 style={titulo}>Entrar</h1>
        <p style={descricao}>
          Selecione seu usuario e informe sua senha de acesso.
        </p>

        <label style={label}>Usuario</label>
        <select
          value={usuarioId}
          onChange={(event) => setUsuarioId(event.target.value)}
          style={campo}
          disabled={carregandoUsuarios || carregando || usuarios.length === 0}
        >
          <option value="">
            {opcaoInicialUsuarios(carregandoUsuarios, usuarios.length)}
          </option>
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {nomeDoUsuario(usuario.nome)}
            </option>
          ))}
        </select>

        <label style={labelSenha}>Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void entrar();
          }}
          style={campo}
          placeholder="Digite a senha"
          disabled={carregando}
        />

        <button
          type="button"
          onClick={entrar}
          style={botao}
          disabled={carregando || carregandoUsuarios}
        >
          {carregando ? "Aguarde..." : "Entrar"}
        </button>

        {mensagem && <p style={mensagemStyle}>{mensagem}</p>}
      </section>
    </div>
  );
}

function prepararUsuariosLogin(usuarios: UsuarioLogin[]) {
  return ordenarUsuariosAutorizados(
    usuarios
      .filter(
        (usuario) =>
          usuarioEstaAutorizado(usuario.nome) && usuario.ativo !== false
      )
      .map((usuario) => ({
        ...usuario,
        id: Number(usuario.id),
      }))
  );
}

function opcaoInicialUsuarios(
  carregandoUsuarios: boolean,
  totalUsuarios: number
) {
  if (carregandoUsuarios) return "Carregando usuarios...";
  if (totalUsuarios === 0) return "Nenhum usuario disponivel";
  return "Selecione";
}

const page = {
  minHeight: "calc(100vh - 140px)",
  display: "grid",
  placeItems: "center",
};

const painel = {
  width: "min(480px, 100%)",
  background: "var(--sg-panel-bg)",
  border: "1px solid var(--sg-border-strong)",
  borderRadius: "8px",
  padding: "28px",
  boxShadow: "var(--sg-shadow-strong)",
};

const eyebrow = {
  margin: 0,
  color: "var(--sg-text-secondary)",
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
  color: "var(--sg-text-secondary)",
  lineHeight: "22px",
  marginBottom: "22px",
};

const label = {
  color: "var(--sg-text-secondary)",
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
  background: "var(--sg-input-bg)",
  color: "var(--sg-text-primary)",
  border: "1px solid var(--sg-input-border)",
  borderRadius: "8px",
  padding: "12px",
};

const botao = {
  width: "100%",
  background: "var(--sg-button-primary-bg)",
  color: "var(--sg-button-primary-text)",
  border: "none",
  padding: "12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
  marginTop: "18px",
};

const mensagemStyle = {
  color: "var(--sg-text-secondary)",
  marginBottom: 0,
};
