// World Domination — Classic Risk Board Game Palette
// Inspired by the original 1957 Risk board: mahogany wood frame,
// aged parchment territories, brass-gold accents, ocean blue seas.

export const Colors = {
  // ─── Dark backgrounds (game board, card backs) ──────────────────────────
  bg:           '#16100a',   // deep mahogany black
  bgCard:       '#1e1208',   // dark walnut card
  bgPanel:      '#201408',   // panel backing
  bgField:      '#2a1a08',   // input field
  bgModal:      '#f0ddb0',   // aged parchment (for light modals)
  bgParchment:  '#f4e4c1',   // lighter parchment
  bgParchmentDark: '#e0cc9a', // darker aged parchment

  // ─── Wood tones ──────────────────────────────────────────────────────────
  wood:         '#3d200e',   // dark mahogany
  woodMid:      '#6b3a1e',   // medium walnut
  woodLight:    '#9a6040',   // lighter wood grain

  // ─── Gold / brass ────────────────────────────────────────────────────────
  gold:         '#c9a227',   // classic brass gold
  goldBright:   '#e8c84a',   // bright polished gold
  goldDim:      '#7a6118',   // aged dimmed gold
  goldText:     '#d4aa28',   // gold for text
  goldLight:    '#f0d870',   // pale glinting gold

  // ─── War crimson ─────────────────────────────────────────────────────────
  crimson:      '#8b1a1a',   // deep war crimson
  crimsonBright:'#cc2222',   // battle red

  // ─── Ocean ───────────────────────────────────────────────────────────────
  ocean:        '#2b4a7a',   // classic board-game ocean
  oceanDark:    '#1a2e50',   // deep ocean

  // ─── Text (on dark backgrounds) ──────────────────────────────────────────
  text:         '#f0ddb0',   // parchment cream
  textMuted:    '#9a7a5a',   // warm tan muted
  textGold:     '#d4aa28',   // gold text
  textCrimson:  '#e05050',   // red alert text

  // ─── Text (on parchment/light backgrounds) ────────────────────────────────
  inkDark:      '#1a0f05',   // deep brown ink
  inkMed:       '#4a2e18',   // medium ink
  inkFaded:     '#7a5a40',   // faded ink

  // ─── Borders ─────────────────────────────────────────────────────────────
  border:       '#4a2810',   // wood border on dark
  borderGold:   '#c9a227',   // gold border
  borderLight:  '#6b3a1e',   // lighter wood border
  borderParchment: '#c4a55a', // parchment border on light bg

  // ─── Territory map states ─────────────────────────────────────────────────
  territorySelected:    '#ffd700',
  territoryTarget:      '#cc2222',
  territoryInteractive: '#c9a22755',
  territoryStroke:      '#1a0f0588',

  // ─── Continent colors (classic Risk board palette) ────────────────────────
  northAmerica: '#d9b167',
  southAmerica: '#e08f74',
  europe:       '#b3a0d6',
  africa:       '#d29a4b',
  asia:         '#a5c47f',
  australia:    '#e18cae',

  // ─── UI states ───────────────────────────────────────────────────────────
  disabled:     '#3a2510',
  disabledText: '#6a4a30',

  // ─── Overlays ────────────────────────────────────────────────────────────
  overlay:      'rgba(26,15,5,0.88)',
  overlayLight: 'rgba(240,221,176,0.96)',
} as const;

export type ColorKey = keyof typeof Colors;
