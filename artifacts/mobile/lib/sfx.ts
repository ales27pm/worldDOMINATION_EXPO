/**
 * Sound-effect player for World Domination (React Native / expo-av).
 *
 * Matches the web sfx.ts interface as closely as possible:
 *   playSfx(name, { volume?, maxMs? })  → Promise<stopFn>
 *   playRandomSfx([...names], options)  → Promise<stopFn>
 *
 * Audio files are served from object storage via the API server.
 */
import { Audio } from "expo-av";
import { assetUrl } from "./assetUrl";

export interface SfxOptions {
  volume?: number;
  /** Stop playback after this many milliseconds. */
  maxMs?: number;
}

// Configure audio once at module load so SFX play through the ringer.
Audio.setAudioModeAsync({
  playsInSilentModeIOS: false,
  staysActiveInBackground: false,
}).catch(() => {});

/** Play a named sound effect. Returns an async stop/unload callback. */
export async function playSfx(
  name: string,
  options: SfxOptions = {},
): Promise<() => void> {
  const { volume = 1.0, maxMs } = options;
  const uri = assetUrl(`public/risk/sfx/${name}.mp3`);

  let sound: Audio.Sound | null = null;
  let stopTimer: ReturnType<typeof setTimeout> | null = null;

  const stop = () => {
    if (stopTimer !== null) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    if (sound) {
      sound.stopAsync().catch(() => {});
      sound.unloadAsync().catch(() => {});
      sound = null;
    }
  };

  try {
    const result = await Audio.Sound.createAsync(
      { uri },
      { volume, shouldPlay: true },
    );
    sound = result.sound;

    // Auto-unload when finished
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound?.unloadAsync().catch(() => {});
        sound = null;
      }
    });

    if (maxMs !== undefined) {
      stopTimer = setTimeout(stop, maxMs);
    }
  } catch {
    // Silently swallow — SFX are non-critical
  }

  return stop;
}

/** Play a random sound from the given list. */
export function playRandomSfx(
  names: string[],
  options: SfxOptions = {},
): Promise<() => void> {
  const name = names[Math.floor(Math.random() * names.length)];
  return playSfx(name, options);
}
