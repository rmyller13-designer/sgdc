"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  cargoDoUsuario,
  nomeDoUsuario,
  ordenarUsuariosAutorizados,
  type UsuarioComunicacao,
} from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";

type UsuarioRegistro = UsuarioComunicacao & {
  email_cadastrado?: boolean | null;
  conta_criada?: boolean | null;
};

export default function LoginPage() {
  const router = useRouter();
  const { login, registrar } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioRegistro[]>([]);
  const [usuarioId, setUsuarioId] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [modoRegistro, setModoRegistro] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true);

  useEffect(() => {
    async function carregarUsuarios() {
      const { data, error } = await supabase.rpc("sgdc_usuarios_registro");

      if (error) {
        setMensagem(`Erro ao carregar usuários: ${error.message}`);
      } else {
        setUsuarios(
          ordenarUsuariosAutorizados(
            ((data as UsuarioRegistro[] | null) || []).map((usuario) => ({
              ...usuario,
              id: Number(usuario.id),
            }))
          )
        );
      }

      setCarregandoUsuarios(false);
    }

    void carregarUsuarios();
  }, []);

  async function entrar() {
    setMensagem("");

    if (!validarEmail(email)) {
      setMensagem("Informe seu e-mail.");
      return;
    }

    if (!senha) {
      setMensagem("Digite sua senha.");
      return;
    }

    setCarregando(true);
    const resultado = await login(email, senha);
    setCarregando(false);

    if (!resultado.ok) {
      setMensagem(resultado.mensagem || "Não foi possível entrar.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    router.push(params.get("next") || "/");
  }

  async function criarAcesso() {
    setMensagem("");

    if (!usuarioId) {
      setMensagem("Selecione o usuário.");
      return;
    }

    if (!validarEmail(email)) {
      setMensagem("Informe um e-mail válido.");
      return;
    }

    if (senha.length < 6) {
      setMensagem("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      setMensagem("As senhas não conferem.");
      return;
    }

    setCarregando(true);
    const resultado = await registrar(Number(usuarioId), email, senha);
    setCarregando(false);

    setMensagem(resultado.mensagem || "");

    if (resultado.ok && resultado.mensagem === "Acesso criado com sucesso.") {
      const params = new URLSearchParams(window.location.search);
      router.push(params.get("next") || "/");
    }
  }

  function alternarRegistro() {
    setModoRegistro((atual) => !atual);
    setMensagem("");
    setSenha("");
    setConfirmarSenha("");
  }

  return (
    <div style={page}>
      <section style={painel}>
        <p style={eyebrow}>Acesso SGDC</p>
        <h1 style={titulo}>{modoRegistro ? "Registre-se" : "Entrar"}</h1>
        <p style={descricao}>
          Use seu e-mail e senha do Supabase para acessar o sistema com usuário
          real e permissões protegidas.
        </p>

        {modoRegistro && (
          <>
            <label style={label}>Usuário</label>
            <select
              value={usuarioId}
              onChange={(event) => setUsuarioId(event.target.value)}
              style={campo}
              disabled={carregandoUsuarios || carregando}
            >
              <option value="">
                {carregandoUsuarios ? "Carregando usuários..." : "Selecione"}
              </option>
              {usuarios.map((usuario) => (
                <option
                  key={usuario.id}
                  value={usuario.id}
                  disabled={Boolean(usuario.conta_criada)}
                >
                  {nomeDoUsuario(usuario.nome)} -{" "}
                  {cargoDoUsuario(usuario.nome) ||
                    usuario.funcao ||
                    "Solicitante"}
                  {usuario.conta_criada ? " (conta criada)" : ""}
                </option>
              ))}
            </select>
          </>
        )}

        <label style={modoRegistro ? labelSenha : label}>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={campo}
          placeholder="nome@exemplo.com"
          disabled={carregando}
        />

        <label style={labelSenha}>Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          style={campo}
          placeholder="Digite sua senha"
          disabled={carregando}
        />

        {modoRegistro && (
          <>
            <label style={labelSenha}>Confirmar senha</label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(event) => setConfirmarSenha(event.target.value)}
              style={campo}
              placeholder="Repita sua senha"
              disabled={carregando}
            />
          </>
        )}

        <div style={botoes}>
          <button
            type="button"
            onClick={modoRegistro ? criarAcesso : entrar}
            style={botao}
            disabled={carregando}
          >
            {carregando
              ? "Aguarde..."
              : modoRegistro
                ? "Criar acesso"
                : "Entrar"}
          </button>

          <button
            type="button"
            onClick={alternarRegistro}
            style={botaoSecundario}
            disabled={carregando}
          >
            {modoRegistro ? "Voltar" : "Registre-se"}
          </button>
        </div>

        {mensagem && <p style={mensagemStyle}>{mensagem}</p>}
      </section>
    </div>
  );
}

function validarEmail(valor: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
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

const botoes = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "18px",
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
};

const botaoSecundario = {
  ...botao,
  background: "rgba(15, 23, 42, 0.85)",
  border: "1px solid rgba(252, 165, 165, 0.28)",
};

const mensagemStyle = {
  color: "#fecaca",
  marginBottom: 0,
};
