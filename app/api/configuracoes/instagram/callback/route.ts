import { NextResponse } from "next/server";
import {
  META_OAUTH_STATE_COOKIE,
  concluirConexaoInstagram,
} from "@/lib/instagram-meta";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectUrl = new URL("/configuracoes", request.url);
  const erro = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const cookieState = obterCookie(request.headers.get("cookie"), META_OAUTH_STATE_COOKIE);

  if (erro) {
    redirectUrl.searchParams.set("instagram", "acesso_negado");
    return limparCookie(NextResponse.redirect(redirectUrl));
  }

  if (!code || !state || !cookieState || state !== cookieState) {
    redirectUrl.searchParams.set("instagram", "estado_invalido");
    return limparCookie(NextResponse.redirect(redirectUrl));
  }

  try {
    await concluirConexaoInstagram(request, code);
    redirectUrl.searchParams.set("instagram", "conectado");
    return limparCookie(NextResponse.redirect(redirectUrl));
  } catch {
    redirectUrl.searchParams.set("instagram", "falha_callback");
    return limparCookie(NextResponse.redirect(redirectUrl));
  }
}

function obterCookie(cookieHeader: string | null, nome: string) {
  if (!cookieHeader) return "";

  return (
    cookieHeader
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${nome}=`))
      ?.slice(nome.length + 1) || ""
  );
}

function limparCookie(response: NextResponse) {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(META_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });

  return response;
}
