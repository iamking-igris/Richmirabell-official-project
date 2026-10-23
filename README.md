# Richmirabel (frontend prototype)

Nigerian WAEC/JAMB exam-prep UI for Baba Neh. **Frontend + local mock data only** — no Firebase, Paystack, or production backend in this phase.

## Run

```bash
npm install --legacy-peer-deps
npm run dev
```

Open `http://127.0.0.1:8080/studio` (after local sign-in / onboarding).

## Demo mode

- Default **on** in the session store.
- Account → **Demo / test controls**: toggle demo mode, clear demo attempts, reset content seed.
- Demo Physics subtopics, JAMB CBT (40 synthetic questions), and WAEC papers are labelled **DEMO**.
- They are **not** teacher-approved educational content.

## Inventory (demo seed)

- Physics demo topics: 9 subtopics under main topics (Measurements, Motion, Forces, Work/Energy, Waves, Light, Electricity, Heat)
- ≥5 MCQ + 2 theory per demo topic
- Shipped: Waves + Linear motion (with objectives + theory)
- JAMB bank: 40 items (English, Physics, Maths, Chemistry)
- WAEC demo papers: 2 (Physics objective + theory)

## Honesty

- Only Physics is available for student learning in production-facing catalogue.
- Math / English / Chemistry remain “Being prepared”.
- Payments and access are **simulated** on-device.
- Auth is local demo state, not production accounts.

## Scripts

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
# Richmirabell-official-project
