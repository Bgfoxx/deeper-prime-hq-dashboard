import {
  fetchAppleEvents,
  isIcalBuddyAvailable,
  readCache,
  updateCache,
  CalendarEvent,
} from "./apple-calendar";
import { fetchEvents as fetchGoogleEvents } from "./google-calendar";

export type { CalendarEvent } from "./apple-calendar";

/**
 * Unified calendar event fetcher with automatic fallback:
 * 1. icalBuddy available (main Mac) → fetch fresh, update cache, return
 * 2. icalBuddy unavailable → read cache, filter to range, return
 * 3. Cache empty/missing → try Google Calendar
 * 4. Nothing works → return []
 */
export async function fetchCalendarEvents(
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  // 1. Try cached events (populated by scripts/sync-calendar.sh which has Calendar permissions)
  try {
    const cache = await readCache();
    if (cache.events && cache.events.length > 0) {
      const startDate = timeMin.split("T")[0];
      const endDate = timeMax.split("T")[0];
      // Filter cached events to the requested range
      const filtered = cache.events.filter((e) => {
        const eventDate = e.start.split("T")[0];
        return eventDate >= startDate && eventDate <= endDate;
      });
      if (filtered.length > 0) return filtered;
      // If no events in range but cache exists, still return empty
      // (the cache is valid, just no events for this range)
      if (cache.fetchedAt) return filtered;
    }
  } catch {
    // Cache doesn't exist or is corrupt — continue
  }

  // 3. Fall back to Google Calendar
  try {
    const googleEvents = await fetchGoogleEvents(timeMin, timeMax);
    return googleEvents.map((e) => ({ ...e, source: "google" as const }));
  } catch {
    // Google Calendar not configured or failed
  }

  // 4. Nothing worked
  return [];
}

/**
 * Get calendar source status for the status endpoint.
 */
export async function getCalendarStatus(): Promise<{
  connected: boolean;
  source: "apple" | "google" | "none";
  cachedAt?: string;
}> {
  // Check Apple Calendar
  if (await isIcalBuddyAvailable()) {
    return { connected: true, source: "apple" };
  }

  // Check cache
  try {
    const cache = await readCache();
    if (cache.fetchedAt) {
      return { connected: true, source: "apple", cachedAt: cache.fetchedAt };
    }
  } catch {
    // No cache
  }

  // Check Google Calendar tokens
  try {
    const { loadTokens } = await import("./google-calendar");
    const tokens = await loadTokens();
    if (tokens) {
      return { connected: true, source: "google" };
    }
  } catch {
    // Google Calendar not available
  }

  return { connected: false, source: "none" };
}
