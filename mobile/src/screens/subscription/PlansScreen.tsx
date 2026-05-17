import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/common/Button';
import { Chip } from '@/components/common/Chip';
import { IconTile, useTileIconColor } from '@/components/common/IconTile';
import { CheckIcon, SparklesIcon } from '@/components/icons';
import { useColors, radius, spacing, typography } from '@/theme';
import {
  Tier,
  TierLabel,
  TierMetaInfo,
  TierPrice,
  TIER_BULLETS,
  TIER_RANK,
  type TierValue,
} from '@/constants/tiers';
import { useSubscriptionStore } from '@/stores/subscription';
import type { AppStackParamList, AppNav } from '@/navigation/types';

const ORDER: TierValue[] = ['free', 'starter', 'pro', 'business', 'enterprise'];

export function PlansScreen() {
  const c = useColors();
  const blueColor = useTileIconColor('blue');
  const nav = useNavigation<AppNav<'Plans'>>();
  const route = useRoute<RouteProp<AppStackParamList, 'Plans'>>();
  const currentTier = useSubscriptionStore((s) => s.tier);
  const setTier = useSubscriptionStore((s) => s.setTier);

  const initialSelected = route.params?.highlight ?? currentTier;
  const [selected, setSelected] = useState<TierValue>(initialSelected);

  const isCurrent = (t: TierValue) => t === currentTier;
  const action = useMemo(() => {
    if (selected === currentTier) return null;
    const upgrading = TIER_RANK[selected] > TIER_RANK[currentTier];
    return upgrading ? 'upgrade' : 'downgrade';
  }, [selected, currentTier]);

  const onConfirm = () => {
    if (selected === 'enterprise') {
      Alert.alert(
        'Cotización Enterprise',
        'Un ejecutivo G3 te contactará en menos de 24 h para diseñar tu plan a medida.',
      );
      return;
    }
    if (!action) return;
    Alert.alert(
      action === 'upgrade' ? 'Confirmar upgrade' : 'Confirmar cambio',
      `Tu plan cambia a ${TierLabel[selected]} por $${TierPrice[selected]} MXN/u·mes. ¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            await setTier(selected);
            Alert.alert('Plan actualizado', `Ahora estás en ${TierLabel[selected]}.`, [
              { text: 'OK', onPress: () => nav.goBack() },
            ]);
          },
        },
      ],
    );
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppBar title="Planes G3" />

        <View style={styles.hero}>
          <View style={styles.heroHead}>
            <IconTile tone="blue" size="md">
              <SparklesIcon color={blueColor} />
            </IconTile>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.eyebrow, { color: c.muted }]}>
                TU PLAN ACTUAL
              </Text>
              <Text style={[typography.h2, { color: c.text }]}>
                {TierLabel[currentTier]}
              </Text>
            </View>
          </View>
          <Text style={[typography.small, { color: c.textSoft, marginTop: spacing.sm }]}>
            Elige cómo quieres que G3 opere para tu unidad. Cancelas o cambias cuando quieras.
          </Text>
        </View>

        {ORDER.map((t) => (
          <PlanCard
            key={t}
            tier={t}
            selected={t === selected}
            isCurrent={isCurrent(t)}
            onSelect={() => setSelected(t)}
          />
        ))}

        <View style={styles.cta}>
          {action ? (
            <Button
              title={
                selected === 'enterprise'
                  ? 'Solicitar contacto'
                  : action === 'upgrade'
                    ? `Mejorar a ${TierLabel[selected]}`
                    : `Cambiar a ${TierLabel[selected]}`
              }
              variant={action === 'upgrade' ? 'primary' : 'outline'}
              onPress={onConfirm}
            />
          ) : (
            <View style={[styles.currentNote, { backgroundColor: c.successBg }]}>
              <CheckIcon size={16} color={c.success} />
              <Text style={[typography.small, { color: c.success, marginLeft: 6, fontWeight: '700' }]}>
                Plan actual
              </Text>
            </View>
          )}
          <Text style={[typography.caption, { color: c.muted, textAlign: 'center', marginTop: spacing.md }]}>
            Facturación en MXN por unidad/mes · cancela en cualquier momento ·
            primer mes sin compromiso
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

interface PlanCardProps {
  tier: TierValue;
  selected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}

function PlanCard({ tier, selected, isCurrent, onSelect }: PlanCardProps) {
  const c = useColors();
  const meta = TierMetaInfo[tier];
  const price = TierPrice[tier];
  const bullets = TIER_BULLETS[tier];

  const isDark = selected;
  const bg = isDark ? c.navy : c.bg;
  const border = isDark ? c.navy : c.border;
  const text = isDark ? '#FFFFFF' : c.text;
  const sub = isDark ? 'rgba(255,255,255,0.7)' : c.muted;
  const accent = isDark ? '#FFFFFF' : c.blue;

  return (
    <Pressable onPress={onSelect}>
      <View
        style={[
          styles.plan,
          { backgroundColor: bg, borderColor: border, borderWidth: selected ? 2 : 1 },
        ]}
      >
        <View style={styles.planHead}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={[typography.h3, { color: text }]}>{TierLabel[tier]}</Text>
              {isCurrent ? <Chip label="Actual" variant={isDark ? 'white' : 'green'} /> : null}
            </View>
            <Text style={[typography.caption, { color: sub, marginTop: 2 }]}>
              {meta.audience}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {price === null ? (
              <Text style={[typography.h3, { color: text }]}>Cotización</Text>
            ) : price === 0 ? (
              <Text style={[typography.h2, { color: text }]}>Gratis</Text>
            ) : (
              <View>
                <Text style={[styles.priceLabel, { color: sub }]}>$ MXN /u·mes</Text>
                <Text style={[typography.h1, { color: text, fontSize: 30 }]}>{price}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[typography.small, { color: sub, marginTop: spacing.sm, marginBottom: spacing.md }]}>
          {meta.tagline}
        </Text>

        {bullets.map((b, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={[typography.small, { color: isDark ? 'rgba(255,255,255,0.92)' : c.text, flex: 1 }]}>
              {b}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg + 4, paddingBottom: spacing.xxl + 24 },
  hero: { marginBottom: spacing.lg },
  heroHead: { flexDirection: 'row', alignItems: 'center' },
  plan: {
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  planHead: { flexDirection: 'row', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  priceLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: spacing.sm + 2 },
  cta: { marginTop: spacing.lg },
  currentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.button,
  },
});
