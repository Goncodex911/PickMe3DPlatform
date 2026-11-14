# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project rules (from docs/RuleOfAI.md — mandatory)

@docs/RuleOfAI.md

Key points: **ask before running any git command** (add/commit/push/checkout/branch/stash...) and state why; explain and get confirmation before large refactors, new dependencies, or DB/API schema changes; touch only files related to the request; when done, list changed files, summarize the change, and suggest test commands plus a plain-text commit message (convention: `feat(scope): ...`, `fix(scope): ...`). The team communicates in Vietnamese.

## Repository layout

Three independent npm projects (no root package.json / workspaces — run commands inside each folder):

- `frontend/` — Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 + Three.js. Originally forked from the `m3e-canvas` template. **Read `frontend/AGENTS.md`**: this Next.js version has breaking changes; consult `frontend/node_modules/next/dist/docs/` before writing Next.js code.
- `backend/` — Express 4 (CommonJS) + Mongoose + Socket.io.
- `slide-editor/` — PPTist (Vue/Vite, AGPL-3.0) customised for PickMe3D. See `slide-editor/PICKME.md`. Must keep LICENSE/attribution; its source must stay public.
- `docs/` — research report, IEEE paper, slides, user stories (`THUAN_USER_STORIES.md`), 3D blueprint spec, deployment plan.
- `scripts/` — root-level Node scripts (`generate-furniture-glbs.mjs`, `run_scientific_benchmark.mjs`).

## Commands

Frontend (`cd frontend`, Node ^22.12 / ^24 / >=26):
```bash
npm run dev            # http://localhost:3000
npm run typecheck      # tsc --noEmit
npm test               # vitest run (tests live next to code as *.test.ts(x) in lib/ and components/)
npx vitest run lib/floorplan-analyzer.test.ts   # single file
npx vitest run -t "test name"                    # single test by name
# On this Windows machine run vitest from PowerShell/cmd: under Git Bash every test file fails at
# load with "Cannot read properties of undefined (reading 'config')" (environment issue, not the code).
npm run build          # prebuild runs `npm run studio` (builds slide-editor into public/slide-studio/), then next build
```

Backend (`cd backend`; copy `.env.example` to `.env`):
```bash
npm run dev            # nodemon, default port 5001
npm test               # node --test tests/*.test.js
node --test tests/blueprint.test.js              # single file
node --test --test-name-pattern="Job Queue" tests/blueprint.test.js
```

Slide editor (`cd slide-editor`): `npm install --ignore-scripts` once; `npm run dev` serves on :5174. After editing it, rebuild into the frontend with `cd ../frontend && npm run studio`.

## Architecture

**Frontend ↔ backend.** All client calls go straight to the backend using `NEXT_PUBLIC_API_URL` (default `http://localhost:5001/api`), defined as a local `API_BASE` constant in each `lib/*Service.ts` and in components such as `LoginPage.tsx`. `next.config.ts` uses `output: "export"` (static site, `trailingSlash: true`, optional `NEXT_PUBLIC_BASE_PATH`), so the `app/api/*` route handlers (auth/AI proxies) do not exist in a static production deploy. Auth must call the backend directly (see commit 253a66a). Security headers in `next.config.ts` only apply in dev; `/embed/*` is the only route that can be iframed.

**Backend.** `src/server.js` → `src/routes/index.js` mounts one router per domain under `/api` (auth, users, templates, notifications, comments, collections, ai, payments, presentations, upload, admin, reports, marketplace, blueprint). Pattern: `routes/*Routes.js` → `controllers/*Controller.js` → `models/` (Mongoose) and `services/`. Auth is a JWT Bearer token (`middlewares/authMiddleware.js`). Plan gating (`free < pro < studio`, defined in `config/plans.js`) lives in `middlewares/planMiddleware.js`. The server starts without `MONGODB_URI`, and `services/billingStore.js` then falls back to in-memory Maps (`dbOn()` checks the mongoose connection), so tests and dev work without a database.

