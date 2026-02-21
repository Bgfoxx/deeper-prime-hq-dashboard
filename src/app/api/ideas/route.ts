import { NextResponse } from "next/server";
import { readJsonFile, mergeAndWrite } from "@/lib/data";
import { randomUUID } from "crypto";

interface Idea {
  id: string;
  title: string;
  body: string;
  source: "ivan" | "apollo";
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface IdeasData {
  ideas: Idea[];
  archive: Idea[];
  tags: string[];
  lastModified: string;
}

const DEFAULT_TAGS = ["content", "business", "personal", "tool", "strategy"];

export async function GET() {
  const data = await readJsonFile<IdeasData>("ideas.json");
  if (!data.tags || data.tags.length === 0) {
    data.tags = DEFAULT_TAGS;
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();

  const idea: Idea = {
    id: randomUUID(),
    title: body.title,
    body: body.body || "",
    source: body.source || "ivan",
    tags: body.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await mergeAndWrite<IdeasData>("ideas.json", (current) => ({
    ...current,
    ideas: [idea, ...(current.ideas || [])],
  }));
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const body = await request.json();

  if (body.action === "archive") {
    const { id } = body;
    const result = await mergeAndWrite<IdeasData>("ideas.json", (current) => {
      const idea = (current.ideas || []).find((i) => i.id === id);
      if (!idea) return current;
      return {
        ...current,
        ideas: current.ideas.filter((i) => i.id !== id),
        archive: [{ ...idea, updatedAt: new Date().toISOString() }, ...(current.archive || [])],
      };
    });
    return NextResponse.json(result);
  }

  if (body.action === "restore") {
    const { id } = body;
    const result = await mergeAndWrite<IdeasData>("ideas.json", (current) => {
      const idea = (current.archive || []).find((i) => i.id === id);
      if (!idea) return current;
      return {
        ...current,
        archive: current.archive.filter((i) => i.id !== id),
        ideas: [{ ...idea, updatedAt: new Date().toISOString() }, ...(current.ideas || [])],
      };
    });
    return NextResponse.json(result);
  }

  if (body.action === "add-tag") {
    const tag = (body.tag as string).trim().toLowerCase();
    const result = await mergeAndWrite<IdeasData>("ideas.json", (current) => {
      const existing = current.tags ?? DEFAULT_TAGS;
      if (existing.includes(tag)) return current;
      return { ...current, tags: [...existing, tag] };
    });
    return NextResponse.json(result);
  }

  if (body.action === "delete-tag") {
    const result = await mergeAndWrite<IdeasData>("ideas.json", (current) => ({
      ...current,
      tags: (current.tags ?? DEFAULT_TAGS).filter((t) => t !== body.tag),
    }));
    return NextResponse.json(result);
  }

  // Update idea by id
  const { id, ...updates } = body;
  const result = await mergeAndWrite<IdeasData>("ideas.json", (current) => ({
    ...current,
    ideas: (current.ideas || []).map((idea) =>
      idea.id === id ? { ...idea, ...updates, updatedAt: new Date().toISOString() } : idea
    ),
  }));
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const result = await mergeAndWrite<IdeasData>("ideas.json", (current) => ({
    ...current,
    archive: (current.archive || []).filter((i) => i.id !== id),
  }));
  return NextResponse.json(result);
}
