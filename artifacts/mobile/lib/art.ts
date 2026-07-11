import { assetUrl } from "./assetUrl";

/**
 * AI-generated Risk II art assets — mirrors the web build's lib/art.ts, with
 * every image mirrored into object storage under public/risk.
 */
export const ART = {
  /** Aged nautical-chart parchment — map sea underlay and panel texture. */
  seaParchment: assetUrl("public/risk/art/sea-parchment.png"),
  /** Engraved antique compass rose (transparent). */
  compassRose: assetUrl("public/risk/art/compass-rose.png"),
  /** Engraved three-masted sailing ship (transparent). */
  ship: assetUrl("public/risk/art/ship.png"),
  /** Engraved sea serpent (transparent). */
  seaSerpent: assetUrl("public/risk/art/sea-serpent.png"),
  /** Dark walnut war-table surface — page backdrop. */
  woodTable: assetUrl("public/risk/art/wood-table.png"),
  /** Crossed cannons & flags heraldic crest (transparent). */
  warCrest: assetUrl("public/risk/art/war-crest.png"),
  /** Golden laurel victory wreath (transparent). */
  laurelWreath: assetUrl("public/risk/art/laurel-wreath.png"),
  /** Napoleonic cavalry-charge oil painting — main menu hero. */
  heroPainting: assetUrl("public/risk/art/hero-painting.png"),
} as const;
