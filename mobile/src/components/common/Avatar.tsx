import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/theme';

interface Props {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 48 }: Props) {
  const c = useColors();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View
      style={[
        styles.av,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: c.navy },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>{initials || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  av: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '800' },
});
