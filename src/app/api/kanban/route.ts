import { NextResponse } from "next/server";
import { readJsonFile, mergeAndWrite } from "@/lib/data";
import { randomUUID } from "crypto";

interface Card {
  id: string;
  title: string;
  description: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  apolloNotes: string;
}

interface Column {
  id: string;
  title: string;
  cards: Card[];
}

interface KanbanData {
  columns: Column[];
  archive: Card[];
  labels: string[];
  lastModified: string;
}

export async function GET() {
  const data = await readJsonFile<KanbanData>("kanban.json");
  // Seed labels if missing from live file
  if (!data.labels || data.labels.length === 0) {
    data.labels = DEFAULT_LABELS;
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { columnId, ...cardData } = body;

  const card: Card = {
    id: randomUUID(),
    title: cardData.title,
    description: cardData.description || "",
    priority: cardData.priority || "medium",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    labels: cardData.labels || [],
    apolloNotes: cardData.apolloNotes || "",
  };

  const result = await mergeAndWrite<KanbanData>("kanban.json", (current) => ({
    ...current,
    columns: current.columns.map((col) =>
      col.id === (columnId || "backlog")
        ? { ...col, cards: [...col.cards, card] }
        : col
    ),
  }));
  return NextResponse.json(result);
}

const DONE_CAP = 6;
const DEFAULT_LABELS = ["research", "tool-building", "content", "admin"];

export async function PUT(request: Request) {
  const body = await request.json();

  if (body.action === "move") {
    const { cardId, fromColumn, toColumn, toIndex } = body;
    const result = await mergeAndWrite<KanbanData>("kanban.json", (current) => {
      const cols = current.columns.map((col) => ({ ...col, cards: [...col.cards] }));
      const fromCol = cols.find((c) => c.id === fromColumn);
      const toCol = cols.find((c) => c.id === toColumn);
      if (!fromCol || !toCol) return current;

      const cardIdx = fromCol.cards.findIndex((c) => c.id === cardId);
      if (cardIdx === -1) return current;

      const [card] = fromCol.cards.splice(cardIdx, 1);
      card.updatedAt = new Date().toISOString();
      toCol.cards.splice(toIndex, 0, card);

      // Auto-archive oldest cards when Done column exceeds cap
      let archive = [...(current.archive || [])];
      if (toColumn === "done" && toCol.cards.length > DONE_CAP) {
        const sorted = [...toCol.cards].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
        const toArchive = sorted.slice(0, sorted.length - DONE_CAP);
        const archiveIds = new Set(toArchive.map((c) => c.id));
        toCol.cards = toCol.cards.filter((c) => !archiveIds.has(c.id));
        archive = [...toArchive, ...archive];
      }

      return { ...current, columns: cols, archive };
    });
    return NextResponse.json(result);
  }

  // Label management
  if (body.action === "add-label") {
    const label = (body.label as string).trim().toLowerCase();
    const result = await mergeAndWrite<KanbanData>("kanban.json", (current) => {
      const existing = current.labels ?? DEFAULT_LABELS;
      if (existing.includes(label)) return current;
      return { ...current, labels: [...existing, label] };
    });
    return NextResponse.json(result);
  }

  if (body.action === "delete-label") {
    const result = await mergeAndWrite<KanbanData>("kanban.json", (current) => ({
      ...current,
      labels: (current.labels ?? DEFAULT_LABELS).filter((l) => l !== body.label),
    }));
    return NextResponse.json(result);
  }

  // Restore card from archive to backlog
  if (body.action === "restore") {
    const { cardId } = body;
    const result = await mergeAndWrite<KanbanData>("kanban.json", (current) => {
      const card = (current.archive || []).find((c) => c.id === cardId);
      if (!card) return current;
      return {
        ...current,
        archive: current.archive.filter((c) => c.id !== cardId),
        columns: current.columns.map((col) =>
          col.id === "done"
            ? { ...col, cards: [{ ...card, updatedAt: new Date().toISOString() }, ...col.cards] }
            : col
        ),
      };
    });
    return NextResponse.json(result);
  }

  // Update card
  const { cardId, ...updates } = body;
  const result = await mergeAndWrite<KanbanData>("kanban.json", (current) => ({
    ...current,
    columns: current.columns.map((col) => ({
      ...col,
      cards: col.cards.map((card) =>
        card.id === cardId
          ? { ...card, ...updates, updatedAt: new Date().toISOString() }
          : card
      ),
    })),
  }));
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get("cardId");
  const columnId = searchParams.get("columnId");
  const action = searchParams.get("action");

  if (action === "archive") {
    const result = await mergeAndWrite<KanbanData>("kanban.json", (current) => {
      let archivedCard: Card | undefined;
      const columns = current.columns.map((col) => {
        if (col.id === columnId) {
          const idx = col.cards.findIndex((c) => c.id === cardId);
          if (idx !== -1) {
            archivedCard = col.cards[idx];
            return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
          }
        }
        return col;
      });
      return {
        ...current,
        columns,
        archive: archivedCard ? [...(current.archive || []), archivedCard] : (current.archive || []),
      };
    });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
