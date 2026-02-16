import { execFile } from "child_process";
import { promisify } from "util";
import { readJsonFile, writeJsonFile } from "./data";

const execFileAsync = promisify(execFile);

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  calendar?: string;
  source?: "apple" | "google";
}

interface CalendarCache {
  events: CalendarEvent[];
  fetchedAt: string;
  lastModified: string;
}

const CACHE_FILE = "calendar-cache.json";

// Cache the icalBuddy availability check for the lifetime of the process
let icalBuddyAvailable: boolean | null = null;

export async function isIcalBuddyAvailable(): Promise<boolean> {
  if (icalBuddyAvailable !== null) return icalBuddyAvailable;

  try {
    await execFileAsync("which", ["icalBuddy"]);
    icalBuddyAvailable = true;
  } catch {
    icalBuddyAvailable = false;
  }
  return icalBuddyAvailable;
}

/**
 * Fetch events from Apple Calendar via icalBuddy.
 * Uses default output format which is the most reliable to parse.
 *
 * Default output looks like:
 *   Event Title (Calendar Name)
 *       location: Some Place
 *       2026-02-16T09:00:00 at 09:00 - 2026-02-16T10:00:00 at 10:00
 *
 *   All Day Event (Calendar Name)
 *       2026-02-16T00:00:00
 */
export async function fetchAppleEvents(
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const available = await isIcalBuddyAvailable();
  if (!available) return [];

  const startStr = startDate.split("T")[0];
  const endStr = endDate.split("T")[0];

  try {
    const { stdout } = await execFileAsync("icalBuddy", [
      "-nrd",
      "-b", "",
      "-df", "%Y-%m-%dT%H:%M:%S",
      "-tf", "%H:%M",
      `eventsFrom:${startStr}`, `to:${endStr}`,
    ], { timeout: 10000 });

    return parseOutput(stdout);
  } catch {
    return [];
  }
}

/**
 * Parse icalBuddy's default output into CalendarEvent[].
 */
function parseOutput(stdout: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = stdout.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Title line: not indented, may have bullet, contains calendar name in parens
    if (!line.startsWith("    ") && !line.startsWith("\t")) {
      const titleMatch = line.match(/^(?:•\s*)?(.+?)\s*\(([^)]+)\)\s*$/);
      const title = titleMatch ? titleMatch[1].trim() : line.replace(/^•\s*/, "").trim();
      const calendar = titleMatch ? titleMatch[2] : "";

      let location = "";
      let start = "";
      let end = "";
      let allDay = false;

      // Read indented property lines
      i++;
      while (i < lines.length && (lines[i].startsWith("    ") || lines[i].startsWith("\t"))) {
        const prop = lines[i].trim();

        if (prop.startsWith("location:")) {
          location = prop.replace("location:", "").trim();
        } else if (
          prop.startsWith("url:") ||
          prop.startsWith("notes:") ||
          prop.startsWith("attendees:")
        ) {
          // Skip
        } else if (prop.match(/\d{4}-\d{2}-\d{2}/)) {
          // Date/time line — try various formats icalBuddy may produce
          // Format 1: "2026-02-16T09:00:00 at 09:00 - 2026-02-16T10:00:00 at 10:00"
          const fullMatch = prop.match(
            /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\s+at\s+\d{2}:\d{2}\s*-\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\s+at\s+\d{2}:\d{2}/
          );
          if (fullMatch) {
            start = fullMatch[1];
            end = fullMatch[2];
          } else {
            // Format 2: "2026-02-16T09:00:00 at 09:00 - 10:00" (same day, end time only)
            const sameDayMatch = prop.match(
              /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\s+at\s+\d{2}:\d{2}\s*-\s*(\d{2}:\d{2})/
            );
            if (sameDayMatch) {
              start = sameDayMatch[1];
              end = start.split("T")[0] + "T" + sameDayMatch[2] + ":00";
            } else {
              // Format 3: all-day — just a date like "2026-02-16T00:00:00"
              const allDayMatch = prop.match(/(\d{4}-\d{2}-\d{2})/);
              if (allDayMatch) {
                start = allDayMatch[1];
                end = allDayMatch[1];
                allDay = true;
              }
            }
          }
        }
        i++;
      }

      if (start) {
        const id = `ical-${Buffer.from(`${title}-${start}`).toString("base64url").slice(0, 16)}`;
        events.push({
          id,
          title: title || "(No title)",
          start,
          end: end || start,
          allDay,
          location,
          calendar,
          source: "apple",
        });
      }
      continue;
    }
    i++;
  }

  return events;
}

/**
 * Read the calendar cache from DATA_DIR.
 */
export async function readCache(): Promise<CalendarCache> {
  return readJsonFile<CalendarCache>(CACHE_FILE);
}

/**
 * Write events to the calendar cache.
 */
export async function updateCache(events: CalendarEvent[]): Promise<void> {
  const cache: Omit<CalendarCache, "lastModified"> = {
    events,
    fetchedAt: new Date().toISOString(),
  };
  await writeJsonFile(CACHE_FILE, cache);
}
