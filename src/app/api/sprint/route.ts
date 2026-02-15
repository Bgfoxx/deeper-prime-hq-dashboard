import { NextResponse } from "next/server";
import { readJsonFile, mergeAndWrite } from "@/lib/data";

export async function GET() {
  const data = await readJsonFile("sprint.json");
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const updates = await request.json();
  const result = await mergeAndWrite("sprint.json", (current: Record<string, unknown>) => ({
    ...current,
    ...updates,
  }));
  return NextResponse.json(result);
}
