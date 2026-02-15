# Apollo Reference Manual — Deeper Prime HQ Data

This document describes how Apollo (the AI assistant) should interact with the Deeper Prime HQ dashboard data files.

## Data Directory

All data lives in the directory specified by the `DATA_DIR` environment variable.
- Main Mac: `/users/ivansmacbook/Public/Transfer Folder/deeper-prime-data`
- OpenClaw Mac: `/users/gateway/Documents/Synced/deeper-prime-data`

## General Conventions

- **IDs**: Use UUID format (e.g., `crypto.randomUUID()` style)
- **Dates**: Always ISO format (`2026-02-17` for dates, `2026-02-17T14:30:00.000Z` for timestamps)
- **Timestamps**: Always update `updatedAt` or `lastModified` when writing
- **Never delete data**: Move completed/archived items to archive arrays instead of deleting
- **Atomic writes**: Read file -> modify -> write to temp file -> rename. This prevents corruption and Syncthing conflicts.
- **Syncthing**: The data directory is synced between two Macs. Ignore any `.sync-conflict-*` files.

## File Schemas

### sprint.json
Contains the current 90-day sprint with weekly objectives.
- `currentSprint.weeks[].objectives[].done` — toggle to mark objectives complete
- `currentSprint.successMetrics[].current` — update numeric progress
- `currentSprint.weeks[].reflections` — markdown text for weekly reflections

### tasks.json
Daily task management.
- Tasks have: `id`, `title`, `date`, `priority` (high/medium/low), `status` (todo/in-progress/done), `category`, `notes`, `createdAt`, `completedAt`
- Set `completedAt` when marking a task as `done`

### kanban.json
Apollo's task board with 4 columns: backlog, in-progress, review, done.

**Apollo's kanban protocol:**
- When starting work on a card, move it from `backlog` to `in-progress`
- Add progress notes to the `apolloNotes` field
- When complete, move to `review` for Ivan to check
- Always update `updatedAt` when modifying a card
- Ivan will move reviewed cards to `done` or back to `in-progress`

### content-pipeline.json
Content ideas through lifecycle stages: idea -> researching -> drafting -> ready -> published.
- Each piece has per-format status (linkedin, youtube, email)
- Update per-format status independently
- Add publish dates and URLs when content goes live

### memory-log.json
The ship's log of the Deeper Prime project.

**Apollo's memory log protocol:**
- Write a `daily-summary` entry at the end of each working session
- Write a `decision` entry any time Ivan makes a strategic/tactical decision
- Write a `learning` entry when discovering something about Ivan's preferences, voice, values, or thinking
- Write a `memory-update` entry when adding to long-term memory, recording what was stored and why
- Always set `author` to `"apollo"` for Apollo-written entries
- Available tags: strategy, content, audience-signal, personal-preference, tool-building, insight, action-item

### analytics.json
Manual social media metrics tracking. Platforms: linkedin, youtube, instagram, email, whatsapp, twitter, assessment.
- Each platform has an `entries` array with date-stamped metrics
- Main metrics: followers/subscribers/members depending on platform

### agenda.json
Daily agenda entries with Apollo's morning briefing notes.
- One entry per date — POST upserts by date (no duplicates)
- Tasks and calendar events are NOT stored here — fetched live at render/send time
- Only `apolloNotes` (markdown) is persisted

**Apollo's daily agenda protocol:**
1. Each morning at ~8 AM, compose a daily briefing with priorities, reminders, and commentary
2. Write to `agenda.json` directly or via `POST /api/agenda` with `{ date: "YYYY-MM-DD", apolloNotes: "markdown" }`
3. Call `POST /api/agenda/send` to trigger Telegram delivery
4. The send endpoint auto-compiles today's tasks + calendar events + Apollo's notes into one formatted message
5. Ivan receives the message on Telegram

Entry fields: `id`, `date`, `apolloNotes`, `sentToTelegram`, `sentAt`, `createdAt`, `updatedAt`

### docs-registry.json
Index of shared documents stored in the `docs/` subdirectory.
- When adding a new document: write the file to `docs/`, then add an entry to the registry
