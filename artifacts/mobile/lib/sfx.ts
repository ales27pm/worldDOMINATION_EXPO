import { useSyncExternalStore } from "react";

import { Platform } from "react-native";

import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SFX_SOURCES } from "./sfxSources";

/**
 * RISK II sound board — the original game samples, bundled with the app
 * (assets/sfx) so playback is instant and offline-safe. A tiny expo-audio
 * based engine mirroring the web build: fire-and-forget one-shots with
 * per-call volume, throttling, fade-out stops, and a persisted global mute.
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

/** Idle, loaded players kept warm for instant replay (one per sample). */
const preloaded = new Map<SfxName, AudioPlayer>();

type Live = {
  player: AudioPlayer;
  pooled: boolean;
  subscription: { remove(): void } | null;
};

/** Sounds currently playing — global mute applies to these immediately. */
const active = new Set<Live>();
const lastPlayed = new Map<SfxName, number>();

// Game audio should play even when the iOS ring switch is silenced.
setAudioModeAsync({
  playsInSilentMode: true,
  shouldPlayInBackground: false,
}).catch(() => {});

/**
 * Web autoplay gate — browsers reject any playback that is not triggered by
 * a user gesture, and expo-audio surfaces that as an uncaught
 * NotAllowedError (a dev-overlay crash on Expo web). Hold all playback until
 * the first pointer/key input; pre-gesture cues are dropped, and the tap
 * that starts the game unlocks audio for everything after it.
 */
let unlocked = Platform.OS !== "web";

if (!unlocked && typeof window !== "undefined") {
  const unlock = () => {
    unlocked = true;
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);

  // Autoplay-policy rejections that still slip through are non-actionable
  // noise — keep them out of the error overlay. Scoped tightly: only
  // DOMExceptions, and for aborts only media-flavored ones (a pause()
  // racing a play()), so real app errors are never masked.
  window.addEventListener("unhandledrejection", (event) => {
    const reason: unknown = event.reason;
    if (!(reason instanceof DOMException)) return;
    if (
      reason.name === "NotAllowedError" ||
      (reason.name === "AbortError" && /play\(\)|\bmedia\b/i.test(reason.message))
    ) {
      event.preventDefault();
    }
  });
}

// Hydrate the persisted mute preference (async — applies within milliseconds
// of module load, well before the first battle).
AsyncStorage.getItem(MUTE_KEY)
  .then((value) => {
    if (value === "off" && !muted) {
      muted = true;
      active.forEach((l) => {
        try {
          l.player.muted = true;
        } catch {}
      });
      listeners.forEach((fn) => fn());
    }
  })
  .catch(() => {});

function isPlayerActive(player: AudioPlayer): boolean {
  for (const l of active) {
    if (l.player === player) return true;
  }
  return false;
}

/** Release a finished/stopped instance: pooled ones rewind, transient ones unload. */
function finish(l: Live): void {
  active.delete(l);
  l.subscription?.remove();
  l.subscription = null;
  try {
    if (l.pooled) {
      // Rewind the warm instance so the next play starts instantly from 0.
      l.player.pause();
      l.player.seekTo(0).catch(() => {});
    } else {
      l.player.remove();
    }
  } catch {
    // Player already released — nothing to clean up.
  }
}

function fadeOut(l: Live, ms = 320): void {
  let start: number;
  try {
    start = l.player.volume;
  } catch {
    active.delete(l);
    return;
  }
  const t0 = Date.now();
  const iv = setInterval(() => {
    const k = 1 - (Date.now() - t0) / ms;
    if (k <= 0) {
      clearInterval(iv);
      finish(l);
    } else {
      try {
        l.player.volume = Math.max(0, start * k);
      } catch {
        clearInterval(iv);
        active.delete(l);
      }
    }
  }, 40);
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
  if (!unlocked) return () => {};
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

  try {
    const vol = Math.max(0, Math.min(1, volume));
    const pooledPlayer = preloaded.get(name);
    let l: Live;
    if (pooledPlayer && !isPlayerActive(pooledPlayer)) {
      // Reuse the warm instance — finish() rewound it to 0, so just fire.
      pooledPlayer.volume = vol;
      pooledPlayer.muted = muted;
      pooledPlayer.play();
      l = { player: pooledPlayer, pooled: true, subscription: null };
    } else {
      // Cold or overlapping play — spin up a transient instance.
      const player = createAudioPlayer(SFX_SOURCES[name]);
      player.volume = vol;
      player.muted = muted;
      player.play();
      l = { player, pooled: false, subscription: null };
    }
    live = l;
    active.add(l);
    l.subscription = l.player.addListener(
      "playbackStatusUpdate",
      (status: AudioStatus) => {
        if (status.didJustFinish) {
          finish(l);
          return;
        }
        // Runtime media failure — treat as terminal so `active` stays clean.
        if (!status.isLoaded && status.playbackState === "error") finish(l);
      },
    );
    if (maxMs !== undefined) stopTimer = setTimeout(stop, maxMs);
  } catch {
    // SFX are non-critical — never let audio failures break the game.
  }

  return stop;
}

/** Play one random sample from a variation pool. */
export function playRandomSfx(names: SfxName[], options: PlayOptions = {}): () => void {
  const name = names[Math.floor(Math.random() * names.length)];
  return name ? playSfx(name, options) : () => {};
}

/** Warm the audio cache so battle sounds start without a network hitch. */
export function preloadSfx(names: SfxName[]): void {
  for (const name of names) {
    if (preloaded.has(name)) continue;
    try {
      // Player creation is synchronous; the media loads in the background.
      preloaded.set(name, createAudioPlayer(SFX_SOURCES[name]));
    } catch {
      // Preload is best-effort — playback falls back to a transient instance.
    }
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
    try {
      l.player.muted = value;
    } catch {}
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
