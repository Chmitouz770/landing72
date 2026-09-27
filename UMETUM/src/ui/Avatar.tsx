import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from './Text';

const COLORS = ['#1B2A4A', '#8C5E1A', '#2E7D5B', '#6B3FA0', '#9B2C4B', '#1F6F8B'];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

type Props = { name: string; uri?: string | null; size?: number };

export function Avatar({ name, uri, size = 44 }: Props) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={dimension}
        contentFit="cover"
        transition={150}
        accessibilityLabel={name}
      />
    );
  }
  return (
    <View
      style={[styles.fallback, dimension, { backgroundColor: colorFor(name) }]}
      accessibilityLabel={name}
    >
      <Text style={{ color: '#FFFFFF', fontSize: size * 0.38, fontWeight: '700' }}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
