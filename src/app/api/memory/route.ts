import { NextResponse } from "next/server";
import { readJsonFile, mergeAndWrite } from "@/lib/data";
import { randomUUID } from "crypto";

interface MemoryEntry {
  id: string;
  date: string;
  author: string;
  type: string;
  title: string;
  content: string;
  tags: string[];
  relatedTo?: string;
  createdAt: string;
}

interface MemoryData {
  entries: MemoryEntry[];
  lastModified: string;
}

export async function GET() {
  const data = await readJsonFile<MemoryData>("memory-log.json");
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const entry: MemoryEntry = {
    id: randomUUID(),
    date: body.date || new Date().toISOString().split("T")[0],
    author: body.author || "ivan",
    type: body.type || "manual-note",
    title: body.title || "",
    content: body.content || "",
    tags: body.tags || [],
    relatedTo: body.relatedTo,
    createdAt: new Date().toISOString(),
  };

  const result = await mergeAndWrite<MemoryData>("memory-log.json", (current) => ({
    ...current,
    entries: [...current.entries, entry],
  }));
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  const result = await mergeAndWrite<MemoryData>("memory-log.json", (current) => ({
    ...current,
    entries: current.entries.map((e: MemoryEntry) =>
      e.id === id ? { ...e, ...updates } : e
    ),
  }));
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const result = await mergeAndWrite<MemoryData>("memory-log.json", (current) => ({
    ...current,
    entries: current.entries.filter((e: MemoryEntry) => e.id !== id),
  }));
  return NextResponse.json(result);
}
