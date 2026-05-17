import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors, spacing, typography } from '@/theme';
import { IconTile, useTileIconColor, type IconTileTone } from './IconTile';

interface Props {
  icon: (color: string) => ReactNode;
  title: string;
  body?: string;
  tone?: IconTileTone;
  action?: ReactNode;
}

export function EmptyState({ icon, title, body, tone = 'blue', action }: Props) {
  const c = useColors();
  const iconColor = useTileIconColor(tone);
  return (
    <View style={styles.wrap}>
      <View style={{ marginBottom: spacing.md }}>
        <IconTile tone={tone} size="lg">
          {icon(iconColor)}
        </IconTile>
      </View>
      <Text style={[typography.h3, { color: c.text, textAlign: 'center' }]}>{title}</Text>
      {body ? (
        <Text
          style={[
            typography.small,
            { color: c.textSoft, textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg },
          ]}
        >
          {body}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.md }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
});
