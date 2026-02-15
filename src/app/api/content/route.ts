import { NextResponse } from "next/server";
import { readJsonFile, mergeAndWrite } from "@/lib/data";
import { randomUUID } from "crypto";

interface ContentPiece {
  id: string;
  title: string;
  angle: string;
  stage: string;
  formats: Record<string, { status: string; publishDate: string | null; url: string }>;
  coreIdea: string;
  notes: string;
  weekNumber: number;
  createdAt: string;
}

interface ContentData {
  content: ContentPiece[];
  angles: Array<{ id: string; name: string; color: string }>;
  lastModified: string;
}

export async function GET() {
  const data = await readJsonFile<ContentData>("content-pipeline.json");
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const piece: ContentPiece = {
    id: randomUUID(),
    title: body.title || "",
    angle: body.angle || "",
    stage: body.stage || "idea",
    formats: body.formats || {
      linkedin: { status: "not-started", publishDate: null, url: "" },
      youtube: { status: "not-started", publishDate: null, url: "" },
      email: { status: "not-started", publishDate: null, url: "" },
    },
    coreIdea: body.coreIdea || "",
    notes: body.notes || "",
    weekNumber: body.weekNumber || 0,
    createdAt: new Date().toISOString(),
  };

  const result = await mergeAndWrite<ContentData>("content-pipeline.json", (current) => ({
    ...current,
    content: [...current.content, piece],
  }));
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  const result = await mergeAndWrite<ContentData>("content-pipeline.json", (current) => ({
    ...current,
    content: current.content.map((p: ContentPiece) =>
      p.id === id ? { ...p, ...updates } : p
    ),
  }));
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const result = await mergeAndWrite<ContentData>("content-pipeline.json", (current) => ({
    ...current,
    content: current.content.filter((p: ContentPiece) => p.id !== id),
  }));
  return NextResponse.json(result);
}
