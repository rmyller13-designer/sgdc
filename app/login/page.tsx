"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  cargoDoUsuario,
  nomeDoUsuario,
  ordenarUsuariosAutorizados,
  usuarioEstaAutorizado,
  type UsuarioComunicacao,
} from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";

const SENHAS_STORAGE_KEY = "sgdc.senhas";
const EMAILS_STORAGE_KEY = "sgdc.emails";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioComunicacao[]>([]);
  const [usuarioId, setUsuarioId] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [modoRegistro, setModoRegistro] = useState(false);
  const [senhasRegistradas, setSenhasRegistradas] = useState<
    Record<string, string>
  >({});
  const [emailsRegistrados, setEmailsRegistrados] = useState<
    Record<string, string>
  >({});
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      setSenhasRegistradas(carregarSenhasRegistradas());
      setEmailsRegistrados(carregarEmailsRegistrados());
    });
  }, []);

  useEffect(() => {
    async function carregarUsuarios() {
      const { data, error } = await supabase
        .from("usuarios_comunicacao")
        .select("id, nome, funcao, email, ativo")
        .eq("ativo", true)
        .order("nome");

      if (error) {
        setMensagem(`Erro ao carregar usuários: ${error.message}`);
      } else {
        const usuariosAtivos = (data as UsuarioComunicacao[] | null) || [];
        setUsuarios(
          ordenarUsuariosAutorizados(
            usuariosAtivos.filter((usuario) =>
              usuarioEstaAutorizado(usuario.nome)
            )
          )
        );
      }

      setCarregando(false);
    }

    void carregarUsuarios();
  }, []);

  const usuarioSelecionado = useMemo(
    () => usuarios.find((usuario) => String(usuario.id) === usuarioId) || null,
    [usuarioId, usuarios]
  );

  const senhaJaRegistrada = usuarioSelecionado
    ? Boolean(senhasRegistradas[chaveSenha(usuarioSelecionado)])
    : false;

  async function entrar() {
    if (!usuarioSelecionado) {
      setMensagem("Selecione um usuário ativo.");
      return;
    }

    if (!senhaJaRegistrada) {
      setModoRegistro(true);
      setMensagem("Registre uma senha para este usuário antes de entrar.");
      return;
    }

    if (!senha) {
      setMensagem("Digite sua senha.");
      return;
    }

    const hash = await gerarHashSenha(usuarioSelecionado, senha);

    if (hash !== senhasRegistradas[chaveSenha(usuarioSelecionado)]) {
      setMensagem("Senha incorreta.");
      return;
    }

    login(usuarioSelecionado);

    const params = new URLSearchParams(window.location.search);
    router.push(params.get("next") || "/");
  }

  async function registrarSenha() {
    if (!usuarioSelecionado) {
      setMensagem("Selecione um usuário para registrar a senha.");
      return;
    }

    if (senha.length < 4) {
      setMensagem("A senha precisa ter pelo menos 4 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      setMensagem("As senhas não conferem.");
      return;
    }

    const proximasSenhas = {
      ...senhasRegistradas,
      [chaveSenha(usuarioSelecionado)]: await gerarHashSenha(
        usuarioSelecionado,
        senha
      ),
    };

    salvarSenhasRegistradas(proximasSenhas);
    setSenhasRegistradas(proximasSenhas);
    setConfirmarSenha("");
    setModoRegistro(false);
    setMensagem("Senha registrada. Agora você pode entrar.");
  }

  function selecionarUsuario(id: string) {
    setUsuarioId(id);
    setSenha("");
    setConfirmarSenha("");
    setModoRegistro(false);
    setMensagem("");
  }

  return (
    <div style={page}>
      <section style={painel}>
        <p style={eyebrow}>Acesso SGDC</p>
        <h1 style={titulo}>Entrar</h1>
        <p style={descricao}>
          Selecione seu usuário e informe a senha cadastrada para acessar o
          sistema.
        </p>

        <label style={label}>Usuário</label>
        <select
          value={usuarioId}
          onChange={(event) => selecionarUsuario(event.target.value)}
          style={campo}
          disabled={carregando}
        >
          <option value="">
            {carregando ? "Carregando usuários..." : "Selecione"}
          </option>
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {nomeDoUsuario(usuario.nome)} -{" "}
              {cargoDoUsuario(usuario.nome) || usuario.funcao || "Solicitante"}
            </option>
          ))}
        </select>

        <label style={labelSenha}>Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          style={campo}
          placeholder="Digite sua senha"
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
            />
          </>
        )}

        {usuarioSelecionado && !senhaJaRegistrada && !modoRegistro && (
          <p style={avisoSenha}>Primeiro acesso: registre uma senha.</p>
        )}

        <div style={botoes}>
          <button type="button" onClick={entrar} style={botao}>
            Entrar
          </button>

          <button
            type="button"
            onClick={modoRegistro ? registrarSenha : () => setModoRegistro(true)}
            style={botaoSecundario}
          >
            {modoRegistro ? "Salvar senha" : "Registre-se"}
          </button>
        </div>

        {mensagem && <p style={mensagemStyle}>{mensagem}</p>}
      </section>
    </div>
  );
}

function chaveSenha(usuario: UsuarioComunicacao) {
  return String(usuario.id);
}

function carregarSenhasRegistradas() {
  try {
    const valor = localStorage.getItem(SENHAS_STORAGE_KEY);
    return valor ? (JSON.parse(valor) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function salvarSenhasRegistradas(senhas: Record<string, string>) {
  localStorage.setItem(SENHAS_STORAGE_KEY, JSON.stringify(senhas));
}

async function gerarHashSenha(usuario: UsuarioComunicacao, senha: string) {
  const texto = `sgdc:${usuario.id}:${nomeDoUsuario(usuario.nome)}:${senha}`;
  const bytes = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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

const avisoSenha = {
  color: "#fecaca",
  fontSize: "13px",
  margin: "10px 0 0",
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
