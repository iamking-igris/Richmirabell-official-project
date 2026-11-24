# AI migration: Express → FastAPI

All AI processing used to live in this repo's `server.ts` (an Express server
that also served the Vite app). It has been deleted. The FastAPI backend now
owns every Gemini call, and this frontend is a pure static SPA.

```
before:  React ──► Express (server.ts) ──► Gemini
                        └──► FastAPI (data only)

after:   React ──► FastAPI (/api/v1/ai/*) ──► Gemini
                        └──► Neon PostgreSQL (key, model, temperatures)
```

## 1. What Express did

`server.ts` was 2,560 lines and served three jobs at once:

1. **Dev/prod web server** — Vite middleware in dev, `dist/` + SPA fallback in prod.
2. **13 AI routes** — each built its own `GoogleGenAI` client per request, read a
   `.gemini-config.json` file next to the source for the key/model/temperatures,
   and returned `{ ok: false, message }` envelopes.
3. **A proxy back to FastAPI** — `requireAdminInfo()` called `/auth/me` on the
   backend to verify an admin session before spending quota (with a 60 s cache).

Notable properties of the old design:

- The Gemini key sat in a **gitignored JSON file on an ephemeral filesystem** —
  on a PaaS it would be lost on every deploy.
- Routes 1–6 (`extract-notes`, the three OCR routes, `review-attempt`,
  `mark-theory`) had **no authentication at all**.
- The admin guard verified sessions over HTTP against FastAPI, so it inherited
  the backend's answer but was a separate implementation.
- One fallback model id (`gemini-3.8-flash`) did not exist.

## 2. Endpoints

Base URL is `VITE_API_BASE_URL` (…`/api/v1`).

### Admin — `adminApi.*` in `src/lib/backend.ts`

| Before (Express) | After (FastAPI) | Notes |
| --- | --- | --- |
| `GET /api/admin/ai-status` | `GET /api/v1/ai/admin/status` | |
| `POST /api/admin/gemini/config` | `POST /api/v1/ai/admin/config` | |
| `POST /api/admin/set-model` | `POST /api/v1/ai/admin/model` | |
| `POST /api/admin/set-temperature` | `POST /api/v1/ai/admin/temperature` | |
| `POST /api/admin/test-ai` | `POST /api/v1/ai/admin/test` | |
| `POST /api/admin/gemini/generate-questions` | `POST /api/v1/ai/cbt/generate-questions` | weekly relay |

### Content / student

| Before | After | Notes |
| --- | --- | --- |
| `POST /api/extract-notes` | `POST /api/v1/ai/notes/extract` | now requires sign-in |
| `POST /api/ocr/extract-questions` | `POST /api/v1/ai/ocr/extract-questions` | now requires sign-in |
| `POST /api/ocr/extract-answers` | `POST /api/v1/ai/ocr/extract-answers` | now requires sign-in |
| `POST /api/ocr/extract-theory` | `POST /api/v1/ai/ocr/extract-theory` | now requires sign-in |
| `POST /api/student/review-attempt` | `POST /api/v1/ai/student/review-attempt` | **body changed**: `{attempt_id}` only |
| `POST /api/student/mark-theory` | `POST /api/v1/ai/student/mark-theory` | no current caller (kept for parity) |

### New

| Endpoint | Purpose |
| --- | --- |
| `POST /api/v1/ai/cbt/generate` | Studio question generator (was `POST /api/admin/generate-cbt-questions`; no current caller) |
| `POST /api/v1/ai/quiz/generate` | Topic/subtopic generator for the Studio editor |

### Unchanged

Paystack, auth, content, assessments, weekly examinations, students, assets and
admin settings endpoints were not touched.

## 3. Response contracts

Three envelopes exist and all are normalised by `aiRequest`:

| Shape | Source | Read by |
| --- | --- | --- |
| `{ ok: true, … }` | success | callers |
| `{ ok: false, message, code? }` | Gemini failures + AI auth | `cbt.$examId.tsx` (`err.code`), `content-errors.ts` |
| `{ detail: { code, message } }` / `{ detail: [...] }` | FastAPI validation & `AppError` | unwrapped by `aiRequest` |

`cbt.$examId.tsx` stops its retry loop when `code` is one of
`quota | rate_limit | key_missing | auth_required`, so the relay keeps that
value at the **top level** of the body.

## 4. Files changed

**Created**

| File | Purpose |
| --- | --- |
| `src/services/api/ai.ts` | `aiRequest` + `AiRequestError` (120 s timeout, bearer token, envelope flattening) |
| `docs/ai-migration.md` | this document |

**Updated**

