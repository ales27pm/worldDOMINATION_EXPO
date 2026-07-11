import type { TextStyle } from "react-native";

/**
 * World Domination — period typography tokens, mirroring the web build:
 *
 *   font-display → "IM Fell English SC"  (small-caps engraved headings)
 *   font-map     → "IM Fell English"     (map labels, flavor text)
 *   font-body    → "Alegreya"            (body copy, UI text)
 *
 * The IM Fell faces ship in a single 400 weight — never pair them with a
 * fontWeight override or Android will synthesize a fake bold.
 */
export const Fonts = {
  display: "IMFellEnglishSC_400Regular",
  map: "IMFellEnglish_400Regular",
  mapItalic: "IMFellEnglish_400Regular_Italic",
  body: "Alegreya_400Regular",
  bodyItalic: "Alegreya_400Regular_Italic",
  bodyMedium: "Alegreya_500Medium",
  bodySemiBold: "Alegreya_600SemiBold",
  bodyBold: "Alegreya_700Bold",
  bodyExtraBold: "Alegreya_800ExtraBold",
} as const;

/**
 * The web build's `.tracking-imperial` (letter-spacing: 0.22em) for engraved
 * small-caps headings. RN letterSpacing is absolute, so scale by font size.
 */
export function trackingImperial(fontSize: number): number {
  return +(fontSize * 0.22).toFixed(2);
}

/** Text shadows ported from the web build's utility classes. */
export const TextShadows = {
  /** `.text-engraved` — light bevel below ink text on parchment. */
  engraved: {
    textShadowColor: "rgba(251,243,213,0.85)", // hsl(48 70% 94% / 0.85)
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  } satisfies TextStyle,
  /** On-wood lettering — soft dark drop for legibility on walnut. */
  onWood: {
    textShadowColor: "rgba(29,19,12,0.8)", // hsl(20 40% 8% / 0.8)
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  } satisfies TextStyle,
  /** `.text-gilded` — gold lettering lifted off the table. */
  gilded: {
    textShadowColor: "rgba(29,19,12,0.7)", // hsl(20 40% 8% / 0.7)
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  } satisfies TextStyle,
} as const;
