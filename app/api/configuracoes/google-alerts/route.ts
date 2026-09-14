import { NextResponse } from "next/server";
import { obterStatusGoogleAlerts } from "@/lib/google-alerts";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, ...obterStatusGoogleAlerts() });
}
