import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Fonts } from '@/constants/typography';
import type { GameState } from '@/game/types';

/** Dispatch-line colours per log tone — matches the DispatchLog modal. */
const TONE_COLORS: Record<string, string> = {
  info: 'rgba(236, 222, 189, 0.92)',
  gold: '#e7c268',
  crimson: '#e06a52',
  battle: '#e0a050',
};

/**
 * RISK II-style event ticker — the last few war dispatches in a translucent
 * olive band above the command panel, so the story of the war stays readable
 * without hiding the map. Newest line at the bottom, like the original's
 * scrolling readout.
 */
export function EventTicker({ game, lines = 3 }: { game: GameState; lines?: number }) {
  const entries = game.log.slice(0, lines);
  if (entries.length === 0) return null;
  return (
    <View style={styles.band} pointerEvents="none">
      {[...entries].reverse().map((entry) => (
        <Text
          key={entry.id}
          numberOfLines={1}
          style={[styles.line, { color: TONE_COLORS[entry.tone] ?? TONE_COLORS.info }]}
        >
          {entry.text}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    backgroundColor: 'rgba(26, 21, 10, 0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(222, 190, 115, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  line: {
    fontFamily: Fonts.body,
    fontSize: 10,
    lineHeight: 14,
  },
});
