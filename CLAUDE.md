# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Deeper Prime HQ is a local-first personal command center built with Next.js 14+ (App Router). It runs on macOS alongside an AI assistant (Apollo/OpenClaw) that reads and writes the same data files. Single-user, no auth, no external database.

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS
- **Fonts**: DM Serif Display (headings), DM Sans (body/UI), JetBrains Mono (dates/metrics) — all from Google Fonts
- **Charts**: Recharts (for analytics)
- **Data**: Local JSON files read/written via `process.env.DATA_DIR`
- **IDs**: `crypto.randomUUID()`
- **Dates**: ISO format throughout

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm start            # Run production build
bash scripts/setup.sh  # Initialize /data directory from /data-template
```

## Architecture

### Data Layer

All state lives in JSON files under the path specified by `DATA_DIR` env var (set in `.env.local`). Never hardcode data paths.

- **Main Mac**: `DATA_DIR=/users/ivansmacbook/Public/Transfer Folder/deeper-prime-data`
- **OpenClaw Mac**: `DATA_DIR=/users/gateway/Documents/Synced/deeper-prime-data`

JSON files: `sprint.json`, `tasks.json`, `kanban.json`, `content-pipeline.json`, `memory-log.json`, `analytics.json`, `docs-registry.json`. Shared docs live in a `docs/` subdirectory under DATA_DIR.

**Write protocol**: Read current file → merge changes (never blind overwrite) → write to temp file → rename. This prevents corruption and minimizes Syncthing conflict risk. Every write must update a `lastModified` timestamp.

### API Routes

Next.js route handlers provide CRUD for each JSON file using Node `fs` module. The app must gracefully handle missing/corrupted JSON files by falling back to empty defaults.

### `/data-template` Directory

Committed to git. Contains default/empty versions of all JSON schemas plus `README-APOLLO.md` (Apollo's reference manual for interacting with dashboard data). The setup script copies this to the actual data directory on first run.

### Module Structure (10 pages)

1. **Dashboard** — Overview: sprint progress, today's tasks, pipeline status, Apollo activity
2. **Sprint Tracker** — 90-day sprint with weekly objectives, metrics, reflections
3. **Tasks** — Daily task management with priorities, categories, date filtering
4. **Apollo Board** — Kanban (backlog/in-progress/review/done) for AI-delegated tasks
5. **Content Pipeline** — Content ideas through stages (idea→researching→drafting→ready→published) with per-format tracking (LinkedIn, YouTube, email)
6. **Memory Log** — Ship's log with entries by type (daily-summary, decision, learning, memory-update, manual-note), primarily written by Apollo
7. **Analytics** — Manual social media metrics tracking with historical charts
8. **Docs** — File browser/viewer for shared markdown documents
9. **Calendar** — Google Calendar API integration overlaid with Deeper Prime tasks
10. **Settings** — Sprint config, categories, calendar connections, data export/reset

### Layout

Fixed 240px sidebar (darkest tone) with navigation + sprint countdown. Main content area with 32-48px padding.

## Design System — "Warm Command Center"

Warm, premium, calm. Like a well-made leather notebook, not a SaaS product.

### Colors

| Role | Value |
|------|-------|
| Background | `#1C1917` (stone-900) |
| Surface/Cards | `#292524` (stone-800) |
| Sidebar | `#0C0A09` (stone-950) |
| Primary accent | `#D97706` (amber-600) — sparingly |
| Secondary accent | `#B45309` (copper/bronze) — hover |
| Text primary | `#FAFAF9` (stone-50) |
| Text secondary | `#A8A29E` (stone-400) |
| Success | `#6B8F71` (sage green) |
| Warning | `#F59E0B` (amber) |
| Danger | `#C2695B` (terracotta) |
| Borders | `#44403C` (stone-700) — 1px subtle |

### Components

Cards: warm surface, 1px border, slight shadow, 12-16px radius. Buttons: rounded, warm tones, 200ms hover transitions. Status badges: pill-shaped, muted, lowercase. Progress bars: rounded, amber fill on dark track. Page transitions: 300ms fade-in.

## Key Conventions

- Syncthing syncs the `/data` directory between two Macs — ignore `.sync-conflict-*` files
- `/data` is gitignored; only `/data-template` is committed
- Apollo (the AI assistant) reads/writes JSON files directly via filesystem — the Memory Log and Kanban board are the primary Apollo interaction points
- Keyboard shortcuts: Cmd+N (new task), Cmd+K (command palette)
- Desktop-only (1440px+ width), no responsive priority
- Toast/notification system for save confirmations

## Antigravity Kit (.agent/)

The `.agent` directory contains an AI agent toolkit with 20 specialist agents, 36 skills, and 11 workflows. Key agents for this project: `frontend-specialist`, `backend-specialist`, `project-planner`. Validation scripts: `.agent/scripts/checklist.py` (dev) and `.agent/scripts/verify_all.py` (pre-deploy).
