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

// Common paths where icalBuddy may be installed
const ICAL_BUDDY_PATHS = [
  "/opt/homebrew/bin/icalBuddy",
  "/usr/local/bin/icalBuddy",
];

// Cache the resolved path for the lifetime of the process
let icalBuddyPath: string | false | null = null;

export async function isIcalBuddyAvailable(): Promise<boolean> {
  if (icalBuddyPath !== null) return icalBuddyPath !== false;

  for (const p of ICAL_BUDDY_PATHS) {
    try {
      await execFileAsync(p, ["--version"]);
      icalBuddyPath = p;
      return true;
    } catch {
      // Try next path
    }
  }

  // Fallback: try bare command in case it's on PATH
  try {
    await execFileAsync("icalBuddy", ["--version"]);
    icalBuddyPath = "icalBuddy";
    return true;
  } catch {
    icalBuddyPath = false;
    return false;
  }
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
    const { stdout, stderr } = await execFileAsync(icalBuddyPath as string, [
      "-nrd",
      "-b", "",
      "-df", "%Y-%m-%dT%H:%M:%S",
      "-tf", "%H:%M",
      `eventsFrom:${startStr}`, `to:${endStr}`,
    ], { timeout: 10000 });

    if (stderr) console.error("[icalBuddy stderr]", stderr);
    const events = parseOutput(stdout);
    console.log(`[icalBuddy] Fetched ${events.length} events for ${startStr} to ${endStr}`);
    return events;
  } catch (err) {
    console.error("[icalBuddy] Failed to fetch events:", err);
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

  // Helper: check if a line is indented (part of an event's properties)
  const isIndented = (line: string) =>
    line.startsWith("    ") || line.startsWith("\t") || line.startsWith("           ");

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // Skip empty lines between events
    if (!line.trim()) {
      i++;
      continue;
    }

    // Title line: not deeply indented (may have 1 leading space from icalBuddy)
    if (!line.startsWith("    ") && !line.startsWith("\t")) {
      // Extract calendar name from the LAST parenthesized group
      const calMatch = line.match(/^(?:•\s*)?\s*(.+)\s+\(([^)]+)\)\s*$/);
      const title = calMatch ? calMatch[1].trim() : line.replace(/^•\s*/, "").trim();
      const calendar = calMatch ? calMatch[2] : "";

      let location = "";
      let start = "";
      let end = "";
      let allDay = false;

      // Read indented property lines — allow blank lines within the block
      i++;
      while (i < lines.length) {
        const raw = lines[i];
        const trimmed = raw.trimEnd();

        // Blank line: peek ahead to see if the next non-blank line is still indented
        if (!trimmed.trim()) {
          let j = i + 1;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && isIndented(lines[j])) {
            i++;
            continue; // blank line within the event block, skip it
          }
          break; // blank line followed by non-indented = end of event
        }

        if (!isIndented(trimmed)) break; // next event title

        const prop = trimmed.trim();

        if (prop.startsWith("location:")) {
          location = prop.replace("location:", "").trim();
        } else if (
          prop.startsWith("url:") ||
          prop.startsWith("notes:") ||
          prop.startsWith("attendees:")
        ) {
          // Skip known metadata lines (and their continuations handled by indent)
        } else if (prop.match(/^\d{4}-\d{2}-\d{2}/)) {
          // Date/time line — must START with a date to avoid matching dates in notes
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
              const allDayMatch = prop.match(/^(\d{4}-\d{2}-\d{2})/);
              if (allDayMatch) {
                start = allDayMatch[1];
                end = allDayMatch[1];
                allDay = true;
              }
            }
          }
        }
        // else: continuation of notes/attendees — ignore
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
