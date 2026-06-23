const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "a",
]);

function decodeBasicEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function sanitizeRichText(input: string | null | undefined) {
  if (!input) return "";

  let html = input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sstyle=(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/javascript:/gi, "");

  html = html.replace(
    /<(\/?)([a-z0-9-]+)([^>]*)>/gi,
    (_match, slash: string, tagName: string, attrs: string) => {
      const tag = tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        return "";
      }

      if (slash) {
        return `</${tag}>`;
      }

      if (tag === "br") {
        return "<br />";
      }

      if (tag === "a") {
        const hrefMatch = attrs.match(
          /\shref=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
        );
        const href = hrefMatch
          ? hrefMatch[1] || hrefMatch[2] || hrefMatch[3] || ""
          : "";
        const seguro = /^(https?:\/\/|mailto:|tel:|\/)/i.test(href)
          ? href
          : "";

        return seguro
          ? `<a href="${seguro}" target="_blank" rel="noreferrer">`
          : "<a>";
      }

      return `<${tag}>`;
    }
  );

  html = html
    .replace(/<(p|ul|ol|li)>\s*<\/\1>/gi, "")
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br /><br />")
    .trim();

  const plain = stripRichText(html).trim();
  return plain ? html : "";
}

export function stripRichText(input: string | null | undefined) {
  if (!input) return "";

  return decodeBasicEntities(
    input
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  ).replace(/\n{3,}/g, "\n\n");
}

