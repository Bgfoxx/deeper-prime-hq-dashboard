import { NextResponse } from "next/server";
import { loadTokens } from "@/lib/google-calendar";

export async function GET() {
  const tokens = await loadTokens();
  return NextResponse.json({ connected: !!tokens });
}
