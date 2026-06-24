"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  nomeDoUsuario,
  ordenarUsuariosAutorizados,
  usuarioEstaAutorizado,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type UsuarioRegistro = {
  id: number;
  nome: string;
  funcao: string | null;
  ativo: boolean;
  email_cadastrado: boolean;
  conta_criada: boolean;
};

export default function RegistroPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioRegistro[]>([]);
  const [usuarioId, setUsuarioId] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"erro" | "sucesso">("sucesso");
  const [carregando, setCarregando] = useState(false);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true);
  const usuarioSelecionado =
    usuarios.find((usuario) => usuario.id === Number(usuarioId)) || null;

  useEffect(() => {
    async function carregarUsuarios() {
      const { data, error } = await supabase.rpc("sgdc_usuarios_registro");

      if (error) {
        const usuariosFallback = await carregarUsuariosFallback();

        if (usuariosFallback.length === 0) {
          setTipoMensagem("erro");
          setMensagem(`Erro ao carregar usuários: ${error.message}`);
        } else {
          setUsuarios(usuariosFallback);
          setTipoMensagem("sucesso");
          setMensagem(
            "Lista carregada em modo de compatibilidade. Ainda falta publicar as funções de registro no Supabase."
          );
        }
      } else {
        setUsuarios(prepararUsuariosRegistro((data as UsuarioRegistro[] | null) || []));
      }

      setCarregandoUsuarios(false);
    }

    void carregarUsuarios();
  }, []);

  async function registrar(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setMensagem("");

    if (!usuarioId) {
      setTipoMensagem("erro");
      setMensagem("Selecione o usuário que será vinculado.");
      return;
    }

    if (!email.trim()) {
      setTipoMensagem("erro");
      setMensagem("Digite um e-mail.");
      return;
    }

    if (senha.length < 6) {
      setTipoMensagem("erro");
      setMensagem("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmacaoSenha) {
      setTipoMensagem("erro");
      setMensagem("As senhas não conferem.");
      return;
    }

    setCarregando(true);

    const resposta = await fetch("/api/registro", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usuarioId: Number(usuarioId),
        email: email.trim(),
        senha,
      }),
    });

    const resultado = (await resposta.json()) as {
      ok?: boolean;
      error?: string;
    };

    if (!resposta.ok || !resultado.ok) {
      setTipoMensagem("erro");
      setMensagem(resultado.error || "Não foi possível criar a conta.");
      setCarregando(false);
      return;
    }

    setTipoMensagem("sucesso");
    setMensagem(
      "Conta criada com sucesso. Volte para o login e entre com seu usuário e a senha padrão do sistema."
    );
    setCarregando(false);
    router.push("/login");
  }

  async function reenviarConfirmacao() {
    setTipoMensagem("sucesso");
    setMensagem(
      "A confirmação por e-mail não é mais necessária. Crie a conta e entre direto com e-mail e senha."
    );
  }

  return (
    <main style={page}>
      <form style={painel} onSubmit={registrar}>
        <p style={eyebrow}>Primeiro acesso</p>
        <h1 style={titulo}>Criar conta</h1>
        <p style={descricao}>
          Vincule seu e-mail ao usuário interno autorizado do sistema.
        </p>

        <label style={label}>Usuário interno</label>
        <select
          value={usuarioId}
          onChange={(event) => setUsuarioId(event.target.value)}
          style={campo}
          disabled={carregandoUsuarios || carregando}
        >
          <option value="">
            {carregandoUsuarios
              ? "Carregando usuários..."
              : usuarios.length === 0
                ? "Nenhum usuário disponível"
                : "Selecione"}
          </option>
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {formatarOpcaoUsuario(usuario)}
            </option>
          ))}
        </select>

        {usuarioSelecionado && (
          <p style={ajuda}>
            {usuarioSelecionado.conta_criada
              ? "Este usuário já possui um vínculo registrado. Se o acesso antigo não estiver funcionando, continue com o cadastro para reativar o acesso com este e-mail."
              : "Este usuário está liberado para criar o primeiro acesso."}
          </p>
        )}

        <label style={labelSenha}>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={campo}
          placeholder="voce@stacasa.com.br"
          disabled={carregando}
          autoComplete="email"
        />

        <label style={labelSenha}>Nome</label>
        <input
          type="text"
          value={usuarioSelecionado?.nome || ""}
          style={campo}
          placeholder="Selecione o usuário interno"
          disabled
          readOnly
        />

        <label style={labelSenha}>Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          style={campo}
          placeholder="Crie uma senha"
          disabled={carregando}
          autoComplete="new-password"
        />

        <label style={labelSenha}>Confirmar senha</label>
        <input
          type="password"
          value={confirmacaoSenha}
          onChange={(event) => setConfirmacaoSenha(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void registrar();
          }}
          style={campo}
          placeholder="Repita a senha"
          disabled={carregando}
          autoComplete="new-password"
        />

        <button
          type="submit"
          style={botao}
          disabled={carregando || carregandoUsuarios}
        >
          {carregando ? "Criando..." : "Criar conta"}
        </button>

        <button
          type="button"
          style={botaoSecundario}
          onClick={() => void reenviarConfirmacao()}
          disabled={carregando}
        >
          Reenviar confirmação
        </button>

        <p style={rodape}>
          Já possui conta? <Link href="/login" style={link}>Entrar</Link>
        </p>

        {mensagem && (
          <p style={tipoMensagem === "erro" ? mensagemErroStyle : mensagemSucessoStyle}>
            {mensagem}
          </p>
        )}
      </form>
    </main>
  );
}

