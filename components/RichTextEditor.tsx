"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { sanitizeRichText } from "@/lib/rich-text";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
};

export type RichTextEditorHandle = {
  getHtml: () => string;
  focus: () => void;
  setHtml: (value: string) => void;
};

type Action =
  | "bold"
  | "italic"
  | "underline"
  | "insertUnorderedList"
  | "insertOrderedList";

const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(function RichTextEditor({
  value,
  onChange,
  placeholder = "Digite aqui...",
  minHeight = 180,
}: Props, ref) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const ultimoHtmlRef = useRef("");
  const [focused, setFocused] = useState(false);

  const htmlNormalizado = useMemo(() => sanitizeRichText(value), [value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (ultimoHtmlRef.current !== htmlNormalizado) {
      editor.innerHTML = htmlNormalizado;
      ultimoHtmlRef.current = htmlNormalizado;
    }
  }, [htmlNormalizado]);

  function propagarMudanca() {
    const editor = editorRef.current;
    if (!editor) return;

    const htmlAtual = sanitizeRichText(editor.innerHTML || "");
    ultimoHtmlRef.current = htmlAtual;
    onChange(htmlAtual);
  }

  useImperativeHandle(
    ref,
    () => ({
      getHtml() {
        return sanitizeRichText(editorRef.current?.innerHTML || "");
      },
      setHtml(value: string) {
        const html = sanitizeRichText(value);
        if (editorRef.current) {
          editorRef.current.innerHTML = html;
        }
        ultimoHtmlRef.current = html;
        onChange(html);
      },
      focus() {
        editorRef.current?.focus();
      },
    }),
    [onChange]
  );

  function executar(comando: Action) {
    editorRef.current?.focus();
    document.execCommand(comando, false);
    propagarMudanca();
  }

  function limparFormatacao() {
    editorRef.current?.focus();
    document.execCommand("removeFormat", false);
    propagarMudanca();
  }

  function aoColar(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const texto = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, texto);
    propagarMudanca();
  }

  const vazio = !htmlNormalizado.trim();

  return (
    <div style={wrapper}>
      <div style={toolbar}>
        <ToolbarButton label="B" onClick={() => executar("bold")} />
        <ToolbarButton label="I" onClick={() => executar("italic")} />
        <ToolbarButton label="U" onClick={() => executar("underline")} />
        <ToolbarButton label="• Lista" onClick={() => executar("insertUnorderedList")} />
        <ToolbarButton label="1. Lista" onClick={() => executar("insertOrderedList")} />
        <ToolbarButton label="Limpar" onClick={limparFormatacao} />
      </div>

      <div style={editorShell(focused)}>
        {vazio && !focused && <div style={placeholderStyle}>{placeholder}</div>}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            propagarMudanca();
          }}
          onInput={propagarMudanca}
          onPaste={aoColar}
          style={{ ...editorStyle, minHeight }}
        />
      </div>
    </div>
  );
});

export default RichTextEditor;

function ToolbarButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        // Impede que o botão roube o foco do contentEditable e preserve a
        // seleção atual antes de aplicar negrito/itálico/lista.
        event.preventDefault();
      }}
      onClick={onClick}
      style={toolbarButton}
    >
      {label}
    </button>
  );
}

const wrapper: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const toolbar: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const toolbarButton: CSSProperties = {
  background: "rgba(15, 23, 42, 0.95)",
  color: "#fee2e2",
  border: "1px solid rgba(252, 165, 165, 0.25)",
  borderRadius: "8px",
  padding: "8px 10px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 700,
};

function editorShell(focused: boolean): CSSProperties {
  return {
    position: "relative",
    border: focused
      ? "1px solid rgba(248, 113, 113, 0.7)"
      : "1px solid #444",
    background: "#111827",
    borderRadius: "8px",
    boxShadow: focused ? "0 0 0 3px rgba(220, 38, 38, 0.12)" : "none",
  };
}

const editorStyle: CSSProperties = {
  color: "white",
  padding: "12px",
  outline: "none",
  lineHeight: "1.6",
  position: "relative",
  zIndex: 1,
};

const placeholderStyle: CSSProperties = {
  position: "absolute",
  left: "12px",
  top: "12px",
  color: "#94a3b8",
  pointerEvents: "none",
};
