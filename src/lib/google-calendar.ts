import { google } from "googleapis";
import { readJsonFile, writeJsonFile } from "./data";

interface CalendarTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
}

const TOKENS_FILE = "google-calendar-tokens.json";
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/calendar/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function getTokensFromCode(code: string): Promise<CalendarTokens> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens as CalendarTokens;
}

export async function loadTokens(): Promise<CalendarTokens | null> {
  try {
    const tokens = await readJsonFile<CalendarTokens & { lastModified?: string }>(TOKENS_FILE);
    if (!tokens.access_token) return null;
    return tokens;
  } catch {
    return null;
  }
}

export async function saveTokens(tokens: CalendarTokens): Promise<void> {
  await writeJsonFile(TOKENS_FILE, tokens);
}

export async function deleteTokens(): Promise<void> {
  const { promises: fs } = await import("fs");
  const path = await import("path");
  const dataDir = process.env.DATA_DIR;
  if (!dataDir) return;
  const filePath = path.join(dataDir, TOKENS_FILE);
  try {
    await fs.unlink(filePath);
  } catch {
    // File may not exist
  }
}

export async function getCalendarClient() {
  const tokens = await loadTokens();
  if (!tokens) throw new Error("Google Calendar not connected");

  const client = getOAuth2Client();
  client.setCredentials(tokens);

  // Auto-refresh: listen for new tokens
  client.on("tokens", async (newTokens) => {
    const merged: CalendarTokens = {
      ...tokens,
      access_token: newTokens.access_token ?? tokens.access_token,
      refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
      scope: newTokens.scope ?? tokens.scope,
      token_type: newTokens.token_type ?? tokens.token_type,
      expiry_date: newTokens.expiry_date ?? tokens.expiry_date,
    };
    await saveTokens(merged);
  });

  return google.calendar({ version: "v3", auth: client });
}

export async function fetchEvents(
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient();

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 100,
  });

  const items = res.data.items ?? [];
  return items.map((event) => ({
    id: event.id ?? "",
    title: event.summary ?? "(No title)",
    start: event.start?.dateTime ?? event.start?.date ?? "",
    end: event.end?.dateTime ?? event.end?.date ?? "",
    allDay: !event.start?.dateTime,
    location: event.location ?? "",
  }));
}