function prepararUsuariosRegistro(usuarios: UsuarioRegistro[]) {
  return ordenarUsuariosAutorizados(
    usuarios
      .filter(
        (usuario) =>
          usuarioEstaAutorizado(usuario.nome) && usuario.ativo !== false
      )
      .map((usuario) => ({
        ...usuario,
        id: Number(usuario.id),
        nome: nomeDoUsuario(usuario.nome),
      }))
  );
}

async function carregarUsuariosFallback(): Promise<UsuarioRegistro[]> {
  const { data, error } = await supabase
    .from("usuarios_comunicacao")
    .select("id, nome, funcao, ativo, email")
    .order("nome");

  if (error) return [];

  return prepararUsuariosRegistro(
    ((data as
      | Array<{
          id: number;
          nome: string;
          funcao: string | null;
          ativo: boolean;
          email?: string | null;
        }>
      | null) || []).map((usuario) => ({
      id: Number(usuario.id),
      nome: usuario.nome,
      funcao: usuario.funcao,
      ativo: usuario.ativo,
      email_cadastrado: Boolean(usuario.email && usuario.email.trim()),
      conta_criada: Boolean(usuario.email && usuario.email.trim()),
    }))
  );
}

function formatarOpcaoUsuario(usuario: UsuarioRegistro) {
  if (usuario.conta_criada) {
    return `${usuario.nome} - conta existente`;
  }

  return `${usuario.nome} - novo acesso`;
}

const page = {
  minHeight: "calc(100vh - 140px)",
  display: "grid",
  placeItems: "center",
};

const painel = {
  width: "min(520px, 100%)",
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

const ajuda = {
  color: "#fecaca",
  fontSize: "12px",
  lineHeight: "18px",
  marginTop: "8px",
  marginBottom: 0,
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

const botaoSecundario = {
  width: "100%",
  background: "transparent",
  color: "#fee2e2",
  border: "1px solid rgba(252, 165, 165, 0.3)",
  padding: "12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
  marginTop: "10px",
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

const mensagemErroStyle = {
  color: "#fecaca",
  marginBottom: 0,
};

const mensagemSucessoStyle = {
  color: "#bbf7d0",
  marginBottom: 0,
};
