import { NextResponse } from "next/server";
import { readJsonFile, mergeAndWrite } from "@/lib/data";
import { randomUUID } from "crypto";

interface AgendaEntry {
  id: string;
  date: string;
  apolloNotes: string;
  sentToTelegram: boolean;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AgendaData {
  entries: AgendaEntry[];
  lastModified: string;
}

export async function GET() {
  const data = await readJsonFile<AgendaData>("agenda.json");
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const date = body.date || new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  const result = await mergeAndWrite<AgendaData>("agenda.json", (current) => {
    const existing = current.entries.find((e) => e.date === date);
    if (existing) {
      return {
        ...current,
        entries: current.entries.map((e) =>
          e.date === date
            ? { ...e, apolloNotes: body.apolloNotes, updatedAt: now }
            : e
        ),
      };
    }
    return {
      ...current,
      entries: [
        ...current.entries,
        {
          id: randomUUID(),
          date,
          apolloNotes: body.apolloNotes || "",
          sentToTelegram: false,
          sentAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
  });
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;
  const now = new Date().toISOString();

  const result = await mergeAndWrite<AgendaData>("agenda.json", (current) => ({
    ...current,
    entries: current.entries.map((e) =>
      e.id === id ? { ...e, ...updates, updatedAt: now } : e
    ),
  }));
  return NextResponse.json(result);
}
