# Richmirabel: kits 01 to 07 applied

## Run
npm install   (if the lockfile complains, use: npm install --legacy-peer-deps)
npm run dev

## What changed
- One dashboard: /studio is the dashboard. /dashboard and /signup now redirect.
- Nav: Dashboard, Scores, Briefings, Guides, Plan. Name in header opens /studio/profile.
- Onboarding (/onboarding): class, 3 JAMB subjects (English locked), exam month, ready. Trial starts when onboarding completes, and logging in no longer restarts it.
- Dashboard: "today" card (weakest under 60% first, else rotate subjects), pace line, stats, my subjects.
- Subjects: added Economics, Financial Accounting, Literature in English, History; Government now has 3 topics. Each new topic has a note and 4 questions.
- Practice: question dots, keyboard (A-D, 1-4, arrows), unanswered confirm, result verdict and next topic.
- Notes: textbook layout, Remember box, sticky mobile practice button.
- Scores and Briefings reworked. Landing copy cleaned.
- Admin: seeded students and payments, overview panels, real topic editor (details, note blocks, questions) with validation.
- Saved browsers keep the teacher's edits and receive new subjects automatically.

## Before real students
- Replace the local payment provider with Paystack or Flutterwave and verify on a server.
- Replace the admin passcode (VITE_ADMIN_PASSCODE, default "richmirabel") with real auth.
- Password fields are not stored anywhere yet. Add real auth before launch.

## Audit repair (2026-10-23)

- Extended content model: origin, mainTopic, theory questions, optional answer keys.
- Seeded 9 demo Physics subtopics + theory on Waves/Motion.
- Functional demo JAMB CBT (`/studio/cbt/jamb`) and WAEC papers (`/studio/cbt/waec/$paperId`).
- Progress lists topic / JAMB / WAEC attempts; review page at `/studio/review/$attemptId`.
- Account demo controls: toggle, clear attempts, reset content.
- Subject page groups by main topic; DEMO badges throughout.
