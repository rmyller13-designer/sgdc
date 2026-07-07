"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const ROTA_INICIAL_APOS_LOGIN = "/relatorios-quantitativos";

export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, carregando } = useAuth();
  const rotaPublica = pathname === "/login" || pathname === "/registro";

  useEffect(() => {
    if (carregando) return;

    if (!usuario && !rotaPublica) {
      const proximaRota =
        !pathname || pathname === "/" ? ROTA_INICIAL_APOS_LOGIN : pathname;
      router.replace(`/login?next=${encodeURIComponent(proximaRota)}`);
      return;
    }

    if (usuario && rotaPublica) {
      const params = new URLSearchParams(window.location.search);
      const proximaRota = params.get("next");
      router.replace(
        !proximaRota || proximaRota === "/" ? ROTA_INICIAL_APOS_LOGIN : proximaRota
      );
    }
  }, [carregando, pathname, rotaPublica, router, usuario]);

  if (carregando) {
    return <div style={loading}>Carregando sessão...</div>;
  }

  if (!usuario && !rotaPublica) {
    return <div style={loading}>Abrindo login...</div>;
  }

  return <>{children}</>;
}

const loading = {
  color: "#fee2e2",
  padding: "32px",
};