**Payments (payOS).** Without `PAYOS_CLIENT_ID/API_KEY/CHECKSUM_KEY`, checkout runs in mock mode at `/payment/mock`, and the mock webhook is accepted only in that mode. Real plan upgrades happen only after a signature-verified webhook.

**Realtime.** `services/collaborationServer.js` attaches Socket.io to the same HTTP server; the client side is `frontend/lib/collaborationClient.ts`.

**Blueprint → 3D pipeline** (main active feature, branch `thuan-3d`). Page `app/blueprint-3d/page.tsx`: uploading an image opens `BlueprintInputModal` (`autoScan`), which scans with AI, lets the user review rooms and fix walls in `VectorCorrectionCanvas`, then applies the project to `CasaSerraViewer` (Three.js, loaded with `next/dynamic`, no SSR).
- Scan: `floorplan-ai-scanner` calls backend `POST /api/ai/complete` (Gemini, JSON mode, needs login) and returns `success:false` + message on failure — never a silent template. `floorplan-analyzer` compresses the image, then `cleanupLayoutGeometry(..., { completeWallsFromRooms: true })` adds walls the AI missed (only for AI output, not for manual edits). Default model `gemini-3.5-flash`; backend falls back through `GEMINI_FALLBACK_MODELS` on 404/429/5xx/timeouts.
- `BlueprintProject.layoutData` (walls/openings/room polygons/furniture) is the source of truth when present: the viewer extrudes walls from it (`floorplan-mesh-generator`), builds non-rectangular room floors/ceilings from polygons, and places furniture GLBs at the AI positions (`lib/blueprint-scene/furnitureAssets.ts`). Without it (presets), walls come from room bounds and furniture from `lib/blueprint-scene/proceduralFurniture.ts`. Editing a room's bounds by hand drops `layoutData`.
- Floors: build polygons with `createFloorPolygonGeometry` (draws `(x, -z)` before `rotateX(-π/2)`; drawing `(x, z)` mirrors the floor along Z).
- Landscape/pool: `lib/blueprint-scene/landscape.ts` (pool only in an outdoor room named pool/hồ bơi for AI layouts).
- GLB export: `floorplan-glb-exporter` with `draco: true` sends the GLB to `POST /api/blueprint/compress-glb` (gltf-transform + draco3dgltf) and falls back to the raw file with `dracoError`.
- AI render: `lib/blueprint-scene/aiRenderClient.ts` → `POST /api/blueprint/ai-render-4k` returns 202 + `jobId`; `services/geminiImage.js` runs a Gemini image model in `services/blueprintJobQueue.js`; poll `GET /api/blueprint/jobs/:id` (owner-only). Free-tier Gemini keys have zero image quota → the job fails with a "bật billing" message.
- Frontend `lib/` modules use relative imports (vitest has no `@/` alias). Benchmarks: `lib/blueprint-benchmarks.test.ts`, `scripts/run_scientific_benchmark.mjs`.

**Slide studio.** `components/slides/SlideStudioFrame.tsx` hosts the PPTist build in an iframe and talks to it over postMessage (`PM_INIT`, `PM_SAVE`, `PM_FLUSH`, `PM_INSERT_DESIGN`, ...; protocol in `slide-editor/src/bridge/index.ts`). The host reads `NEXT_PUBLIC_SLIDE_STUDIO_URL`; the studio only accepts messages from `VITE_HOST_ORIGIN`. Decks are saved through `/api/presentations`; PPTX export lives in `backend/src/services/pptx.js`.

**i18n.** `frontend/lib/i18n.ts` (+ `i18n.payment.ts`). `i18n.parity.test.ts` enforces that every locale has the same keys, so add every new string to all locales.

## Deployment

Frontend on Vercel, backend on Render, MongoDB Atlas, Cloudinary for media. Environment-variable matrix and steps: `docs/PickMe3D_Deployment_Plan.md`.
