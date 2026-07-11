import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";
import { FIREWORK_FRAMES } from "@/lib/gameArt";

/**
 * The original RISK II victory fireworks — 21 blue-keyed frames extracted
 * from the game's sprite archive (bundled with the app), replayed as
 * staggered bursts across the screen. Rendered as an absolute overlay;
 * mount it when the game is won.
 */

const FRAME_COUNT = FIREWORK_FRAMES.length;
const FRAME_MS = 60;

interface Burst {
  id: number;
  x: string; // percentage string
  y: string;
  delay: number;
  scale: number;
}

const BURSTS: Burst[] = [
  { id: 0, x: "15%",  y: "10%", delay: 0,    scale: 1.1 },
  { id: 1, x: "75%",  y: "8%",  delay: 350,  scale: 0.9 },
  { id: 2, x: "45%",  y: "20%", delay: 700,  scale: 1.3 },
  { id: 3, x: "20%",  y: "40%", delay: 200,  scale: 0.8 },
  { id: 4, x: "80%",  y: "35%", delay: 550,  scale: 1.0 },
];

function FireworkBurst({ burst }: { burst: Burst }) {
  const [frame, setFrame] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      setRunning(true);
    }, burst.delay);
    return () => clearTimeout(delayTimer);
  }, [burst.delay]);

  useEffect(() => {
    if (!running) return;
    setFrame(0);
    const iv = setInterval(() => {
      setFrame((f) => {
        if (f + 1 >= FRAME_COUNT) {
          clearInterval(iv);
          // Restart after a gap
          setTimeout(() => setRunning(false), 800);
          return f;
        }
        return f + 1;
      });
    }, FRAME_MS);

    return () => clearInterval(iv);
  }, [running]);

  // Re-trigger
  useEffect(() => {
    if (!running) {
      const t = setTimeout(() => setRunning(true), burst.delay + 1200);
      return () => clearTimeout(t);
    }
  }, [running, burst.delay]);

  if (!running) return null;

  return (
    <Image
      source={FIREWORK_FRAMES[frame]}
      style={[
        styles.burst,
        {
          left: burst.x as any,
          top: burst.y as any,
          width: 120 * burst.scale,
          height: 120 * burst.scale,
        },
      ]}
      resizeMode="contain"
    />
  );
}

export function Fireworks() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {BURSTS.map((b) => (
        <FireworkBurst key={b.id} burst={b} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  burst: {
    position: "absolute",
  },
});
