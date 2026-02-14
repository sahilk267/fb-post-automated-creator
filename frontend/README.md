# Content Platform — Frontend

React (Vite + TypeScript + Tailwind) UI for the Content Automation Platform.

## Setup

```bash
npm install
```

## Dev

```bash
npm run dev
```

- UI: http://localhost:5173  
- API is proxied to http://localhost:8000 — run the FastAPI app separately.

Sign in with **User ID** (e.g. `1`). Seed the DB first: `python scripts/init_db.py` from the project root.

## Build

```bash
npm run build
```

Output: `dist/`. When `frontend/dist` exists, the FastAPI app serves the SPA at `/` and the API at `/api/v1`.  
**Docker:** The image builds the frontend in a multi-stage Dockerfile and includes `frontend/dist`, so `docker-compose up --build` serves the UI at http://localhost:8000.

## Features

- **Dashboard** — Counts (drafts, pending, approved), recent content
- **Content** — List, create, edit, delete (draft), submit for approval
- **Admin** — Approve/reject content, Audit logs, Users list (when logged in as admin)

Auth: MVP uses `user_id` (query param); no JWT yet.
