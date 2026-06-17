"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  criarSessaoUsuario,
  type UsuarioComunicacao,
  type UsuarioSessao,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type AuthResultado = {
  ok: boolean;
  mensagem?: string;
};

type AuthContextValue = {
  usuario: UsuarioSessao | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<AuthResultado>;
  logout: () => Promise<void>;
  recarregarUsuario: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  const aplicarSessao = useCallback(async (session: Session | null) => {
    if (!session) {
      setUsuario(null);
      return;
    }

    const usuarioLogado =
      (await buscarUsuarioLogado()) ||
      (await vincularUsuarioPendente(session)) ||
      (await buscarUsuarioPorMetadata(session)) ||
      (await reconciliarSessao(session));

    if (!usuarioLogado) {
      await supabase.auth.signOut();
      setUsuario(null);
      return;
    }

    setUsuario(criarSessaoUsuario(usuarioLogado));
  }, []);

  const carregarSessaoAtual = useCallback(
    async (session?: Session | null) => {
      const sessaoAtual =
        session === undefined
          ? (await supabase.auth.getSession()).data.session
          : session;

      await aplicarSessao(sessaoAtual);
    },
    [aplicarSessao]
  );

  useEffect(() => {
    let ativo = true;

    async function iniciarSessao() {
      await carregarSessaoAtual();

      if (ativo) {
        setCarregando(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, session) => {
      void (async () => {
        await carregarSessaoAtual(session);

        if (ativo) {
          setCarregando(false);
        }
      })();
    });

    void iniciarSessao();

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, [carregarSessaoAtual]);

  const login = useCallback(async (email: string, senha: string) => {
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setUsuario(null);
      setCarregando(false);
      return {
        ok: false,
        mensagem: traduzirErroAuth(error.message),
      };
    }

    const session = (await supabase.auth.getSession()).data.session;
    const usuarioLogado =
      (await buscarUsuarioLogado()) ||
      (session ? await vincularUsuarioPendente(session) : null) ||
      (session ? await buscarUsuarioPorMetadata(session) : null) ||
      (session ? await reconciliarSessao(session) : null);

    if (!usuarioLogado) {
      await supabase.auth.signOut();
      setUsuario(null);
      setCarregando(false);
      return {
        ok: false,
        mensagem:
          "Sua conta entrou, mas nao esta vinculada a um usuario autorizado do sistema.",
      };
    }

    setUsuario(criarSessaoUsuario(usuarioLogado));
    setCarregando(false);

    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    setCarregando(true);
    await supabase.auth.signOut();
    setUsuario(null);
    setCarregando(false);
  }, []);

  const recarregarUsuario = useCallback(async () => {
    await carregarSessaoAtual();
  }, [carregarSessaoAtual]);

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      carregando,
      login,
      logout,
      recarregarUsuario,
    }),
    [usuario, carregando, login, logout, recarregarUsuario]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}

async function buscarUsuarioLogado(): Promise<UsuarioComunicacao | null> {
  const { data, error } = await supabase.rpc("sgdc_usuario_logado");

  if (error) return null;

  const usuario = Array.isArray(data) ? data[0] : data;
  if (!usuario) return null;

  return {
    id: Number(usuario.id),
    nome: usuario.nome,
    funcao: usuario.funcao,
    email: usuario.email,
    ativo: usuario.ativo,
  };
}

async function vincularUsuarioPendente(
  session: Session
): Promise<UsuarioComunicacao | null> {
  const usuarioId = Number(session.user.user_metadata?.sgdc_usuario_id);
  const email = session.user.email?.trim().toLowerCase();

  if (!Number.isFinite(usuarioId) || usuarioId <= 0 || !email) {
    return null;
  }

  const { error } = await supabase.rpc("sgdc_registrar_usuario_acesso", {
    usuario_id_param: usuarioId,
    email_param: email,
  });

  if (error) {
    if (rpcNaoDisponivel(error.message)) {
      return buscarUsuarioPorMetadata(session);
    }

    return null;
  }

  return buscarUsuarioLogado();
}

async function buscarUsuarioPorMetadata(
  session: Session
): Promise<UsuarioComunicacao | null> {
  const usuarioId = Number(session.user.user_metadata?.sgdc_usuario_id);

  if (!Number.isFinite(usuarioId) || usuarioId <= 0) {
    return null;
  }

  const { data, error } = await supabase
    .from("usuarios_comunicacao")
    .select("id, nome, funcao, ativo, email")
    .eq("id", usuarioId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: Number(data.id),
    nome: data.nome,
    funcao: data.funcao,
    ativo: data.ativo,
    email: data.email,
  };
}

async function reconciliarSessao(
  session: Session
): Promise<UsuarioComunicacao | null> {
  const accessToken = session.access_token;

  if (!accessToken) {
    return null;
  }

  const resposta = await fetch("/api/auth/reconcile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accessToken }),
  });

  if (!resposta.ok) {
    return null;
  }

  const resultado = (await resposta.json()) as {
    ok?: boolean;
    usuario?: UsuarioComunicacao;
  };

  if (!resultado.ok || !resultado.usuario) {
    return null;
  }

  return {
    id: Number(resultado.usuario.id),
    nome: resultado.usuario.nome,
    funcao: resultado.usuario.funcao,
    ativo: resultado.usuario.ativo,
    email: resultado.usuario.email,
  };
}

function rpcNaoDisponivel(mensagem: string) {
  const texto = mensagem.toLowerCase();
  return (
    texto.includes("could not find the function") ||
    texto.includes("function public.sgdc_") ||
    texto.includes("schema cache")
  );
}

function traduzirErroAuth(mensagem: string) {
  const texto = mensagem.toLowerCase();

  if (texto.includes("invalid login credentials")) {
    return "Email ou senha invalidos.";
  }

  if (texto.includes("email not confirmed")) {
    return "Confirme o email antes de entrar.";
  }

  if (texto.includes("signup is disabled")) {
    return "O cadastro por email esta desabilitado no Supabase.";
  }

  return mensagem;
}
