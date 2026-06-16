"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, carregando } = useAuth();
  const rotaPublica = pathname === "/login" || pathname === "/registro";

  useEffect(() => {
    if (carregando) return;

    if (!usuario && !rotaPublica) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
      return;
    }

    if (usuario && rotaPublica) {
      const params = new URLSearchParams(window.location.search);
      router.replace(params.get("next") || "/");
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
