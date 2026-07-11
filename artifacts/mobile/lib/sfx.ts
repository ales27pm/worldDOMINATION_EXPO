import { useSyncExternalStore } from "react";

import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { assetUrl } from "./assetUrl";

/**
 * RISK II sound board — the original game samples, served from object storage
 * at public/risk/sfx. A tiny expo-av based engine mirroring the web build:
 * fire-and-forget one-shots with per-call volume, throttling, fade-out stops,
 * and a persisted global mute.
 */
export type SfxName =
  | "battle_din"
  | "cannon_a"
  | "cannon_b"
  | "cannon_c"
  | "chime"
  | "clash_a"
  | "clash_b"
  | "clash_c"
  | "click"
  | "defeat"
  | "dice_roll"
  | "fanfare"
  | "march"
  | "roar"
  | "stab"
  | "thud"
  | "tick"
  | "trumpet"
  | "volley_long"
  | "volley_short"
  | "whoosh";

const MUTE_KEY = "risk2.sound";

let muted = false;

const listeners = new Set<() => void>();

/** Idle, loaded instances kept warm for instant replay (one per sample). */
const preloaded = new Map<SfxName, Audio.Sound>();

type Live = { sound: Audio.Sound; pooled: boolean };

/** Sounds currently playing — global mute applies to these immediately. */
const active = new Set<Live>();
const lastPlayed = new Map<SfxName, number>();

// Game audio should play even when the iOS ring switch is silenced.
Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
}).catch(() => {});

// Hydrate the persisted mute preference (async — applies within milliseconds
// of module load, well before the first battle).
AsyncStorage.getItem(MUTE_KEY)
  .then((value) => {
    if (value === "off" && !muted) {
      muted = true;
      active.forEach((l) => {
        l.sound.setIsMutedAsync(true).catch(() => {});
      });
      listeners.forEach((fn) => fn());
    }
  })
  .catch(() => {});

function uriFor(name: SfxName): string {
  return assetUrl(`public/risk/sfx/${name}.mp3`);
}

function isSoundActive(sound: Audio.Sound): boolean {
  for (const l of active) {
    if (l.sound === sound) return true;
  }
  return false;
}

/** Release a finished/stopped instance: pooled ones rewind, transient ones unload. */
function finish(l: Live): void {
  active.delete(l);
  l.sound.setOnPlaybackStatusUpdate(null);
  if (l.pooled) {
    l.sound.stopAsync().catch(() => {});
  } else {
    l.sound.unloadAsync().catch(() => {});
  }
}

function fadeOut(l: Live, ms = 320): void {
  void (async () => {
    try {
      const status = await l.sound.getStatusAsync();
      if (!status.isLoaded) {
        active.delete(l);
        return;
      }
      const start = status.volume;
      const t0 = Date.now();
      const iv = setInterval(() => {
        const k = 1 - (Date.now() - t0) / ms;
        if (k <= 0) {
          clearInterval(iv);
          finish(l);
        } else {
          l.sound.setVolumeAsync(Math.max(0, start * k)).catch(() => {});
        }
      }, 40);
    } catch {
      active.delete(l);
    }
  })();
}

export interface PlayOptions {
  /** 0–1 playback volume (default 1). */
  volume?: number;
  /** Skip this play if the same sample fired within the window. */
  throttleMs?: number;
  /** Fade the sample out after this long (for long ambience beds). */
  maxMs?: number;
}

/**
 * Play a one-shot sample. Returns a stop handle that fades the sound out —
 * safe to call at any time (including after natural end).
 */
export function playSfx(name: SfxName, options: PlayOptions = {}): () => void {
  const { volume = 1, throttleMs = 0, maxMs } = options;
  if (throttleMs > 0) {
    const last = lastPlayed.get(name) ?? 0;
    if (Date.now() - last < throttleMs) return () => {};
  }
  lastPlayed.set(name, Date.now());

  let live: Live | null = null;
  let stopped = false;
  let stopTimer: ReturnType<typeof setTimeout> | null = null;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (stopTimer !== null) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    if (live && active.has(live)) fadeOut(live);
  };

  void (async () => {
    try {
      const vol = Math.max(0, Math.min(1, volume));
      const appliedMuted = muted;
      const pooledSound = preloaded.get(name);
      let l: Live;
      if (pooledSound && !isSoundActive(pooledSound)) {
        // Reuse the warm instance: rewind and fire.
        await pooledSound.setStatusAsync({
          shouldPlay: true,
          positionMillis: 0,
          volume: vol,
          isMuted: appliedMuted,
        });
        l = { sound: pooledSound, pooled: true };
      } else {
        // Cold or overlapping play — spin up a transient instance.
        const { sound } = await Audio.Sound.createAsync(
          { uri: uriFor(name) },
          { shouldPlay: true, volume: vol, isMuted: appliedMuted },
        );
        l = { sound, pooled: false };
      }
      live = l;
      if (stopped) {
        finish(l);
        return;
      }
      active.add(l);
      // Close the startup race: if global mute flipped while this sound was
      // still loading (not yet in `active`), re-apply the current value now.
      if (muted !== appliedMuted) {
        l.sound.setIsMutedAsync(muted).catch(() => {});
      }
      l.sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          // Runtime media failure — treat as terminal so `active` stays clean.
          if (status.error) finish(l);
          return;
        }
        if (status.didJustFinish) finish(l);
      });
      if (maxMs !== undefined) stopTimer = setTimeout(stop, maxMs);
    } catch {
      // SFX are non-critical — never let audio failures break the game.
    }
  })();

  return stop;
}

/** Play one random sample from a variation pool. */
export function playRandomSfx(names: SfxName[], options: PlayOptions = {}): () => void {
  const name = names[Math.floor(Math.random() * names.length)];
  return name ? playSfx(name, options) : () => {};
}

/** In-flight preloads, so concurrent calls never double-load a sample. */
const preloading = new Map<SfxName, Promise<void>>();

/** Warm the audio cache so battle sounds start without a network hitch. */
export function preloadSfx(names: SfxName[]): void {
  for (const name of names) {
    if (preloaded.has(name) || preloading.has(name)) continue;
    const job = Audio.Sound.createAsync({ uri: uriFor(name) }, { shouldPlay: false })
      .then(({ sound }) => {
        preloaded.set(name, sound);
      })
      .catch(() => {})
      .finally(() => {
        preloading.delete(name);
      });
    preloading.set(name, job);
  }
}

export function isSfxMuted(): boolean {
  return muted;
}

export function setSfxMuted(value: boolean): void {
  muted = value;
  AsyncStorage.setItem(MUTE_KEY, value ? "off" : "on").catch(() => {
    // Storage unavailable — mute still applies for this session.
  });
  active.forEach((l) => {
    l.sound.setIsMutedAsync(value).catch(() => {});
  });
  listeners.forEach((fn) => fn());
}

export function toggleSfxMuted(): void {
  setSfxMuted(!muted);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Reactive mute flag for UI toggles. */
export function useSfxMuted(): boolean {
  return useSyncExternalStore(subscribe, isSfxMuted, () => false);
}
