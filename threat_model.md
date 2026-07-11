# Threat Model

## Project Overview

A Node.js/Express 5 API server (TypeScript, pnpm workspaces) backed by PostgreSQL (Drizzle ORM) and Google Cloud Storage (Replit Object Storage). The app is deployed publicly on Replit autoscale at `https://code-react-native.replit.app`. Companion artifacts include a mobile (Expo/React Native) game app ("World Domination", fully client-side storage via AsyncStorage/SQLite — no server-side game backend) and a design/mockup sandbox (dev-only canvas).

The API currently exposes:
- `GET /api/healthz` — health check, unauthenticated
- `GET /api/storage/public-objects/*filePath` — streams public GCS objects to clients, unauthenticated by design

## Assets

- **GCS object storage** — public and private buckets. Private objects are protected by an ACL system (`objectAcl.ts`). Public objects are intentionally served without auth.
- **Database** — PostgreSQL connection managed via `DATABASE_URL` env var. Schema (`lib/db/src/schema/index.ts`) is currently empty boilerplate — no application data yet.
- **Application secrets** — `DATABASE_URL`, GCP credentials (acquired via Replit sidecar at `http://127.0.0.1:1106`), `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`.
- **Replit sidecar** — internal endpoint used for GCP token exchange and signed URL generation.

## Trust Boundaries

- **Browser/Client → API** — all client requests cross this boundary. Currently no authentication or authorization is enforced at the API layer (no user-scoped endpoints exist yet).
- **API → GCS** — API uses GCP external account credentials via the Replit sidecar. Compromise of sidecar endpoint or credential leak would expose all storage.
- **API → PostgreSQL** — direct connection; SQL injection would give full DB access. No custom queries exist yet beyond Drizzle scaffolding.
- **Public → Private GCS** — the ACL system (`objectAcl.ts`) enforces this boundary per-object. `ObjectStorageService.downloadObject()` gates on `opts.assumePublic === true || aclPolicy.visibility === 'public'` and throws `ObjectNotFoundError` otherwise — the public-objects route passes `assumePublic: true` only because it already restricts the search to `PUBLIC_OBJECT_SEARCH_PATHS`, and any object outside that path space or without public ACL is correctly rejected. This boundary is properly enforced in the current code.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/`
- Highest-risk code: `artifacts/api-server/src/lib/objectStorage.ts`, `artifacts/api-server/src/lib/objectAcl.ts`, `artifacts/api-server/src/routes/storage.ts`
- Public (unauthenticated) surfaces: `GET /api/healthz`, `GET /api/storage/public-objects/*filePath`
- Authenticated / admin surfaces: none currently implemented
- Dev-only: `artifacts/mobile/` (Expo mobile app, fully client-side — game state persists locally via AsyncStorage/SQLite in `artifacts/mobile/db/`, no server component reads/writes it), `artifacts/mockup-sandbox/` (design canvas)
- Boilerplate/template code, not project-specific: `artifacts/mobile/server/serve.js` and `artifacts/mobile/server/templates/landing-page.html` are copied verbatim from the `expo` artifact skill template (`.local/skills/artifacts/artifacts/expo/files/server/serve.js`). It reflects `Host`/`X-Forwarded-Host` into the landing page HTML unescaped; this is a shared platform template behind Replit's reverse proxy (not attacker-controlled in normal deployment) and not something this project's code introduced — treat changes here as template-level, not app-level, findings.

## Threat Categories

### Spoofing / Authentication

No authentication is currently implemented. The `cookie-parser` dependency is included but unused. Any future routes that assume authentication must add middleware explicitly — there is no global auth guard.

All API endpoints MUST validate caller identity before accessing any user-scoped data or private storage. Unauthenticated access to `GET /api/storage/public-objects/*` is intentional and acceptable only as long as those objects are truly public.

### Tampering / Input Validation

The `filePath` parameter in the public objects endpoint is sanitized: encoded traversal sequences (`%2f`, `%2e%2e`) are blocked on the raw URL, and literal `..` segments are blocked after decoding. Since GCS does not resolve `..` patterns as directory traversal in object names, residual double-encoded bypasses (`%252e%252e`) are not exploitable in practice.

### Information Disclosure

- ACL enforcement before serving is correctly implemented: `downloadObject()` throws `ObjectNotFoundError` unless the object is under a public search path (`assumePublic`) or has `aclPolicy.visibility === 'public'`. There is no current bypass allowing a private-ACL object to be streamed publicly.
- CORS is configured with an allowlist of allowed origins derived from `REPLIT_DOMAINS` and `ALLOWED_ORIGINS` env vars. `credentials: false` is enforced until a session mechanism is introduced. This is correctly hardened.
- The sidecar endpoint (`http://127.0.0.1:1106`) must remain internal. It is not validated to be localhost-only in application code, relying on Replit platform networking.
- `logger.ts` redacts `req.headers.authorization`, `req.headers.cookie`, and `res.headers['set-cookie']` from logs — appropriate given no session mechanism exists yet.

### Denial of Service

Per-IP rate limiting is applied globally (120 req/min) and more strictly on the storage endpoint (60 req/min) using `express-rate-limit` with `trust proxy: 1` so that `req.ip` reflects the real client IP from Replit's reverse proxy. IPv6 addresses are normalized to /56 subnets.

### Elevation of Privilege

The ACL system (`objectAcl.ts`) is well-structured but the `ObjectAccessGroupType` enum is empty — no access groups are implemented. If private object routes are added before this is populated, authorization checks will always throw an error (denying access), which is safe-by-default but incomplete.

All future database queries MUST use Drizzle ORM's parameterized APIs — no raw SQL string interpolation.
