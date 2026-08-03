import { NextResponse } from "next/server";
import {
  META_OAUTH_STATE_COOKIE,
  criarEstadoOauthInstagram,
  criarUrlConexaoInstagram,
} from "@/lib/instagram-meta";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const state = criarEstadoOauthInstagram();
    const redirectUrl = criarUrlConexaoInstagram(request, state);
    const response = NextResponse.redirect(redirectUrl);
    const secure =
      process.env.NODE_ENV === "production" ||
      new URL(request.url).protocol === "https:";

    response.cookies.set(META_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    const url = new URL("/configuracoes", request.url);
    url.searchParams.set(
      "instagram",
      error instanceof Error ? "erro_config" : "erro_desconhecido"
    );
    return NextResponse.redirect(url);
  }
}
