# Changelog — Deeper Prime HQ Dashboard

All notable changes to this project are documented here, in reverse chronological order.

---

## [2026-02-21] Apollo Board Improvements

**Commit:** `7792a8d`

### Changed
- Clicking a card on the Apollo Board now opens the full edit modal (previously required hovering to reveal a hidden "Edit" button)
- Cards within each column are now sorted by priority: high → medium → low
- Done column badge now displays `n/6` format and turns amber when at capacity
- Fixed loading skeleton guard on Apollo Board to prevent modal unmount during data refetch (same fix previously applied to Content Pipeline)

### Added
- Done column cap: maximum 6 cards; when a card is moved to Done and the column exceeds the cap, the oldest card(s) are automatically moved to the archive — server-side, same pattern as Content Pipeline's Published column

---

## [2026-02-21] Content Studio, Task Editing, Version History

**Commit:** `4d1080c`

### Added
- **Content Studio**: full-screen overlay editor accessible by clicking any content card. Left panel holds all metadata (title, stage, angle, core idea, notes, format statuses + URLs). Right panel is a markdown draft editor with 6 format tabs: Research, YouTube, LinkedIn, Twitter/X, Instagram, Email
- **Draft version history**: every time a draft is saved, the previous version is automatically backed up. Last 10 versions per format are kept. A History panel in the Studio lets you browse versions with relative timestamps, preview them in rendered markdown, and restore any version into the editor with one click
- **Draft file system**: markdown files stored at `DATA_DIR/drafts/{piece-id}-{format}.md`; backups at `DATA_DIR/drafts/backups/{piece-id}-{format}-{timestamp}.md`
- **API routes**: `/api/content/draft` (GET/PUT) and `/api/content/draft/backups` (GET)
- **Task inline editing**: clicking the pencil icon on any task row expands an inline edit form for title, date, priority, category, and notes
- **Task History tab**: third tab on the Tasks page showing all completed tasks sorted by completion date, persistent across sessions
- **Content Angles management**: full CRUD for content angles in the Settings page — add, edit (inline with keyboard shortcuts), delete, with a 12-color preset palette
- **Twitter/X and Instagram** added as format options to all content pieces
- **Drag-and-drop** between Content Pipeline stage columns (idea → researching → drafting → ready → published)
- **Published column cap**: maximum 6 published pieces; when exceeded, the oldest (by `publishedAt`) is automatically moved to the archive
- **Archive view**: dedicated Archive tab on Content Pipeline with restore and permanent delete actions
- **Apollo content protocol** added to `README-APOLLO.md`: stage update rules, draft file naming conventions, writing protocol (preserve Ivan's edits, append alternatives below `---`), YouTube script markers

### Fixed
- Apollo-created tasks (using simplified `done: boolean` schema) now normalize on read at the API boundary — they appear correctly in the dashboard without any migration or disk changes
- **Studio Save Metadata bug**: metadata changes were silently lost due to `setState` calls in the render body causing React to restart the render cycle and reset state. Fixed by moving sync logic into `useEffect` and using functional state updater form throughout
- **Studio unmount bug**: the loading skeleton early-return in `ContentPipeline` was unmounting the Studio on every `updateContent` call (which triggers a refetch, which sets `loading = true`). Fixed by gating the skeleton screen on initial load only (`loading && content.length === 0`)

---

## [2026-02-17] Overdue Tasks, Week Navigation, iCloud Fix

**Commit:** `51de546`

### Added
- Overdue tasks (past due, not completed) now appear in the Today view on the Dashboard
- Week navigation on the Tasks page: forward/back arrows to browse tasks by week

### Fixed
- iCloud Drive aggressively evicts Turbopack `.sst` cache files, causing `.next` corruption loops. Fix: `.next` is now a symlink pointing to `.next.nosync` — iCloud ignores the `.nosync` suffix. `.next.nosync` is gitignored.

---

## [2026-02-15] icalBuddy Parser Fix, Calendar Sync Script

**Commit:** `805cd32`

### Fixed
- icalBuddy output parser rewritten to handle edge cases in Apple Calendar event formatting
- Added `scripts/sync-calendar.sh` to handle macOS TCC (privacy) permissions required for icalBuddy to access Calendar data in non-interactive environments

---

## [2026-02-14] Apple Calendar Integration, pm2, Calendar Cache

**Commit:** `3c7e3b9`

### Added
- **Apple Calendar integration** via icalBuddy: reads events directly from macOS Calendar app
- **Calendar cache** (`calendar-cache.json` in DATA_DIR): main Mac writes fresh data on every API call; OpenClaw Mac reads from cache, synced via Syncthing
- **Fallback chain** in `src/lib/calendar.ts`: icalBuddy → cache → Google Calendar → empty
- **Calendar status endpoint**: returns `{ connected, source: "apple"|"google"|"none", cachedAt? }`
- **pm2 process management**: `ecosystem.config.js` and `pm2:start` / `pm2:stop` scripts added to `package.json`
- `src/lib/apple-calendar.ts`: icalBuddy wrapper with output parser and cache read/write logic

---

## [2026-02-10] Initial Full Dashboard Build

**Commit:** `8467c0d`

### Added
Complete first build of Deeper Prime HQ Dashboard. All 10 pages, 7 API routes, and full data layer.

**Pages:**
- `/` — Dashboard: sprint progress, today's tasks, pipeline status, Apollo activity feed
- `/sprint` — 90-day sprint tracker with weekly objectives, success metrics, and reflections
- `/tasks` — Daily task management with priorities, categories, and date filtering
- `/apollo` — Kanban board for Apollo-delegated tasks (backlog / in-progress / review / done)
- `/content` — Content Pipeline: kanban board for content ideas through lifecycle stages
- `/memory` — Memory Log: ship's log with entries by type, primarily written by Apollo
- `/analytics` — Manual social media metrics tracking with Recharts historical charts
- `/docs` — File browser and viewer for shared markdown documents
- `/calendar` — Calendar page with Apple/Google Calendar integration overlay
- `/settings` — Sprint configuration, calendar connection, data export/reset

**Architecture:**
- Local-first: all state in JSON files at `DATA_DIR` (env var), no external database
- Atomic writes: read → merge → write to temp → rename, preventing Syncthing conflicts
- `mergeAndWrite()` pattern for all data mutations
- Syncthing syncs `DATA_DIR` between two Macs in real time
- Apollo (AI assistant on OpenClaw Mac) reads/writes JSON files directly

**Design system:** "Warm Command Center" — stone/amber palette, DM Serif Display headings, DM Sans body, JetBrains Mono for dates and metrics

**Infrastructure:**
- `data-template/` — committed default JSON schemas and `README-APOLLO.md` (Apollo's reference manual)
- `scripts/setup.sh` — initializes DATA_DIR from data-template on first run
- Keyboard shortcuts: Cmd+K (command palette), Cmd+N (new task)

---

## [2026-02-10] Project Initialization

**Commit:** `4cd71ef`

Initial Next.js project scaffold via `create-next-app`.
