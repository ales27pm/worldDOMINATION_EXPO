/**
 * World Domination — Imperial parchment & walnut theme.
 *
 * Faithful port of the web build's palette (index.css :root), converted from
 * HSL to hex. Two surface families coexist:
 *
 *  • Wood — the dark walnut war-table that backs every screen. Legacy keys
 *    (bg, bgCard, text, …) map onto this family so existing screens render
 *    correctly on the wood backdrop.
 *  • Parchment — the aged-paper sheets the web build lays over the wood for
 *    panels, cards and the map sea. Ink tones are the text colors used on it.
 */
export const Colors = {
  // ── Wood surfaces (page backdrop) ─────────────────────────────────────────
  bg: "#251a13",           // dark walnut table — hsl(24 32% 11%)
  bgCard: "#32241a",       // raised wood panel (mobile intermediate shade)
  bgModal: "#150d09",      // vignette-dark overlay backdrop — hsl(20 40% 6%)
  bgField: "#3f2e22",      // inset leather/wood field (mobile intermediate)

  // ── Accents ───────────────────────────────────────────────────────────────
  gold: "#debe73",         // gilded lettering on wood — hsl(42 62% 66%)
  goldDim: "#9b7646",      // engraved gold / borders — hsl(34 38% 44%)
  goldBright: "#956b23",   // parchment-context gold — hsl(38 62% 36%)
  goldMid: "#775822",      // deep engraved gold — hsl(38 55% 30%)
  crimson: "#9d2529",      // imperial crimson — hsl(358 62% 38%)
  crimsonDeep: "#75151b",  // dried-blood deep red — hsl(356 70% 27%)
  crimsonLight: "#ba262b", // bright alert crimson — hsl(358 66% 44%)

  // ── Text on wood ──────────────────────────────────────────────────────────
  text: "#ede0c0",         // candle-lit parchment white — hsl(43 55% 84%)
  textMuted: "#c9b792",    // faded on-wood ink — hsl(40 34% 68%)
  textGold: "#debe73",     // gilded headings
  textCrimson: "#db434a",  // gilded crimson — hsl(357 68% 56%)

  // ── Parchment sheets (panel surfaces, ported for the web-faithful UI) ─────
  parchmentDeep: "#c7a675",    // hsl(36 42% 62%)
  parchmentDark: "#d4bb91",    // hsl(38 44% 70%)
  parchmentMid: "#e3d2ab",     // hsl(42 50% 78%)
  parchmentSurface: "#ece0c0", // hsl(44 54% 84%)
  parchmentLight: "#f5eed6",   // hsl(46 60% 90%)
  parchmentCard: "#eee5c9",    // hsl(45 52% 86%)
  parchmentPopover: "#f2e9cf", // hsl(45 56% 88%)
  parchmentBorder: "#9b7850",  // hsl(32 32% 46%)
  parchmentInput: "#a88257",   // hsl(32 32% 50%)

  // ── Ink on parchment ──────────────────────────────────────────────────────
  ink: "#362516",          // walnut ink — hsl(28 42% 15%)
  inkMuted: "#6d543b",     // faded ink — hsl(30 30% 33%)
  primaryFg: "#f7f1de",    // light text on crimson/gold — hsl(45 62% 92%)
  destructive: "#b22429",  // destructive action red — hsl(358 66% 42%)

  // ── Map & Territory ───────────────────────────────────────────────────────
  ocean: "#e7d8b1",        // golden parchment sea — hsl(44 52% 80%)
  territoryStroke: "#362516",   // ink borders on parchment
  territorySelected: "#f0d060",
  territoryTarget: "#e05040",
  territoryInteractive: "#90c080",

  // ── Borders & Separators (wood context) ───────────────────────────────────
  border: "#56412e",       // hsl(28 30% 26%)
  borderGold: "#9b7646",

  // ── UI States ─────────────────────────────────────────────────────────────
  disabled: "#3a3028",
  disabledText: "#5a4a38",

  // ── Continent Colors ──────────────────────────────────────────────────────
  northAmerica: "#b8922e",
  southAmerica: "#b87050",
  europe: "#7060a0",
  africa: "#a07030",
  asia: "#507040",
  australia: "#a05070",
} as const;

export type ColorKey = keyof typeof Colors;
