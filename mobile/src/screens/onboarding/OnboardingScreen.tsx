import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { PageDots } from '@/components/common/PageDots';
import { IconTile, useTileIconColor } from '@/components/common/IconTile';
import { Chip } from '@/components/common/Chip';
import { TruckIcon, CloudOffIcon, ShieldCheckIcon, SparklesIcon } from '@/components/icons';
import { useColors, spacing, typography, radius } from '@/theme';
import { useSubscriptionStore } from '@/stores/subscription';
import { Tier, TierLabel, TierMetaInfo, TierPrice, type TierValue } from '@/constants/tiers';

export const ONBOARDING_KEY = 'g3.onboarding.completed.v1';

interface Pillar {
  icon: (color: string) => React.ReactNode;
  title: string;
  body: string;
}

const PILLARS: Pillar[] = [
  {
    icon: (color) => <TruckIcon size={80} color={color} />,
    title: 'Tu unidad operativa, en el bolsillo',
    body: 'G3 Drive centraliza viajes, bitácoras, evidencias e incidencias en una sola app diseñada para el chofer.',
  },
  {
    icon: (color) => <CloudOffIcon size={80} color={color} />,
    title: 'Funciona sin internet',
    body: 'Registra tu bitácora y sube fotos aunque no haya señal. Todo se sincroniza al recuperar red.',
  },
  {
    icon: (color) => <ShieldCheckIcon size={80} color={color} />,
    title: 'Evidencia segura y respaldada',
    body: 'Carta porte, báscula, diesel y prueba de entrega: todo queda guardado, fechado y geolocalizado.',
  },
  {
    icon: (color) => <SparklesIcon size={80} color={color} />,
    title: 'Elige cómo quieres que opere',
    body: 'Cuatro planes desde gratis hasta enterprise. Empieza por uno y crece cuando quieras.',
  },
];

const WIDTH = Dimensions.get('window').width;
const PLAN_ORDER: TierValue[] = ['free', 'starter', 'pro', 'business'];

export function OnboardingScreen() {
  const c = useColors();
  const blueIcon = useTileIconColor('blue');
  const nav = useNavigation();
  const list = useRef<FlatList>(null);
  const [page, setPage] = useState(0);
  const [planChosen, setPlanChosen] = useState<TierValue>(Tier.Free);
  const setTier = useSubscriptionStore((s) => s.setTier);

  const finish = async () => {
    await setTier(planChosen);
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    nav.reset({ index: 0, routes: [{ name: 'PhoneLogin' as never }] });
  };

  const next = () => {
    if (page < PILLARS.length - 1) {
      list.current?.scrollToIndex({ index: page + 1, animated: true });
    } else {
      finish();
    }
  };

  return (
    <Screen background="cream" padded={false} hideBanners>
      <View style={styles.skipRow}>
        <Pressable onPress={finish}>
          <Text style={[styles.skip, { color: c.muted }]}>Saltar</Text>
        </Pressable>
      </View>

      <FlatList
        ref={list}
        data={PILLARS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / WIDTH))
        }
        renderItem={({ item, index }) => (
          <View style={[styles.page, { width: WIDTH }]}>
            {index < PILLARS.length - 1 ? (
              <PillarSlide pillar={item} blueIcon={blueIcon} c={c} />
            ) : (
              <PlanSlide
                pillar={item}
                blueIcon={blueIcon}
                c={c}
                value={planChosen}
                onChange={setPlanChosen}
              />
            )}
          </View>
        )}
      />

      <View style={styles.dots}>
        <PageDots count={PILLARS.length} active={page} />
      </View>
      <View style={styles.bottom}>
        <Button
          title={page === PILLARS.length - 1 ? `Comenzar con ${TierLabel[planChosen]}` : 'Continuar'}
          onPress={next}
        />
        {page === PILLARS.length - 1 ? (
          <Text style={[typography.caption, { color: c.muted, textAlign: 'center', marginTop: spacing.sm }]}>
            Puedes cambiar tu plan en cualquier momento desde Ajustes.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

function PillarSlide({
  pillar,
  blueIcon,
  c,
}: {
  pillar: Pillar;
  blueIcon: string;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <>
      <View style={styles.iconHolder}>
        <IconTile tone="blue" size="lg">{pillar.icon(blueIcon)}</IconTile>
      </View>
      <Text style={[typography.h1, styles.title, { color: c.text }]}>{pillar.title}</Text>
      <Text style={[typography.body, styles.body, { color: c.textSoft }]}>{pillar.body}</Text>
    </>
  );
}

function PlanSlide({
  pillar,
  blueIcon,
  c,
  value,
  onChange,
}: {
  pillar: Pillar;
  blueIcon: string;
  c: ReturnType<typeof useColors>;
  value: TierValue;
  onChange: (t: TierValue) => void;
}) {
  return (
    <View style={{ width: '100%' }}>
      <View style={styles.iconHolderSm}>
        <IconTile tone="blue" size="md">
          <SparklesIcon size={28} color={blueIcon} />
        </IconTile>
      </View>
      <Text style={[typography.h2, styles.title, { color: c.text }]}>{pillar.title}</Text>
      <Text style={[typography.small, styles.body, { color: c.textSoft, marginBottom: spacing.lg }]}>
        {pillar.body}
      </Text>
      {PLAN_ORDER.map((tier) => {
        const selected = tier === value;
        const price = TierPrice[tier];
        const meta = TierMetaInfo[tier];
        return (
          <Pressable
            key={tier}
            onPress={() => onChange(tier)}
            style={[
              styles.planRow,
              {
                backgroundColor: selected ? c.navy : c.bg,
                borderColor: selected ? c.navy : c.border,
                borderWidth: selected ? 2 : 1,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.planRowTitle}>
                <Text style={[typography.bodyStrong, { color: selected ? '#fff' : c.text }]}>
                  {TierLabel[tier]}
                </Text>
                {tier === 'pro' ? (
                  <Chip label="Recomendado" variant={selected ? 'white' : 'blue'} />
                ) : null}
              </View>
              <Text style={[typography.caption, { color: selected ? 'rgba(255,255,255,0.7)' : c.muted }]}>
                {meta.audience}
              </Text>
            </View>
            <Text style={[typography.bodyStrong, { color: selected ? '#fff' : c.text }]}>
              {price === 0 ? 'Gratis' : `$${price}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  skipRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg + 4, paddingTop: spacing.md },
  skip: { fontSize: 13, fontWeight: '600' },
  page: { paddingHorizontal: spacing.lg + 4, paddingTop: spacing.lg },
  iconHolder: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  iconHolderSm: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
  title: { textAlign: 'center', marginBottom: spacing.sm, paddingHorizontal: spacing.md },
  body: { textAlign: 'center', paddingHorizontal: spacing.lg },
  dots: { position: 'absolute', bottom: 130, left: 0, right: 0 },
  bottom: { position: 'absolute', bottom: spacing.xl + 4, left: spacing.lg + 4, right: spacing.lg + 4 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 2,
    borderRadius: radius.button,
    marginBottom: spacing.sm + 2,
  },
  planRowTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
