import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';
import { IconTile, tileIconColor, IconTileTone } from './IconTile';

interface Props {
  icon: (color: string) => ReactNode;
  title: string;
  body?: string;
  tone?: IconTileTone;
  action?: ReactNode;
}

export function EmptyState({ icon, title, body, tone = 'blue', action }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={{ marginBottom: spacing.md }}>
        <IconTile tone={tone} size="lg">
          {icon(tileIconColor(tone))}
        </IconTile>
      </View>
      <Text style={[typography.h3, { textAlign: 'center' }]}>{title}</Text>
      {body ? (
        <Text style={[typography.small, { textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg }]}>
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

export const _emptyStatePlaceholder = colors; // mantiene import cuando se compila tree-shaken
