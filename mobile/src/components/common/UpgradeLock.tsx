import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useColors, radius, spacing, typography } from '@/theme';
import { IconTile, useTileIconColor } from './IconTile';
import { Chip } from './Chip';
import { LockIcon, SparklesIcon } from '@/components/icons';
import {
  TierLabel,
  TierMetaInfo,
  FeatureLabel,
  minTierFor,
  type FeatureValue,
} from '@/constants/tiers';
import type { AppNav } from '@/navigation/types';

interface Props {
  feature: FeatureValue;
  /** Texto de cabecera personalizable; por defecto usa el FeatureLabel. */
  title?: string;
  /** Descripción adicional. */
  body?: string;
  /** Layout compacto en línea (en vez de card grande). */
  compact?: boolean;
}

/**
 * Tarjeta universal de bloqueo por tier. Se inserta donde una feature está
 * gated. Indica el tier requerido y abre el flujo de planes.
 */
export function UpgradeLock({ feature, title, body, compact }: Props) {
  const c = useColors();
  const blueColor = useTileIconColor('blue');
  const nav = useNavigation<AppNav<'Plans'>>();
  const required = minTierFor(feature);

  const open = () => nav.navigate('Plans', { highlight: required });

  if (compact) {
    return (
      <Pressable onPress={open} style={[styles.compact, { backgroundColor: c.blueLight }]}>
        <LockIcon size={16} color={c.blue} />
        <Text style={[styles.compactText, { color: c.blue }]}>
          Disponible desde {TierLabel[required]}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={open}>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.head}>
          <IconTile tone="blue" size="md">
            <SparklesIcon color={blueColor} />
          </IconTile>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[typography.bodyStrong, { color: c.text }]} numberOfLines={1}>
              {title ?? FeatureLabel[feature]}
            </Text>
            <Text style={[typography.caption, { color: c.muted }]}>
              {TierMetaInfo[required].audience}
            </Text>
          </View>
          <Chip label={TierLabel[required]} variant="navy" />
        </View>
        {body ? (
          <Text style={[typography.small, { color: c.textSoft, marginTop: spacing.sm }]}>
            {body}
          </Text>
        ) : null}
        <View style={[styles.cta, { borderTopColor: c.border }]}>
          <LockIcon size={14} color={c.muted} />
          <Text style={[typography.small, { color: c.blue, marginLeft: 6, fontWeight: '700' }]}>
            Mejorar a {TierLabel[required]} →
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm + 2,
    marginTop: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    gap: 6,
  },
  compactText: { fontSize: 12, fontWeight: '700' },
});
