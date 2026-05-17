import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { colors } from '@/theme';

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ value, onChange }: Props) {
  return (
    <Pressable onPress={() => onChange(!value)} style={[styles.track, value && styles.trackOn]}>
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.border,
    padding: 3,
  },
  trackOn: { backgroundColor: colors.blue },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  knobOn: { transform: [{ translateX: 20 }] },
});
