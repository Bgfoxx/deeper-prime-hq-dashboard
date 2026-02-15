import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode, saveTokens } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/calendar?error=denied", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/calendar?error=no_code", request.url));
  }

  try {
    const tokens = await getTokensFromCode(code);
    await saveTokens(tokens);
    return NextResponse.redirect(new URL("/calendar?connected=true", request.url));
  } catch {
    return NextResponse.redirect(new URL("/calendar?error=token_exchange_failed", request.url));
  }
}
