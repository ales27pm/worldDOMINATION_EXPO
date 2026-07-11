import express, { type Express } from "express";
import cors from "cors";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust the first proxy hop (Replit's reverse proxy) so that req.ip is the
// real client IP from X-Forwarded-For rather than the proxy's address.
// This is required for per-IP rate limiting to work correctly.
app.set("trust proxy", 1);

// ---------------------------------------------------------------------------
// Allowed CORS origins
// ---------------------------------------------------------------------------
// Build the allowlist from:
//   1. ALLOWED_ORIGINS env var — comma-separated list of additional origins
//      (e.g. a production domain like https://myapp.replit.app).
//   2. REPLIT_DOMAINS env var  — the proxied Replit dev/preview domain(s).
// In development we also accept localhost on common ports.
const replitDomainOrigins: string[] = (process.env.REPLIT_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean)
  .map((d) => `https://${d}`);

const extraOrigins: string[] = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const devOrigins: string[] =
  process.env.NODE_ENV !== "production"
    ? ["http://localhost:3000", "http://localhost:8080", "http://localhost:19006"]
    : [];

const allowedOrigins = new Set<string>([
  ...replitDomainOrigins,
  ...extraOrigins,
  ...devOrigins,
]);

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------
// Key rate-limit buckets by the real client IP (req.ip resolves correctly
// because trust proxy is set above). ipKeyGenerator normalises IPv6 addresses
// to a /56 subnet so IPv6 users cannot trivially bypass limits.
const clientIpKey = (req: express.Request): string =>
  ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? "unknown");

// Global limiter — applied to all routes.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  message: { error: "Too many requests, please try again later." },
});

// Limiter for the public-object storage endpoint. The ceiling is high on
// purpose: these are immutable static game assets, and a single game screen
// legitimately fires dozens of image/audio requests in one burst (mobile
// clients never retry a failed image, so a 429 leaves a permanent hole).
// Long-lived Cache-Control headers (see routes/storage.ts) keep repeat
// traffic off this endpoint entirely.
const storageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  message: { error: "Too many requests, please try again later." },
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin(requestOrigin, callback) {
      // Non-browser clients (curl, mobile app, server-to-server) send no
      // Origin header — allow them through.
      if (!requestOrigin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.has(requestOrigin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin not allowed — ${requestOrigin}`));
      }
    },
    // Explicitly deny credentialed cross-origin requests until a session
    // mechanism is intentionally introduced.
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// Static asset serving is governed solely by its own (higher) limiter below —
// stacking the global limiter on top would re-throttle legitimate asset bursts.
const STORAGE_PATH_PREFIX = "/api/storage/public-objects";
// Exact segment-boundary match, mirroring how app.use() mounts the storage
// limiter below — a prefix-like path such as "/api/storage/public-objectsX"
// must NOT slip past the global limiter unthrottled.
const isStoragePath = (path: string) =>
  path === STORAGE_PATH_PREFIX || path.startsWith(STORAGE_PATH_PREFIX + "/");
app.use((req, res, next) => {
  if (isStoragePath(req.path)) {
    next();
    return;
  }
  globalLimiter(req, res, next);
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for the storage serving endpoint.
app.use(STORAGE_PATH_PREFIX, storageLimiter);

app.use("/api", router);

export default app;
