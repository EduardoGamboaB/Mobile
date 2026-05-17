import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Chip } from '@/components/common/Chip';
import { Banner, bannerIconColor } from '@/components/common/Banner';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import {
  CheckIcon,
  ChevronRightIcon,
  CameraIcon,
  SparklesIcon,
  AlertIcon,
} from '@/components/icons';
import { useAuthStore } from '@/stores/auth';
import { demoStore } from '@/demo';
import {
  INSPECTION_CATALOG,
  INSPECTION_BY_CATEGORY,
  InspectionCategoryMeta,
  type InspectionCategoryValue,
  type InspectionCheckpoint,
} from '@/constants/inspection';
import { colors, radius, spacing, typography } from '@/theme';
import type { InspectionResult } from '@/models/inspection';
import type { AppNav } from '@/navigation/types';

export function PreTripInspectionScreen() {
  const nav = useNavigation<AppNav<'PreTripInspection'>>();
  const profile = useAuthStore((s) => s.profile);
  const [results, setResults] = useState<InspectionResult[]>([]);

  useEffect(() => {
    const unsub = nav.addListener('focus', async () => {
      setResults(await demoStore.listInspection());
    });
    return unsub;
  }, [nav]);

  const byId = useMemo(() => {
    const map: Record<string, InspectionResult> = {};
    results.forEach((r) => (map[r.checkpointId] = r));
    return map;
  }, [results]);

  const okCount = results.filter((r) => r.status === 'ok').length;
  const failCount = results.filter((r) => r.status === 'fail').length;
  const blockingPending = INSPECTION_CATALOG.filter(
    (c) => c.blocksDeparture && byId[c.id]?.status !== 'ok',
  );
  const canStart = blockingPending.length === 0 && failCount === 0;
  const total = INSPECTION_CATALOG.length;
  const pct = total ? Math.round((okCount / total) * 100) : 0;

  const onStart = () => {
    if (!canStart) {
      Alert.alert(
        'No puedes salir aún',
        `Faltan ${blockingPending.length} punto${blockingPending.length === 1 ? '' : 's'} crítico${blockingPending.length === 1 ? '' : 's'} o hay puntos en falla.`,
      );
      return;
    }
    Alert.alert(
      'Inspección completa',
      `Conforme a NOM-068-SCT-2-2014. ${okCount}/${total} puntos OK. ¡Buen viaje!`,
    );
  };

  const reset = async () => {
    await demoStore.resetInspection();
    setResults(await demoStore.listInspection());
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppBar
          title="Inspección pre-viaje"
          right={
            <Pressable onPress={reset}>
              <Text style={styles.action}>Reiniciar</Text>
            </Pressable>
          }
        />

        <View style={styles.heroCard}>
          <View style={styles.heroHead}>
            <Text style={styles.heroEyebrow}>
              UNIDAD {profile?.assigned_unit_number ?? 'U-104'} ·{' '}
              {profile?.unit_type?.toUpperCase() ?? 'TRÁILER 53"'}
            </Text>
            <Chip label="NOM-068-SCT-2-2014" variant="white" />
          </View>
          <Text style={styles.heroTitle}>
            {total} puntos · {Object.keys(INSPECTION_BY_CATEGORY).length} categorías
          </Text>
          <View style={styles.progressRow}>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {okCount}/{total}
            </Text>
          </View>
          <View style={styles.aiHint}>
            <SparklesIcon size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.aiHintText}>
              La IA revisa tus fotos en busca de daños o anomalías por categoría
            </Text>
          </View>
        </View>

        {blockingPending.length > 0 ? (
          <Banner tone="danger" icon={<AlertIcon size={18} color={bannerIconColor('danger')} />}>
            {blockingPending.length} punto{blockingPending.length === 1 ? '' : 's'} crítico
            {blockingPending.length === 1 ? '' : 's'} pendiente
            {blockingPending.length === 1 ? '' : 's'}. No puedes iniciar viaje.
          </Banner>
        ) : null}

        {(Object.keys(INSPECTION_BY_CATEGORY) as InspectionCategoryValue[]).map((cat) => (
          <CategorySection
            key={cat}
            category={cat}
            items={INSPECTION_BY_CATEGORY[cat]}
            results={byId}
            onTap={(c) => nav.navigate('CheckpointDetail', { checkpointId: c.id })}
          />
        ))}

        <View style={{ marginTop: spacing.xl }}>
          <Button
            title={canStart ? 'Iniciar viaje' : `Iniciar viaje · ${blockingPending.length} crítico${blockingPending.length === 1 ? '' : 's'} pendiente${blockingPending.length === 1 ? '' : 's'}`}
            variant={canStart ? 'primary' : 'outline'}
            onPress={onStart}
            disabled={!canStart}
          />
        </View>

        <Text style={styles.legendTitle}>Severidad</Text>
        <View style={styles.legendRow}>
          <Chip label="Crítico" variant="red" />
          <Text style={styles.legendText}>bloquea salida</Text>
        </View>
        <View style={styles.legendRow}>
          <Chip label="Mayor" variant="amber" />
          <Text style={styles.legendText}>permite salir con autorización</Text>
        </View>
        <View style={styles.legendRow}>
          <Chip label="Menor" variant="gray" />
          <Text style={styles.legendText}>se documenta, no bloquea</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function CategorySection({
  category,
  items,
  results,
  onTap,
}: {
  category: InspectionCategoryValue;
  items: InspectionCheckpoint[];
  results: Record<string, InspectionResult>;
  onTap: (c: InspectionCheckpoint) => void;
}) {
  const meta = InspectionCategoryMeta[category];
  const okIn = items.filter((i) => results[i.id]?.status === 'ok').length;
  return (
    <View style={{ marginTop: spacing.lg }}>
      <View style={styles.catHead}>
        <IconTile tone="navy" size="sm">
          <DynamicIcon name={meta.icon} size={18} color={tileIconColor('navy')} />
        </IconTile>
        <Text style={[typography.bodyStrong, { flex: 1, marginLeft: spacing.sm + 2 }]}>
          {meta.label}
        </Text>
        <Text style={styles.catCount}>
          {okIn}/{items.length}
        </Text>
      </View>
      <Card variant="flat" padding={0}>
        {items.map((c, idx) => {
          const result = results[c.id];
          const status = result?.status ?? 'pending';
          const isLast = idx === items.length - 1;
          return (
            <Pressable
              key={c.id}
              onPress={() => onTap(c)}
              style={[styles.row, isLast && styles.lastRow]}
            >
              <StatusDot status={status} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <View style={styles.itemHead}>
                  <Text style={typography.bodyStrong} numberOfLines={1}>
                    {c.label}
                  </Text>
                  <SeverityChip severity={c.severity} />
                </View>
                <Text style={typography.caption} numberOfLines={2}>
                  {c.description}
                </Text>
                <View style={styles.itemMeta}>
                  {c.photoRequired ? (
                    <View style={styles.metaPill}>
                      <CameraIcon size={11} color={colors.muted} />
                      <Text style={styles.metaPillText}>Foto requerida</Text>
                    </View>
                  ) : null}
                  {result?.aiFindings?.length ? (
                    <View style={styles.metaPill}>
                      <SparklesIcon size={11} color={colors.blue} />
                      <Text style={[styles.metaPillText, { color: colors.blue }]}>
                        IA: {result.aiFindings.length} hallazgo{result.aiFindings.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <ChevronRightIcon size={18} color={colors.muted} />
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}

function StatusDot({ status }: { status: InspectionResult['status'] }) {
  if (status === 'ok') {
    return (
      <IconTile tone="success" size="sm">
        <CheckIcon size={18} color={tileIconColor('success')} />
      </IconTile>
    );
  }
  if (status === 'fail') {
    return (
      <IconTile tone="danger" size="sm">
        <AlertIcon size={18} color={tileIconColor('danger')} />
      </IconTile>
    );
  }
  return (
    <View style={styles.pendingDot}>
      <View style={styles.pendingInner} />
    </View>
  );
}

function SeverityChip({ severity }: { severity: InspectionCheckpoint['severity'] }) {
  const v =
    severity === 'critical' ? 'red' : severity === 'major' ? 'amber' : 'gray';
  const label = severity === 'critical' ? 'Crítico' : severity === 'major' ? 'Mayor' : 'Menor';
  return <Chip label={label} variant={v} />;
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg + 4, paddingBottom: spacing.xxl + 12 },
  action: { color: colors.blue, fontSize: 13, fontWeight: '600' },
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.card,
    padding: spacing.lg + 4,
  },
  heroHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    flex: 1,
  },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 6 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginTop: spacing.md,
  },
  bar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: '#fff' },
  progressLabel: { color: '#fff', fontWeight: '700' },
  aiHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  aiHintText: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  catHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  catCount: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
  itemHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  itemMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, marginTop: 6 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaPillText: { fontSize: 10, color: colors.muted, fontWeight: '600' },
  pendingDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  legendTitle: { ...typography.eyebrow, marginTop: spacing.xl, marginBottom: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs + 2 },
  legendText: { color: colors.muted, fontSize: 12 },
});
