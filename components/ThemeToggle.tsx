"use client";

import { useState } from "react";

type ThemeMode = "light" | "dark";

function aplicarTema(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem("sgdc-theme", theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";
    }

    return "dark";
  });

  function selecionar(themeSelecionado: ThemeMode) {
    setTheme(themeSelecionado);
    aplicarTema(themeSelecionado);
  }

  return (
    <div style={wrap}>
      <button
        type="button"
        onClick={() => selecionar("light")}
        style={{
          ...buttonBase,
          ...(theme === "light" ? activeLight : null),
        }}
      >
        Claro
      </button>

      <button
        type="button"
        onClick={() => selecionar("dark")}
        style={{
          ...buttonBase,
          ...(theme === "dark" ? activeDark : null),
        }}
      >
        Escuro
      </button>
    </div>
  );
}

const wrap = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px",
  borderRadius: "999px",
  background: "var(--sg-nav-chip-bg)",
  border: "1px solid var(--sg-nav-chip-border)",
};

const buttonBase = {
  border: "none",
  background: "transparent",
  color: "var(--sg-nav-chip-text)",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "11px",
  fontWeight: 700,
  cursor: "pointer",
};

const activeLight = {
  background: "rgba(255,255,255,0.92)",
  color: "#7f1d1d",
  boxShadow: "0 6px 14px rgba(15,23,42,0.08)",
};

const activeDark = {
  background: "rgba(15,23,42,0.92)",
  color: "#ffffff",
  boxShadow: "0 6px 14px rgba(0,0,0,0.18)",
};
