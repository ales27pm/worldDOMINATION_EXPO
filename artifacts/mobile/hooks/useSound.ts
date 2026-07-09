import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { SFX_URLS } from '@/lib/storage';

export type SoundName = keyof typeof SFX_URLS;

/**
 * Hook that returns a `play(name)` function.
 * All sounds are streamed from App Storage (no bundled audio files needed).
 * Sounds are loaded on-demand and cached for the lifetime of the component.
 * Silently no-ops on platforms where expo-av is unavailable.
 */
export function useSound() {
  const cache = useRef<Record<string, unknown>>({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      Object.values(cache.current).forEach((snd: unknown) => {
        try {
          (snd as { unloadAsync(): Promise<void> }).unloadAsync?.();
        } catch { /* ignore */ }
      });
    };
  }, []);

  const play = useCallback(async (name: SoundName) => {
    if (Platform.OS === 'web') return;
    const uri = SFX_URLS[name];
    if (!uri) return;
    try {
      const { Audio } = await import('expo-av');
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      if (!cache.current[name]) {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false },
        );
        if (!mounted.current) { await sound.unloadAsync(); return; }
        cache.current[name] = sound;
      }
      const sound = cache.current[name] as {
        replayAsync(): Promise<void>;
        setPositionAsync(ms: number): Promise<void>;
      };
      await sound.setPositionAsync(0);
      await sound.replayAsync();
    } catch {
      // Sound is enhancement only — ignore errors
    }
  }, []);

  return play;
}
