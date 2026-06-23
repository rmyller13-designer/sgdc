import type { CSSProperties } from "react";
import { sanitizeRichText, stripRichText } from "@/lib/rich-text";

export default function RichTextContent({
  value,
  style,
  emptyText = "Nao informado",
}: {
  value: string | null | undefined;
  style?: CSSProperties;
  emptyText?: string;
}) {
  const html = sanitizeRichText(value);

  if (!stripRichText(html).trim()) {
    return <span style={style}>{emptyText}</span>;
  }

  return <div style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

