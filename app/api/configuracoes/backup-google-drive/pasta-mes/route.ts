import { NextResponse } from "next/server";
import { obterPastaMensalAtualGoogleDrive } from "@/lib/google-drive-backup";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pasta = await obterPastaMensalAtualGoogleDrive();
    return NextResponse.redirect(pasta.url);
  } catch {
    return NextResponse.json(
      { error: "A pasta do mes ainda nao esta disponivel." },
      { status: 404 }
    );
  }
}
