import React, { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeftIcon } from '@/components/icons';
import { IconTile } from './IconTile';
import { colors, spacing, typography } from '@/theme';

interface Props {
  title: string;
  right?: ReactNode;
  onBack?: () => void;
}

export function AppBar({ title, right, onBack }: Props) {
  const nav = useNavigation();
  const handleBack = onBack ?? (() => nav.goBack());
  return (
    <View style={styles.bar}>
      <Pressable onPress={handleBack} hitSlop={10}>
        <IconTile tone="navy">
          <ChevronLeftIcon color={colors.navy} />
        </IconTile>
      </Pressable>
      <Text style={[typography.h2, styles.title]} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, gap: spacing.md },
  title: { flex: 1 },
});
