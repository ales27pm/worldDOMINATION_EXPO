import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// Lazily resolved sound registry — only loaded when first played
type SoundEntry = { uri: number; object: unknown | null };

const SOUND_ASSETS: Record<string, number> = {
  dice:    require('@/assets/sounds/dice-roll.mp3'),
  cannon:  require('@/assets/sounds/cannon.mp3'),
  conquest:require('@/assets/sounds/conquest.mp3'),
  card:    require('@/assets/sounds/card-shuffle.mp3'),
  tap:     require('@/assets/sounds/button-tap.mp3'),
  victory: require('@/assets/sounds/victory.mp3'),
  deploy:  require('@/assets/sounds/deploy.mp3'),
};

export type SoundName = keyof typeof SOUND_ASSETS;

/**
 * Hook that returns a `play(name)` function.
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
      // Unload all cached sounds on unmount
      Object.values(cache.current).forEach((snd: unknown) => {
        try {
          (snd as { unloadAsync(): Promise<void> }).unloadAsync?.();
        } catch { /* ignore */ }
      });
    };
  }, []);

  const play = useCallback(async (name: SoundName) => {
    if (Platform.OS === 'web') return; // Web audio handled via HTML Audio if needed
    const asset = SOUND_ASSETS[name];
    if (!asset) return;
    try {
      // Dynamic import so bundler doesn't fail if expo-av is missing
      const { Audio } = await import('expo-av');
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      if (!cache.current[name]) {
        const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: false });
        if (!mounted.current) { await sound.unloadAsync(); return; }
        cache.current[name] = sound;
      }
      const sound = cache.current[name] as { replayAsync(): Promise<void>; setPositionAsync(ms: number): Promise<void> };
      await sound.setPositionAsync(0);
      await sound.replayAsync();
    } catch {
      // Silently ignore — sound is enhancement only
    }
  }, []);

  return play;
}
