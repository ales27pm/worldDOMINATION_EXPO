/**
 * Build a URL to a public game asset served from object storage.
 *
 * Assets live in the bucket's public search path and are served by the API
 * server at GET /api/storage/public-objects/<filePath>.
 *
 * Usage:
 *   import { assetUrl } from '../lib/assetUrl';
 *   <Image source={{ uri: assetUrl('public/risk/world-map.png') }} />
 *
 * Base-URL resolution order:
 *   1. Constants.expoConfig.extra.apiBaseUrl (explicit override, if configured)
 *   2. EXPO_PUBLIC_API_BASE_URL (explicit env override)
 *   3. EXPO_PUBLIC_DOMAIN — set by the dev workflow and baked into production
 *      builds by scripts/build.js, so native and web resolve the same origin.
 */

import Constants from "expo-constants";

function getApiBase(): string {
  const extra =
    (Constants.expoConfig?.extra as Record<string, string> | undefined)
      ?.apiBaseUrl ?? "";
  if (extra) return extra.replace(/\/$/, "");

  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
  if (explicit) return explicit.replace(/\/$/, "");

  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
  if (domain) {
    return `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  return "";
}

/**
 * Returns the full URL for a public object-storage asset.
 *
 * @param filePath  Path relative to the bucket's public search path,
 *                  e.g. "public/risk/sfx/click.mp3".
 */
export function assetUrl(filePath: string): string {
  const base = getApiBase();
  const path = filePath.replace(/^\//, "");
  return `${base}/api/storage/public-objects/${path}`;
}
