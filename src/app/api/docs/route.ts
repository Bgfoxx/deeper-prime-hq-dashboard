import { NextResponse } from "next/server";
import { readJsonFile, mergeAndWrite, readDocFile, writeDocFile } from "@/lib/data";
import { randomUUID } from "crypto";

interface DocEntry {
  id: string;
  filename: string;
  title: string;
  category: string;
  description: string;
  addedAt: string;
  lastModified: string;
}

interface DocsData {
  docs: DocEntry[];
  lastModified: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");

  if (filename) {
    const content = await readDocFile(filename);
    return NextResponse.json({ content });
  }

  const data = await readJsonFile<DocsData>("docs-registry.json");
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const now = new Date().toISOString();

  const doc: DocEntry = {
    id: randomUUID(),
    filename: body.filename,
    title: body.title || body.filename,
    category: body.category || "strategy",
    description: body.description || "",
    addedAt: now,
    lastModified: now,
  };

  if (body.content) {
    await writeDocFile(body.filename, body.content);
  }

  const result = await mergeAndWrite<DocsData>("docs-registry.json", (current) => ({
    ...current,
    docs: [...current.docs, doc],
  }));
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, content, ...updates } = body;

  if (content && updates.filename) {
    await writeDocFile(updates.filename, content);
  }

  const result = await mergeAndWrite<DocsData>("docs-registry.json", (current) => ({
    ...current,
    docs: current.docs.map((d: DocEntry) =>
      d.id === id ? { ...d, ...updates, lastModified: new Date().toISOString() } : d
    ),
  }));
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const result = await mergeAndWrite<DocsData>("docs-registry.json", (current) => ({
    ...current,
    docs: current.docs.filter((d: DocEntry) => d.id !== id),
  }));
  return NextResponse.json(result);
}
