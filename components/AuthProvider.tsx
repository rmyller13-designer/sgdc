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

type UsuarioLogadoRow = UsuarioComunicacao & {
  perfil?: string | null;
};

type AuthContextValue = {
  usuario: UsuarioSessao | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<AuthResultado>;
  registrar: (
    usuarioId: number,
    email: string,
    senha: string
  ) => Promise<AuthResultado>;
  logout: () => Promise<void>;
  recarregarUsuario: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  const vincularUsuarioPendente = useCallback(async (session: Session) => {
    const usuarioId = Number(session.user.user_metadata?.usuario_comunicacao_id);
    const email = session.user.email;

    if (!usuarioId || !email) return;

    await supabase.rpc("sgdc_registrar_usuario_acesso", {
      usuario_id_param: usuarioId,
      email_param: email,
    });
  }, []);

  const carregarUsuario = useCallback(
    async (session?: Session | null) => {
      if (!session) {
        setUsuario(null);
        return;
      }

      let { data, error } = await supabase
        .rpc("sgdc_usuario_logado")
        .maybeSingle();

      if (!data && !error) {
        await vincularUsuarioPendente(session);

        const resposta = await supabase
          .rpc("sgdc_usuario_logado")
          .maybeSingle();

        data = resposta.data;
        error = resposta.error;
      }

      if (error || !data) {
        setUsuario(null);
        return;
      }

      setUsuario(criarSessaoUsuario(normalizarUsuarioLogado(data)));
    },
    [vincularUsuarioPendente]
  );

  useEffect(() => {
    let ativo = true;

    async function iniciarSessao() {
      const { data } = await supabase.auth.getSession();

      if (ativo) {
        await carregarUsuario(data.session);
        setCarregando(false);
      }
    }

    void iniciarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!ativo) return;

      window.setTimeout(() => {
        if (ativo) void carregarUsuario(session);
      }, 0);
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, [carregarUsuario]);

  const login = useCallback(
    async (email: string, senha: string) => {
      setCarregando(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error || !data.session) {
        setUsuario(null);
        setCarregando(false);
        return {
          ok: false,
          mensagem: "E-mail ou senha incorretos.",
        };
      }

      await carregarUsuario(data.session);
      setCarregando(false);

      return { ok: true };
    },
    [carregarUsuario]
  );

  const registrar = useCallback(
    async (usuarioId: number, email: string, senha: string) => {
      setCarregando(true);

      const emailLimpo = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: emailLimpo,
        password: senha,
        options: {
          data: {
            usuario_comunicacao_id: usuarioId,
          },
        },
      });

      if (error) {
        setCarregando(false);
        return {
          ok: false,
          mensagem: traduzirErroAuth(error.message),
        };
      }

      if (!data.session) {
        setCarregando(false);
        return {
          ok: true,
          mensagem:
            "Conta criada. Confirme o e-mail e depois entre com sua senha.",
        };
      }

      const { error: erroVinculo } = await supabase.rpc(
        "sgdc_registrar_usuario_acesso",
        {
          usuario_id_param: usuarioId,
          email_param: emailLimpo,
        }
      );

      if (erroVinculo) {
        await supabase.auth.signOut();
        setUsuario(null);
        setCarregando(false);
        return {
          ok: false,
          mensagem: erroVinculo.message,
        };
      }

      await carregarUsuario(data.session);
      setCarregando(false);

      return { ok: true, mensagem: "Acesso criado com sucesso." };
    },
    [carregarUsuario]
  );

  const logout = useCallback(async () => {
    setCarregando(true);
    await supabase.auth.signOut();
    setUsuario(null);
    setCarregando(false);
  }, []);

  const recarregarUsuario = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await carregarUsuario(data.session);
  }, [carregarUsuario]);

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      carregando,
      login,
      registrar,
      logout,
      recarregarUsuario,
    }),
    [usuario, carregando, login, registrar, logout, recarregarUsuario]
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

function normalizarUsuarioLogado(data: unknown): UsuarioComunicacao {
  const usuario = data as UsuarioLogadoRow;

  return {
    id: Number(usuario.id),
    nome: usuario.nome,
    funcao: usuario.funcao,
    email: usuario.email,
    ativo: usuario.ativo,
  };
}

function traduzirErroAuth(mensagem: string) {
  const texto = mensagem.toLowerCase();

  if (texto.includes("already") || texto.includes("registered")) {
    return "Este e-mail ja possui conta. Use Entrar ou recupere a senha no Supabase.";
  }

  if (texto.includes("password")) {
    return "A senha precisa atender aos criterios minimos do Supabase.";
  }

  return mensagem;
}
