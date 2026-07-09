import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Thin wrapper around expo-haptics that silently no-ops on web.
 * Returns: { light, medium, heavy, success, warning, error }
 */
export function useHaptics() {
  const fire = useCallback(
    (style: 'light' | 'medium' | 'heavy') => {
      if (Platform.OS === 'web') return;
      const impactMap = {
        light:  Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy:  Haptics.ImpactFeedbackStyle.Heavy,
      };
      Haptics.impactAsync(impactMap[style]).catch(() => {});
    },
    [],
  );

  const notify = useCallback(
    (type: 'success' | 'warning' | 'error') => {
      if (Platform.OS === 'web') return;
      const notifyMap = {
        success: Haptics.NotificationFeedbackType.Success,
        warning: Haptics.NotificationFeedbackType.Warning,
        error:   Haptics.NotificationFeedbackType.Error,
      };
      Haptics.notificationAsync(notifyMap[type]).catch(() => {});
    },
    [],
  );

  return {
    light:   () => fire('light'),
    medium:  () => fire('medium'),
    heavy:   () => fire('heavy'),
    success: () => notify('success'),
    warning: () => notify('warning'),
    error:   () => notify('error'),
  };
}
