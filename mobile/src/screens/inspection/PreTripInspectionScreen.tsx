import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import {
  CheckIcon,
  ChevronRightIcon,
  CameraIcon,
  SparklesIcon,
} from '@/components/icons';
import { useAuthStore } from '@/stores/auth';
import { demoStore } from '@/demo';
import { colors, radius, spacing, typography } from '@/theme';
import type { InspectionItem } from '@/demo/data';

/**
 * Versión base de la inspección pre-viaje.
 *
 * El detalle definitivo (lista exhaustiva de puntos, jerarquía,
 * fotos obligatorias, severidad y reglas de habilitación del botón
 * "Iniciar viaje") se cerrará en la siguiente iteración con el cliente.
 * Este shell ya integra el agente AI `analyzeInspectionPhoto` para
 * mostrar el patrón de uso.
 */
export function PreTripInspectionScreen() {
  const nav = useNavigation();
  const profile = useAuthStore((s) => s.profile);
  const [items, setItems] = useState<InspectionItem[]>([]);

  useEffect(() => {
    demoStore.listInspection().then(setItems);
  }, []);

  const okCount = items.filter((i) => i.status === 'ok').length;
  const pct = items.length ? Math.round((okCount / items.length) * 100) : 0;
  const allOk = items.length > 0 && okCount === items.length;

  const toggle = async (item: InspectionItem) => {
    const next: InspectionItem['status'] = item.status === 'ok' ? 'pending' : 'ok';
    await demoStore.setInspectionStatus(item.id, next);
    setItems(await demoStore.listInspection());
  };

  const onStart = () => {
    if (!allOk) {
      Alert.alert(
        'Faltan puntos',
        `Completa la inspección antes de salir. ${items.length - okCount} pendiente${items.length - okCount === 1 ? '' : 's'}.`,
      );
      return;
    }
    Alert.alert('Listo para salir', 'Inspección completa. ¡Buen viaje!');
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg + 4, paddingBottom: spacing.xxl + 30 }}>
        <AppBar title="Inspección pre-viaje" />

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>
            UNIDAD {profile?.assigned_unit_number ?? 'U-104'} ·{' '}
            {profile?.unit_type?.toUpperCase() ?? 'TRÁILER 53"'}
          </Text>
          <Text style={styles.heroTitle}>Antes de salir, revisa {items.length} puntos</Text>
          <View style={styles.progressRow}>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {okCount}/{items.length}
            </Text>
          </View>
          <View style={styles.aiHint}>
            <SparklesIcon size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.aiHintText}>
              AI revisará tus fotos en busca de daños o anomalías
            </Text>
          </View>
        </View>

        <Card variant="flat" padding={0} style={{ marginTop: spacing.md + 2 }}>
          {items.map((item, idx) => (
            <Pressable
              key={item.id}
              onPress={() => toggle(item)}
              style={[styles.row, idx === items.length - 1 && styles.lastRow]}
            >
              <IconTile
                tone={item.status === 'ok' ? 'success' : 'navy'}
                size="md"
              >
                {item.status === 'ok' ? (
                  <CheckIcon color={tileIconColor('success')} />
                ) : (
                  <View style={styles.emptyTile} />
                )}
              </IconTile>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={typography.bodyStrong}>{item.label}</Text>
                <Text style={typography.caption}>{item.description}</Text>
              </View>
              {item.status === 'pending' && item.id === 'photo' ? (
                <CameraIcon color={colors.muted} />
              ) : item.status === 'pending' ? (
                <ChevronRightIcon color={colors.muted} />
              ) : null}
            </Pressable>
          ))}
        </Card>

        <View style={{ marginTop: spacing.lg }}>
          <Button
            title={
              allOk
                ? 'Iniciar viaje'
                : `Iniciar viaje · ${items.length - okCount} pendiente${items.length - okCount === 1 ? '' : 's'}`
            }
            variant={allOk ? 'primary' : 'outline'}
            onPress={onStart}
            disabled={!allOk}
          />
        </View>

        <Text style={styles.note}>
          Pendiente de detallar con el cliente. Esta vista es la base — la próxima
          iteración define los puntos exactos, fotos obligatorias y severidad.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.card,
    padding: spacing.lg + 4,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 4 },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
  emptyTile: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  note: {
    color: colors.muted,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
