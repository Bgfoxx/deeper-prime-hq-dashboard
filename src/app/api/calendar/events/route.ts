import { NextRequest, NextResponse } from "next/server";
import { fetchEvents, loadTokens } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "start and end query params required" }, { status: 400 });
  }

  const tokens = await loadTokens();
  if (!tokens) {
    return NextResponse.json({ events: [], connected: false });
  }

  try {
    const events = await fetchEvents(start, end);
    return NextResponse.json({ events, connected: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch events", connected: true },
      { status: 500 }
    );
  }
}
