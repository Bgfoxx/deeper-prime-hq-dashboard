import { NextResponse } from "next/server";
import { readJsonFile, mergeAndWrite } from "@/lib/data";
import { randomUUID } from "crypto";

const PUBLISHED_CAP = 6;

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
  publishedAt?: string | null;
}

interface ContentData {
  content: ContentPiece[];
  archive: ContentPiece[];
  angles: Array<{ id: string; name: string; color: string }>;
  lastModified: string;
}

const defaultFormatEntry = { status: "not-started", publishDate: null, url: "" };

function normalizeFormats(formats: Record<string, { status: string; publishDate: string | null; url: string }>) {
  return {
    linkedin: formats.linkedin ?? { ...defaultFormatEntry },
    youtube: formats.youtube ?? { ...defaultFormatEntry },
    email: formats.email ?? { ...defaultFormatEntry },
    twitter: formats.twitter ?? { ...defaultFormatEntry },
    instagram: formats.instagram ?? { ...defaultFormatEntry },
  };
}

export async function GET() {
  const data = await readJsonFile<ContentData>("content-pipeline.json");
  const normalized = {
    ...data,
    archive: data.archive ?? [],
    content: data.content.map((p) => ({ ...p, formats: normalizeFormats(p.formats) })),
  };
  return NextResponse.json(normalized);
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
      twitter: { status: "not-started", publishDate: null, url: "" },
      instagram: { status: "not-started", publishDate: null, url: "" },
    },
    coreIdea: body.coreIdea || "",
    notes: body.notes || "",
    weekNumber: body.weekNumber || 0,
    createdAt: new Date().toISOString(),
    publishedAt: null,
  };

  const result = await mergeAndWrite<ContentData>("content-pipeline.json", (current) => ({
    ...current,
    archive: current.archive ?? [],
    content: [...current.content, piece],
  }));
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, action, ...updates } = body;

  // Angle CRUD
  if (action === "add-angle") {
    const newAngle = { id: randomUUID(), name: updates.name as string, color: (updates.color as string) || "#D97706" };
    const result = await mergeAndWrite<ContentData>("content-pipeline.json", (current) => ({
      ...current,
      archive: current.archive ?? [],
      angles: [...current.angles, newAngle],
    }));
    return NextResponse.json(result);
  }

  if (action === "update-angle") {
    const result = await mergeAndWrite<ContentData>("content-pipeline.json", (current) => ({
      ...current,
      archive: current.archive ?? [],
      angles: current.angles.map((a) =>
        a.id === id ? { ...a, name: (updates.name as string) ?? a.name, color: (updates.color as string) ?? a.color } : a
      ),
    }));
    return NextResponse.json(result);
  }

  if (action === "delete-angle") {
    const result = await mergeAndWrite<ContentData>("content-pipeline.json", (current) => ({
      ...current,
      archive: current.archive ?? [],
      angles: current.angles.filter((a) => a.id !== id),
    }));
    return NextResponse.json(result);
  }

  // Archive a piece (move from content to archive)
  if (action === "archive") {
    const result = await mergeAndWrite<ContentData>("content-pipeline.json", (current) => {
      const piece = current.content.find((p) => p.id === id);
      if (!piece) return current;
      return {
        ...current,
        archive: current.archive ?? [],
        content: current.content.filter((p) => p.id !== id),
        // Prepend so newest archived piece appears first
        ...(piece ? { archive: [piece, ...(current.archive ?? [])] } : {}),
      };
    });
    return NextResponse.json(result);
  }

  // Restore a piece from archive back to content (stage: "ready")
  if (action === "restore") {
    const result = await mergeAndWrite<ContentData>("content-pipeline.json", (current) => {
      const piece = (current.archive ?? []).find((p) => p.id === id);
      if (!piece) return current;
      const restored = { ...piece, stage: "ready", publishedAt: null };
      return {
        ...current,
        archive: (current.archive ?? []).filter((p) => p.id !== id),
        content: [...current.content, restored],
      };
    });
    return NextResponse.json(result);
  }

  // Standard update
  const result = await mergeAndWrite<ContentData>("content-pipeline.json", (current) => {
    const now = new Date().toISOString();
    let updatedContent = current.content.map((p: ContentPiece) =>
      p.id === id
        ? {
            ...p,
            ...updates,
            publishedAt: updates.stage === "published" && p.stage !== "published" ? now : p.publishedAt,
          }
        : p
    );

    let archive = current.archive ?? [];

    // Auto-cap: if piece just became published, enforce the cap
    if (updates.stage === "published") {
      const published = updatedContent
        .filter((p) => p.stage === "published")
        .sort((a, b) => {
          const aDate = a.publishedAt || a.createdAt;
          const bDate = b.publishedAt || b.createdAt;
          return aDate.localeCompare(bDate); // oldest first
        });

      if (published.length > PUBLISHED_CAP) {
        const toArchive = published.slice(0, published.length - PUBLISHED_CAP);
        const archiveIds = new Set(toArchive.map((p) => p.id));
        archive = [...toArchive, ...archive];
        updatedContent = updatedContent.filter((p) => !archiveIds.has(p.id));
      }
    }

    return { ...current, content: updatedContent, archive };
  });

  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const from = searchParams.get("from"); // "archive" | "content"

  const result = await mergeAndWrite<ContentData>("content-pipeline.json", (current) => {
    if (from === "archive") {
      return { ...current, archive: (current.archive ?? []).filter((p) => p.id !== id) };
    }
    return { ...current, content: current.content.filter((p) => p.id !== id) };
  });
  return NextResponse.json(result);
}
