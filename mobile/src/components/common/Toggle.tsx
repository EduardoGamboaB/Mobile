import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useColors } from '@/theme';

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ value, onChange }: Props) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[styles.track, { backgroundColor: value ? c.blue : c.border }]}
    >
      <View
        style={[
          styles.knob,
          { transform: [{ translateX: value ? 20 : 0 }] },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 48, height: 28, borderRadius: 999, padding: 3 },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
});
