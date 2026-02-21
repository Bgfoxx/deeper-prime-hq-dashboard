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
- Each piece has per-format status: linkedin, youtube, email, twitter, instagram (not-started / drafting / ready / published)
- Update per-format status independently
- Add publish dates and URLs when content goes live
- Set `publishedAt` timestamp when moving a piece to the `published` stage
- The `archive` array holds pieces removed from the active pipeline — do NOT touch the archive; archiving is Ivan's decision

**Apollo's content protocol:**
- When Ivan asks you to research a topic, update `stage` to `researching` and write research to `drafts/{piece-id}-research.md`
- When drafting, update `stage` to `drafting` and write to format-specific draft files (see below)
- When a draft is ready for Ivan's review, update `stage` to `ready` and set relevant format `status` fields to `ready`
- Never move a piece to `published` — Ivan confirms publication

## Content Drafts (drafts/ folder)

Draft documents live in `DATA_DIR/drafts/` as individual markdown files, synced via Syncthing.

**Naming convention:**
- `drafts/{piece-id}-research.md` — Research brief: hooks, angles, data points, sources
- `drafts/{piece-id}-youtube.md` — Full video script or structured outline
- `drafts/{piece-id}-linkedin.md` — LinkedIn post (hook + body + CTA)
- `drafts/{piece-id}-twitter.md` — Twitter/X thread or single post
- `drafts/{piece-id}-instagram.md` — Caption + hashtag block
- `drafts/{piece-id}-email.md` — Email newsletter version

**Writing protocol:**
1. Always read the existing file before writing — preserve Ivan's edits
2. Write clean markdown: `#` for title, `##` for sections, `-` for bullets
3. For YouTube scripts, use `[HOOK]`, `[B-ROLL]`, `[CUT TO]` markers as section labels
4. For research briefs, structure as: Hook Options → Core Argument → Supporting Evidence → Counterarguments → Angles
5. Never delete content Ivan has written — if suggesting an alternative, append below a `---` divider with a note

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

### ideas.json
The central Ideas hub — where all ideas live, regardless of source.

**Three ways to add ideas:**
1. **Ivan logs manually** — he adds ideas directly in the dashboard
2. **Ivan sends to Apollo** — he messages me on Telegram with an idea, I log it
3. **Apollo adds** — I generate ideas during research, task generation, or docs review and add them myself

**Schema:**
```json
{
  "ideas": [
    {
      "id": "uuid",
      "title": "Short idea title",
      "body": "Longer description or context",
      "source": "ivan" | "apollo",
      "tags": ["content", "tool"],
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp"
    }
  ],
  "archive": [],
  "tags": ["content", "business", "personal", "tool", "strategy"],
  "lastModified": "ISO timestamp"
}
```

**Apollo's ideas protocol:**
- When Ivan sends an idea on Telegram, add it to `ideas.json` with `source: "ivan"`
- When I generate an idea myself, add it with `source: "apollo"`
- Choose relevant tags from the `tags` array — do not invent new tags unless I also add them to the `tags` array
- Set `title` to a concise phrase (5–10 words max); put details in `body`
- Never delete ideas — archive instead if no longer relevant
- When Ivan asks to refine or elaborate on an existing idea, update it

**API endpoints:**
- `GET /api/ideas` — fetch all ideas, archive, and tags
- `POST /api/ideas` — add new idea: `{ title, body, source, tags }`
- `PUT /api/ideas` — update: `{ id, title?, body?, tags? }` or action-based:
  - `{ id, action: "archive" }` — move to archive
  - `{ id, action: "restore" }` — restore from archive
  - `{ action: "add-tag", tag: "name" }` — add a tag
  - `{ action: "delete-tag", tag: "name" }` — remove a tag
- `DELETE /api/ideas?id=...` — permanently delete from archive

### docs-registry.json
Index of shared documents stored in the `docs/` subdirectory.
- When adding a new document: write the file to `docs/`, then add an entry to the registry
