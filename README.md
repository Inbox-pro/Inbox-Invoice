<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a634172a-5f40-4bd6-b477-01cf514c10b6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend modes

The frontend can run with or without the Express backend (`server.ts`):

| Mode | How | API served by |
| --- | --- | --- |
| Mock (default for static builds) | `npm run dev:mock`, `npm run build` | `src/services/mockApi.ts`, in the browser, persisted to `localStorage` |
| Real backend | `npm run dev`, `npm run build:backend` + `npm start` | Express (`server.ts`), persisted to `data/fatoora-db.json` |

The switch is the `VITE_USE_MOCK_API` env var: `false` uses the Express API, anything else uses the mock.
Both modes seed the same demo workspace from `server/seed.ts`. Use **Continue with UAE Demo Workspace**,
or sign in as `omar@nexusdigital.ae` / `DemoUser#2026!`. In mock mode, data lives in each visitor's browser.
To reset it, clear the `fatoora-mock-db-v1` localStorage key.

When you add or change a route in `server.ts`, update the matching handler in `src/services/mockApi.ts`.

### Deploy to Vercel

`vercel.json` builds the static SPA (`vite build` → `dist/`) in mock mode. No backend or env vars are needed.
