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
import {
  criarSessaoUsuario,
  type UsuarioComunicacao,
  type UsuarioSessao,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type AuthResultado = {
  ok: boolean;
  mensagem?: string;
  usuario?: UsuarioSessao;
};

type AuthContextValue = {
  usuario: UsuarioSessao | null;
  carregando: boolean;
  login: (
    usuario: UsuarioComunicacao | number,
    senha: string
  ) => Promise<AuthResultado>;
  logout: () => Promise<void>;
  recarregarUsuario: () => Promise<void>;
};

const STORAGE_KEY = "sgdc_usuario";

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarUsuarioSalvo = useCallback(async () => {
    const usuarioSalvo = lerUsuarioSalvo();

    if (!usuarioSalvo) {
      setUsuario(null);
      return;
    }

    const usuarioAtualizado = await buscarUsuario(usuarioSalvo.id);
    const usuarioSessao = criarSessaoUsuario(usuarioAtualizado || usuarioSalvo);

    setUsuario(usuarioSessao);
    salvarUsuario(usuarioSessao);
  }, []);

  useEffect(() => {
    let ativo = true;

    async function iniciarSessao() {
      await carregarUsuarioSalvo();

      if (ativo) {
        setCarregando(false);
      }
    }

    void iniciarSessao();

    return () => {
      ativo = false;
    };
  }, [carregarUsuarioSalvo]);

  const login = useCallback(
    async (usuarioEntrada: UsuarioComunicacao | number, senha: string) => {
      setCarregando(true);

      const usuarioId =
        typeof usuarioEntrada === "number" ? usuarioEntrada : Number(usuarioEntrada.id);

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            usuarioId,
            senha,
          }),
        });

        const json = (await response.json()) as {
          ok?: boolean;
          error?: string;
          usuario?: UsuarioSessao;
        };

        if (!response.ok || !json.ok || !json.usuario) {
          setUsuario(null);
          return {
            ok: false,
            mensagem: json.error || "Nao foi possivel entrar.",
          };
        }

        setUsuario(json.usuario);
        salvarUsuario(json.usuario);
        return {
          ok: true,
          usuario: json.usuario,
        };
      } catch {
        setUsuario(null);
        return {
          ok: false,
          mensagem: "Nao foi possivel entrar agora.",
        };
      } finally {
        setCarregando(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setCarregando(true);
    const storage = obterStorageSeguro();
    storage?.removeItem(STORAGE_KEY);
    setUsuario(null);
    setCarregando(false);
  }, []);

  const recarregarUsuario = useCallback(async () => {
    await carregarUsuarioSalvo();
  }, [carregarUsuarioSalvo]);

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

async function buscarUsuario(usuarioId: number) {
  const { data, error } = await supabase
    .from("usuarios_comunicacao")
    .select("id, nome, funcao, ativo")
    .eq("id", usuarioId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: Number(data.id),
    nome: data.nome,
    funcao: data.funcao,
    ativo: data.ativo,
  };
}

function lerUsuarioSalvo() {
  const storage = obterStorageSeguro();
  if (!storage) return null;

  try {
    const valor = storage.getItem(STORAGE_KEY);
    if (!valor) return null;

    return JSON.parse(valor) as UsuarioSessao;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
}

function salvarUsuario(usuario: UsuarioSessao) {
  const storage = obterStorageSeguro();
  if (!storage) return;

  storage.setItem(STORAGE_KEY, JSON.stringify(usuario));
}

function obterStorageSeguro() {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
