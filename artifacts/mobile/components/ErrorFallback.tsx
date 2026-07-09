// This component is kept for compatibility but replaced by ErrorBoundary.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.msg}>{error.message}</Text>
      <Pressable onPress={resetError} style={styles.btn}>
        <Text style={styles.btnText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { color: Colors.gold, fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  msg: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: Colors.gold, paddingVertical: 12, paddingHorizontal: 32 },
  btnText: { color: Colors.bg, fontWeight: 'bold', fontSize: 14 },
});
