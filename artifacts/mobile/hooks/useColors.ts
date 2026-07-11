import { Colors } from '@/constants/colors';

/**
 * Returns the design tokens for the current color scheme.
 * World Domination uses a fixed Imperial parchment-and-walnut palette
 * ported from the web build (see constants/colors.ts).
 */
export function useColors() {
  return Colors;
}
