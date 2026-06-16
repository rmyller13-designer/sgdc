"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
  const [carregando, setCarregando] = useState(false);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true);
  const usuarioSelecionado =
    usuarios.find((usuario) => usuario.id === Number(usuarioId)) || null;

  useEffect(() => {
    async function carregarUsuarios() {
      const { data, error } = await supabase.rpc("sgdc_usuarios_registro");

      if (error) {
        setMensagem(`Erro ao carregar usuarios: ${error.message}`);
      } else {
        setUsuarios(
          ((data as UsuarioRegistro[] | null) || []).filter(
            (usuario) => !usuario.conta_criada
          )
        );
      }

      setCarregandoUsuarios(false);
    }

    void carregarUsuarios();
  }, []);

  async function registrar(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setMensagem("");

    if (!usuarioId) {
      setMensagem("Selecione o usuario que sera vinculado.");
      return;
    }

    if (!email.trim()) {
      setMensagem("Digite um email.");
      return;
    }

    if (senha.length < 6) {
      setMensagem("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmacaoSenha) {
      setMensagem("As senhas nao conferem.");
      return;
    }

    setCarregando(true);

    const { error: cadastroError, data } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: {
          nome: usuarioSelecionado?.nome || "",
          sgdc_usuario_id: Number(usuarioId),
        },
      },
    });

    if (cadastroError) {
      setMensagem(traduzirErroCadastro(cadastroError.message));
      setCarregando(false);
      return;
    }

    if (!data.session) {
      setMensagem(
        "Conta criada. Se a confirmacao de email estiver ativa no Supabase, confirme o email e depois faca login. O sistema concluira o vinculo automaticamente no primeiro acesso."
      );
      setCarregando(false);
      return;
    }

    const { error: vinculoError } = await supabase.rpc(
      "sgdc_registrar_usuario_acesso",
      {
        usuario_id_param: Number(usuarioId),
        email_param: email.trim(),
      }
    );

    if (vinculoError) {
      await supabase.auth.signOut();
      setMensagem(`Conta criada, mas nao foi possivel vincular o usuario: ${vinculoError.message}`);
      setCarregando(false);
      return;
    }

    router.push("/");
  }

  return (
    <main style={page}>
      <form style={painel} onSubmit={registrar}>
        <p style={eyebrow}>Primeiro acesso</p>
        <h1 style={titulo}>Criar conta</h1>
        <p style={descricao}>
          Vincule seu email ao usuario interno autorizado do sistema.
        </p>

        <label style={label}>Usuario interno</label>
        <select
          value={usuarioId}
          onChange={(event) => setUsuarioId(event.target.value)}
          style={campo}
          disabled={carregandoUsuarios || carregando}
        >
          <option value="">
            {carregandoUsuarios
              ? "Carregando usuarios..."
              : usuarios.length === 0
                ? "Nenhum usuario disponivel"
                : "Selecione"}
          </option>
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nome}
            </option>
          ))}
        </select>

        <label style={labelSenha}>Email</label>
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
          placeholder="Selecione o usuario interno"
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

        <p style={rodape}>
          Ja possui conta? <Link href="/login" style={link}>Entrar</Link>
        </p>

        {mensagem && <p style={mensagemStyle}>{mensagem}</p>}
      </form>
    </main>
  );
}

function traduzirErroCadastro(mensagem: string) {
  const texto = mensagem.toLowerCase();

  if (texto.includes("user already registered")) {
    return "Este email ja esta cadastrado.";
  }

  if (texto.includes("password should be at least")) {
    return "A senha precisa atender aos requisitos minimos do Supabase.";
  }

  return mensagem;
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
