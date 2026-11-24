<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Richmirabel frontend

React + Vite SPA. It is a pure client: every AI/Gemini call goes to the
FastAPI backend, which holds the Gemini key.

- **Frontend** → Vercel (static `dist/`)
- **Backend** → Render (`richmirabel-backend`), Gemini + Neon PostgreSQL

See [`docs/ai-migration.md`](docs/ai-migration.md) for how AI processing moved
off the old Express server.

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to your backend
   (defaults to the Render deployment).
3. Start the dev server on port 3000: `npm run dev`

The Gemini key is **not** a frontend variable. Set `GEMINI_API_KEY` on the
backend (Render environment, or Admin → Settings → Gemini AI & OCR).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on http://localhost:3000 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run lint` | Type-check with `tsc --noEmit` |
| `npm run test` | `node:test` suites via `tsx` |

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` (or `VITE_API_URL`) | frontend `.env` | FastAPI base, including `/api/v1` |
| `VITE_GOOGLE_CLIENT_ID` | frontend `.env` | Google OAuth client id |
| `GEMINI_API_KEY` | **backend only** | Gemini credentials for `/api/v1/ai/*` |
| `GEMINI_MODEL` | **backend only** | Optional model override |
