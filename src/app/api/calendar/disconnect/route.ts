import { NextResponse } from "next/server";
import { deleteTokens } from "@/lib/google-calendar";

export async function POST() {
  try {
    await deleteTokens();
    return NextResponse.json({ connected: false });
  } catch {
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
