# Threat Model

## Project Overview

A Node.js/Express 5 API server (TypeScript, pnpm workspaces) backed by PostgreSQL (Drizzle ORM) and Google Cloud Storage (Replit Object Storage). The app is deployed publicly on Replit autoscale at `https://code-react-native.replit.app`. Companion artifacts include a mobile (Expo/React Native) game app and a design/mockup sandbox.

The API currently exposes:
- `GET /api/healthz` — health check, unauthenticated
- `GET /api/storage/public-objects/*filePath` — streams public GCS objects to clients, unauthenticated by design

## Assets

- **GCS object storage** — public and private buckets. Private objects are protected by an ACL system (`objectAcl.ts`). Public objects are intentionally served without auth.
- **Database** — PostgreSQL connection managed via `DATABASE_URL` env var. Contains future application data.
- **Application secrets** — `DATABASE_URL`, GCP credentials (acquired via Replit sidecar at `http://127.0.0.1:1106`), `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`.
- **Replit sidecar** — internal endpoint used for GCP token exchange and signed URL generation.

## Trust Boundaries

- **Browser/Client → API** — all client requests cross this boundary. Currently no authentication or authorization is enforced at the API layer.
- **API → GCS** — API uses GCP external account credentials via the Replit sidecar. Compromise of sidecar endpoint or credential leak would expose all storage.
- **API → PostgreSQL** — direct connection; SQL injection would give full DB access.
- **Public → Private GCS** — the ACL system (`objectAcl.ts`) enforces this boundary per-object, but the current API only exposes public object serving with no private object download route.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/`
- Highest-risk code: `artifacts/api-server/src/lib/objectStorage.ts`, `artifacts/api-server/src/lib/objectAcl.ts`, `artifacts/api-server/src/routes/storage.ts`
- Public (unauthenticated) surfaces: `GET /api/healthz`, `GET /api/storage/public-objects/*filePath`
- Authenticated / admin surfaces: none currently implemented
- Dev-only: `artifacts/mobile/` (Expo mobile app, client-side only), `artifacts/mockup-sandbox/` (design canvas)

## Threat Categories

### Spoofing / Authentication

No authentication is currently implemented. The `cookie-parser` dependency is included but unused. Any future routes that assume authentication must add middleware explicitly — there is no global auth guard.

All API endpoints MUST validate caller identity before accessing any user-scoped data or private storage. Unauthenticated access to `GET /api/storage/public-objects/*` is intentional and acceptable only as long as those objects are truly public.

### Tampering / Input Validation

The `filePath` parameter in the public objects endpoint is taken from user input and concatenated directly into a GCS path string without sanitization. While GCS does not resolve `..` sequences in object names (preventing traditional path traversal), the lack of normalization means callers can probe arbitrary object names within the search paths.

### Information Disclosure

- CORS is configured with `app.use(cors())` (no `origin` option), which mirrors the request's `Origin` header and allows any website to read API responses cross-origin. This becomes exploitable the moment any session cookies or credentials are introduced.
- The sidecar endpoint (`http://127.0.0.1:1106`) must remain internal. It is not validated to be localhost-only in application code, relying on Replit platform networking.

### Denial of Service

No rate limiting is present on any endpoint. The public object serving endpoint performs GCS network I/O for each request, making it vulnerable to unbounded request flooding that can exhaust GCS egress, memory, or connection pools.

### Elevation of Privilege

The ACL system (`objectAcl.ts`) is well-structured but the `ObjectAccessGroupType` enum is empty — no access groups are implemented. If private object routes are added before this is populated, authorization checks will always throw an error (denying access), which is safe-by-default but incomplete.

All future database queries MUST use Drizzle ORM's parameterized APIs — no raw SQL string interpolation.
