import { NextResponse } from "next/server";
import { readJsonFile, mergeAndWrite } from "@/lib/data";

interface AnalyticsData {
  platforms: Record<string, { name: string; entries: Array<Record<string, unknown>> }>;
  lastModified: string;
}

export async function GET() {
  const data = await readJsonFile<AnalyticsData>("analytics.json");
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { platform, entry } = body;

  const result = await mergeAndWrite<AnalyticsData>("analytics.json", (current) => {
    const platforms = { ...current.platforms };
    if (platforms[platform]) {
      platforms[platform] = {
        ...platforms[platform],
        entries: [...platforms[platform].entries, { ...entry, date: entry.date || new Date().toISOString().split("T")[0] }],
      };
    }
    return { ...current, platforms };
  });
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const result = await mergeAndWrite<AnalyticsData>("analytics.json", (current) => ({
    ...current,
    ...body,
  }));
  return NextResponse.json(result);
}
