import { NextResponse } from "next/server";
import { getCalendarStatus } from "@/lib/calendar";

export async function GET() {
  const status = await getCalendarStatus();
  return NextResponse.json(status);
}
