/**
 * Build a URL to a public game asset served from object storage.
 *
 * Assets are uploaded via the Replit App Storage pane and served by the API
 * server at GET /api/storage/public-objects/<filePath>.
 *
 * Usage:
 *   import { assetUrl } from '../lib/assetUrl';
 *   <Image source={{ uri: assetUrl('generals/napoleon.png') }} />
 *
 * The API_BASE_URL env variable is set automatically by Expo via app.config.js.
 * Falls back to the Replit dev domain during development if not set.
 */

import Constants from "expo-constants";

function getApiBase(): string {
  // Injected by app.config.js extra → available at runtime via Constants.expoConfig
  const base =
    (Constants.expoConfig?.extra as Record<string, string> | undefined)
      ?.apiBaseUrl ?? "";
  if (base) return base.replace(/\/$/, "");

  // Fallback for local Expo Go development
  if (__DEV__) {
    const devDomain = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
    if (devDomain) return devDomain.replace(/\/$/, "");
  }

  return "";
}

/**
 * Returns the full URL for a public object-storage asset.
 *
 * @param filePath  Relative path within the bucket's public search path,
 *                  e.g. "generals/napoleon.png" or "icons/flag.png".
 */
export function assetUrl(filePath: string): string {
  const base = getApiBase();
  const path = filePath.replace(/^\//, "");
  return `${base}/api/storage/public-objects/${path}`;
}
