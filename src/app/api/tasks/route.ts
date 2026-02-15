import { NextResponse } from "next/server";
import { readJsonFile, mergeAndWrite } from "@/lib/data";
import { randomUUID } from "crypto";

interface Task {
  id: string;
  title: string;
  date: string;
  priority: string;
  status: string;
  category: string;
  notes: string;
  createdAt: string;
  completedAt: string | null;
}

interface TasksData {
  tasks: Task[];
  lastModified: string;
}

export async function GET() {
  const data = await readJsonFile<TasksData>("tasks.json");
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const task: Task = {
    id: randomUUID(),
    title: body.title,
    date: body.date || new Date().toISOString().split("T")[0],
    priority: body.priority || "medium",
    status: body.status || "todo",
    category: body.category || "deeper-prime",
    notes: body.notes || "",
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  const result = await mergeAndWrite<TasksData>("tasks.json", (current) => ({
    ...current,
    tasks: [...current.tasks, task],
  }));
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  const result = await mergeAndWrite<TasksData>("tasks.json", (current) => ({
    ...current,
    tasks: current.tasks.map((t: Task) =>
      t.id === id
        ? {
            ...t,
            ...updates,
            completedAt: updates.status === "done" ? new Date().toISOString() : t.completedAt,
          }
        : t
    ),
  }));
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const result = await mergeAndWrite<TasksData>("tasks.json", (current) => ({
    ...current,
    tasks: current.tasks.filter((t: Task) => t.id !== id),
  }));
  return NextResponse.json(result);
}
