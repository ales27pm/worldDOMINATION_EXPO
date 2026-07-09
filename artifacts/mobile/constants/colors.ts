/** World Domination — dark Napoleonic military theme */
export const Colors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg: "#16100a",           // deep campaign-room dark
  bgCard: "#221508",       // slightly lighter for panels
  bgModal: "#1a1005",      // overlay backdrop
  bgField: "#2a1a08",      // raised card surface

  // ── Accents ───────────────────────────────────────────────────────────────
  gold: "#c9a227",         // imperial gold — primary accent
  goldDim: "#7a6118",      // dimmed gold for borders
  crimson: "#8b1a1a",      // battle red
  crimsonLight: "#c0392b", // brighter red for alerts

  // ── Text ──────────────────────────────────────────────────────────────────
  text: "#f0e8d0",         // warm parchment
  textMuted: "#8a7060",    // muted brown
  textGold: "#c9a227",     // gold text
  textCrimson: "#e05050",  // alert text

  // ── Map & Territory ───────────────────────────────────────────────────────
  ocean: "#1a3a5c",        // dark navy blue ocean
  territoryStroke: "#0a0704",
  territorySelected: "#f0d060",
  territoryTarget: "#e05040",
  territoryInteractive: "#90c080",

  // ── Borders & Separators ─────────────────────────────────────────────────
  border: "#3a2812",
  borderGold: "#7a6118",

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
