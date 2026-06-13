"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, carregando } = useAuth();
  const estaNoLogin = pathname === "/login";

  useEffect(() => {
    if (carregando) return;

    if (!usuario && !estaNoLogin) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
      return;
    }

    if (usuario && estaNoLogin) {
      const params = new URLSearchParams(window.location.search);
      router.replace(params.get("next") || "/");
    }
  }, [carregando, estaNoLogin, pathname, router, usuario]);

  if (carregando) {
    return <div style={loading}>Carregando sessão...</div>;
  }

  if (!usuario && !estaNoLogin) {
    return <div style={loading}>Abrindo login...</div>;
  }

  return <>{children}</>;
}

const loading = {
  color: "#fee2e2",
  padding: "32px",
};
