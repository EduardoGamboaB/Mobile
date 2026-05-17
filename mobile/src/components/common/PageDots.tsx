import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme';

interface Props {
  count: number;
  active: number;
}

export function PageDots({ count, active }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { width: i === active ? 24 : 8, backgroundColor: i === active ? colors.navy : colors.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: { height: 8, borderRadius: 4 },
});
