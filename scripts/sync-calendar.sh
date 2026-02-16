#!/bin/bash
# Syncs Apple Calendar events to calendar-cache.json
# Run from Terminal (which has Calendar permissions) via cron or launchd
# Usage: bash scripts/sync-calendar.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load DATA_DIR from .env.local
DATA_DIR=$(grep '^DATA_DIR=' "$PROJECT_DIR/.env.local" | cut -d= -f2-)

if [ -z "$DATA_DIR" ]; then
  echo "ERROR: DATA_DIR not found in .env.local"
  exit 1
fi

CACHE_FILE="$DATA_DIR/calendar-cache.json"
ICAL_BUDDY="/opt/homebrew/bin/icalBuddy"

if [ ! -x "$ICAL_BUDDY" ]; then
  ICAL_BUDDY="/usr/local/bin/icalBuddy"
fi

if [ ! -x "$ICAL_BUDDY" ]; then
  echo "ERROR: icalBuddy not found"
  exit 1
fi

# Fetch events: 1 week back, 1 month forward
START=$(date -v-7d +%Y-%m-%d)
END=$(date -v+1m +%Y-%m-%d)

# Write icalBuddy output to temp file
TMP_RAW=$(mktemp)
trap 'rm -f "$TMP_RAW"' EXIT

"$ICAL_BUDDY" -nrd -b "" -df "%Y-%m-%dT%H:%M:%S" -tf "%H:%M" "eventsFrom:$START" "to:$END" > "$TMP_RAW" 2>/dev/null || true

if [ ! -s "$TMP_RAW" ]; then
  echo "No events found or icalBuddy failed"
  exit 0
fi

# Parse with Node.js
node -e "
const fs = require('fs');
const raw = fs.readFileSync(process.argv[1], 'utf8');
const lines = raw.split('\n');
const events = [];
let i = 0;
const isIndented = (l) => l.startsWith('    ') || l.startsWith('\t') || l.startsWith('           ');

while (i < lines.length) {
  const line = lines[i].trimEnd();
  if (!line.trim()) { i++; continue; }
  if (!line.startsWith('    ') && !line.startsWith('\t')) {
    const calMatch = line.match(/^(?:•\s*)?\s*(.+)\s+\(([^)]+)\)\s*$/);
    const title = calMatch ? calMatch[1].trim() : line.replace(/^•\s*/, '').trim();
    const calendar = calMatch ? calMatch[2] : '';
    let location = '', start = '', end = '', allDay = false;
    i++;
    while (i < lines.length) {
      const trimmed = lines[i].trimEnd();
      if (!trimmed.trim()) {
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        if (j < lines.length && isIndented(lines[j])) { i++; continue; }
        break;
      }
      if (!isIndented(trimmed)) break;
      const prop = trimmed.trim();
      if (prop.startsWith('location:')) {
        location = prop.replace('location:', '').trim();
      } else if (prop.startsWith('url:') || prop.startsWith('notes:') || prop.startsWith('attendees:')) {
        // skip
      } else if (prop.match(/^\d{4}-\d{2}-\d{2}/)) {
        const fullMatch = prop.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\s+at\s+\d{2}:\d{2}\s*-\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\s+at\s+\d{2}:\d{2}/);
        if (fullMatch) { start = fullMatch[1]; end = fullMatch[2]; }
        else {
          const sameDayMatch = prop.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\s+at\s+\d{2}:\d{2}\s*-\s*(\d{2}:\d{2})/);
          if (sameDayMatch) { start = sameDayMatch[1]; end = start.split('T')[0] + 'T' + sameDayMatch[2] + ':00'; }
          else {
            const allDayMatch = prop.match(/^(\d{4}-\d{2}-\d{2})/);
            if (allDayMatch) { start = allDayMatch[1]; end = allDayMatch[1]; allDay = true; }
          }
        }
      }
      i++;
    }
    if (start) {
      const id = 'ical-' + Buffer.from(title + '-' + start).toString('base64url').slice(0, 16);
      events.push({ id, title, start, end: end || start, allDay, location, calendar, source: 'apple' });
    }
    continue;
  }
  i++;
}

const cache = {
  events,
  fetchedAt: new Date().toISOString(),
  lastModified: new Date().toISOString()
};

// Atomic write
const tmpFile = process.argv[2] + '.tmp';
fs.writeFileSync(tmpFile, JSON.stringify(cache, null, 2));
fs.renameSync(tmpFile, process.argv[2]);
console.log('Synced ' + events.length + ' events to cache');
" "$TMP_RAW" "$CACHE_FILE"
