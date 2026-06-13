"use client";

import {
  createContext,
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

type AuthContextValue = {
  usuario: UsuarioSessao | null;
  carregando: boolean;
  login: (usuario: UsuarioComunicacao) => void;
  logout: () => void;
};

const STORAGE_KEY = "sgdc.usuario";

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      const salvo = localStorage.getItem(STORAGE_KEY);

      if (salvo) {
        try {
          setUsuario(JSON.parse(salvo) as UsuarioSessao);
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      setCarregando(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      carregando,
      login(usuarioComunicacao) {
        const sessao = criarSessaoUsuario(usuarioComunicacao);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessao));
        setUsuario(sessao);
      },
      logout() {
        localStorage.removeItem(STORAGE_KEY);
        setUsuario(null);
      },
    }),
    [usuario, carregando]
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
