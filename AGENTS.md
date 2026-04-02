# AGENTS.md

## Cursor Cloud specific instructions

### Overview

SanFran Academy is a React SPA (Vite + TypeScript + TailwindCSS) for legal education. It has **no backend server**; it connects to managed cloud services (Supabase, Firebase, Google Gemini API). Supabase and Firebase credentials are hardcoded in source.

### Dev commands

All commands are defined in `package.json`:

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (port 3000, host 0.0.0.0) |
| Lint (TypeScript) | `npm run lint` (runs `tsc`) |
| Build | `npm run build` |
| Preview prod build | `npm run preview` |

### Notes

- The `lint` script runs `tsc` (type-checking only); there is no ESLint configured.
- No automated test framework is set up (no Jest, Vitest, etc.).
- The Gemini API key (`GEMINI_API_KEY`) is optional for core functionality. AI-powered features (flashcards, summarizer, etc.) require it in `.env.local`. The Vite config resolves it from multiple env var names: `API_KEY`, `VITE_API_KEY`, `GEMINI_API_KEY`, `VITE_GEMINI_API_KEY`.
- Supabase anon key and URL are hardcoded in `services/supabaseClient.ts`.
- Firebase config is hardcoded in `firebase-applet-config.json`.
- The app is a SPA with client-side routing via `react-router-dom`. The Vite dev server serves it on port 3000.
- All routes are authentication-gated. You must log in (via Supabase email/password auth) to access any feature beyond the login/sign-up page. Use the `TEST_LOGIN_USERNAME` and `TEST_LOGIN_PASSWORD` environment secrets for test access.
- Sign-up for new accounts may fail with "DATABASE ERROR SAVING NEW USER" due to Supabase RLS policies or project state; use existing test credentials instead.
