import { promises as fs } from "fs";
import path from "path";
import os from "os";

function getDataDir(): string {
  const dir = process.env.DATA_DIR;
  if (!dir) throw new Error("DATA_DIR environment variable is not set");
  return dir;
}

function getFilePath(filename: string): string {
  return path.join(getDataDir(), filename);
}

const defaults: Record<string, unknown> = {
  "sprint.json": { currentSprint: null, pastSprints: [], lastModified: new Date().toISOString() },
  "tasks.json": { tasks: [], lastModified: new Date().toISOString() },
  "kanban.json": {
    columns: [
      { id: "backlog", title: "Backlog", cards: [] },
      { id: "in-progress", title: "In Progress", cards: [] },
      { id: "review", title: "Review", cards: [] },
      { id: "done", title: "Done", cards: [] },
    ],
    archive: [],
    lastModified: new Date().toISOString(),
  },
  "content-pipeline.json": { content: [], angles: [], lastModified: new Date().toISOString() },
  "memory-log.json": { entries: [], lastModified: new Date().toISOString() },
  "analytics.json": { platforms: {}, lastModified: new Date().toISOString() },
  "docs-registry.json": { docs: [], lastModified: new Date().toISOString() },
  "agenda.json": { entries: [], lastModified: new Date().toISOString() },
};

export async function readJsonFile<T>(filename: string): Promise<T> {
  const filePath = getFilePath(filename);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return (defaults[filename] ?? {}) as T;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function writeJsonFile<T extends object>(
  filename: string,
  data: T
): Promise<void> {
  const filePath = getFilePath(filename);
  const dir = path.dirname(filePath);

  await fs.mkdir(dir, { recursive: true });

  const updated = { ...(data as Record<string, unknown>), lastModified: new Date().toISOString() };
  const content = JSON.stringify(updated, null, 2);

  // Atomic write: write to temp, then rename
  const tmpFile = path.join(os.tmpdir(), `dp-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  await fs.writeFile(tmpFile, content, "utf-8");
  await fs.rename(tmpFile, filePath);
}

export async function mergeAndWrite<T extends object>(
  filename: string,
  mergeFn: (current: T) => T
): Promise<T> {
  const current = await readJsonFile<T>(filename);
  const merged = mergeFn(current);
  await writeJsonFile(filename, merged);
  return merged;
}

export async function readDocFile(filename: string): Promise<string> {
  const filePath = path.join(getDataDir(), "docs", filename);
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

export async function writeDocFile(filename: string, content: string): Promise<void> {
  const dir = path.join(getDataDir(), "docs");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content, "utf-8");
}

export async function listDocFiles(): Promise<string[]> {
  const dir = path.join(getDataDir(), "docs");
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => !f.startsWith(".") && !f.includes(".sync-conflict-"));
  } catch {
    return [];
  }
}