| File | Change |
| --- | --- |
| `src/lib/extract-notes.ts` | → `POST /ai/notes/extract` |
| `src/lib/question-ocr-service.ts` | → `POST /ai/ocr/extract-{questions,answers,theory}` via a shared `runOcr` helper |
| `src/lib/backend.ts` | removed `expressAdminRequest`; `adminApi.aiStatus/setModel/setTemperature/saveGeminiConfig/testAi` and `weeklyExamsApi.generateWithGemini` now use `aiRequest` |
| `src/routes/studio/review.$attemptId.tsx` | sends `{ attempt_id }` instead of the whole attempt |
| `src/services/api/config.ts` | accepts `VITE_API_URL` as an alias of `VITE_API_BASE_URL` |
| `vite.config.ts` | `server.port: 3000` (matches CORS allow-list + OAuth redirect) |
| `package.json` | scripts and dependencies (below) |
| `.env`, `.env.example`, `README.md` | environment and run instructions |

**Deleted**

- `server.ts` (2,560 lines)
- `.gemini-config.json` (and `.gemini-config.json.tmp`)

## 5. Dependencies removed

`express`, `dotenv`, `@google/genai`, `@types/express`.

The backend gained `google-genai==1.52.0` (Google's supported Python SDK).

`tsx` was **kept** — `npm run test` runs the `node:test` suites through it
because they use extensionless imports.

Scripts:

| Before | After |
| --- | --- |
| `dev`: `tsx server.ts` | `dev`: `vite` (port 3000) |
| `start`: `node server.ts` | removed — Vercel/`vite preview` serve `dist/` |
| — | `test`: `tsx --test tests/*.test.ts` |
| `clean`: `rm -rf dist server.js` | `clean`: `rm -rf dist` |

## 6. Environment variables

**Frontend** (`.env`, only `VITE_*` reach the browser):

- `VITE_API_BASE_URL` — FastAPI origin including `/api/v1`
- `VITE_API_URL` — accepted alias
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth

**Backend** (Render service environment, or Admin → Settings):

- `GEMINI_API_KEY` — **move the key that was in this repo's `.env`**; it is no
  longer read by the frontend. It can instead be saved at runtime in
  *Admin → Settings → Gemini AI & OCR*, which stores it in Neon.
- `GEMINI_MODEL` — optional override (default `gemini-2.5-flash`)
- `AI_RATE_LIMIT` — default 60 requests/min/IP
- `AI_MAX_UPLOAD_BYTES` — default 30 MB

Removed: `FASTAPI_URL` (only `server.ts` used it).

Resolution order is **admin-saved key → env → not configured**, re-read on every
request, so a saved change applies immediately. The key is never echoed; status
responses carry a masked hint like `••••••••Ab12`.

## 7. Security changes

- **Auth added** to six routes that previously had none (`extract-notes`, the
  three OCR routes, `review-attempt`, `mark-theory`). OCR/admin generation is
  admin-only; notes OCR and student AI require a signed-in user.
- **Attempt ownership is enforced server-side.** The old route accepted a
  full client-supplied attempt; the new one takes only `attempt_id` and loads
  the row from the database, so answers cannot be forged by the browser.
- **Roles come from the session row**, never from the request.
- **Upload gate**: 30 MB decoded cap checked before decoding, MIME allowlist
  (PNG/JPEG/WebP/GIF/PDF), base64 validity check.
- **Rate limiting** shared across all AI routes (`ai_limiter`).

## 8. Testing

Frontend — `npm run lint`, `npm run build`, `npm run test` (9/9 passing).

Backend — `pytest -q`: **218 passed, 3 skipped**, including 47 new AI endpoint
tests (`tests/test_ai_endpoints.py`) covering auth/role enforcement, validation
messages, mocked-Gemini success and failure paths, and the guarantee that a raw
key never appears in a response.

No real Gemini call is made in the test suite.

## 9. Known issues / deliberate leftovers

- **Dead code, documented rather than dropped:** `POST /api/v1/ai/student/mark-theory`
  and `POST /api/v1/ai/cbt/generate` have no frontend callers today. They were
  already uncalled under Express and remain available for parity.
- **`src/routes/admin/topics.$id.tsx` L232** requests same-origin
  `/api/v1/content/assets/{key}` with no proxy — broken before this migration
  and unchanged by it.
- **`vercel.json`** still has an inert `/api` pass-through route left over from
  Express. Nothing serves `/api` on Vercel any more; removing it is safe but it
  was left alone to avoid a routing change without a deploy test.
- **`docs/` in this repo** previously described Express-only behaviour; this
  file supersedes it.
- The `review.$attemptId.tsx` response no longer carries `model`/`provider`
  (the Express route never sent them either), so `saveAttemptReview` receives
  `undefined` for both — unchanged behaviour.

## 10. Running it locally

```bash
# backend
cd richmirabel-backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # set DATABASE_URL, GEMINI_API_KEY
uvicorn app.main:app --reload # http://127.0.0.1:8000

# frontend
cd Richmirabel-frontend
npm install
cp .env.example .env          # set VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
npm run dev                   # http://localhost:3000
```

Verification without spending quota:

```bash
pytest -q                                  # backend
npm run lint && npm run test && npm run build   # frontend
```

Live check against real Gemini (uses one tiny request):

```bash
python scripts/verify_ai_live.py
```
