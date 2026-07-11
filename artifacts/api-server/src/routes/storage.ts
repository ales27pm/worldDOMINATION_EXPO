import { Readable } from "stream";
import { Router, type IRouter, type Request, type Response } from "express";

import {
  ObjectNotFoundError,
  ObjectStorageService,
} from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * GET /storage/public-objects/*filePath
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * Unconditionally public — no authentication or ACL checks required.
 * Assets are uploaded via the Replit App Storage pane and searched
 * across all configured PUBLIC_OBJECT_SEARCH_PATHS.
 */
router.get(
  "/storage/public-objects/*filePath",
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join("/") : raw;

      if (!filePath) {
        res.status(400).json({ error: "Missing file path" });
        return;
      }

      // --- Path traversal validation ---
      // req.params.filePath is already URL-decoded by Express, so we must
      // inspect req.originalUrl to catch encoded traversal sequences before
      // they are decoded.
      const routePrefix = "/storage/public-objects/";
      const rawOriginalPath = req.originalUrl.split("?")[0]; // strip query string
      const prefixIdx = rawOriginalPath.indexOf(routePrefix);
      const rawFilePath =
        prefixIdx >= 0
          ? rawOriginalPath.slice(prefixIdx + routePrefix.length)
          : "";

      // 1. Reject encoded slash (%2F) or encoded dot-dot (%2E%2E) in the raw URL.
      if (/(%2f|%2e%2e)/i.test(rawFilePath)) {
        res.status(400).json({ error: "Invalid file path" });
        return;
      }

      // 2. Decode the raw path and reject any literal `..` segments.
      //    Wrap in try/catch: malformed percent sequences (e.g. `%GG`) must
      //    return 400, not fall through to the generic 500 handler.
      let decodedFilePath: string;
      try {
        decodedFilePath = decodeURIComponent(rawFilePath);
      } catch {
        res.status(400).json({ error: "Invalid file path" });
        return;
      }

      if (decodedFilePath.split("/").some((segment) => segment === "..")) {
        res.status(400).json({ error: "Invalid file path" });
        return;
      }

      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      req.log.error({ err: error }, "Error serving public object");
      res.status(500).json({ error: "Failed to serve public object" });
    }
  },
);

export default router;
