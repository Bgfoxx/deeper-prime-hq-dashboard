import { NextRequest, NextResponse } from "next/server";
import { fetchCalendarEvents } from "@/lib/calendar";

export async function GET(request: NextRequest) {
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "start and end query params required" }, { status: 400 });
  }

  try {
    const events = await fetchCalendarEvents(start, end);
    return NextResponse.json({ events, connected: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch events", connected: false },
      { status: 500 }
    );
  }
}
