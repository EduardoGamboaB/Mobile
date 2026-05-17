import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { useCreateIncident } from '@/hooks/useIncidents';
import { useAuthStore } from '@/stores/auth';
import { getCurrentCoords } from '@/services/location';
import {
  IncidentType,
  IncidentTypeLabel,
  IncidentUrgency,
  IncidentUrgencyLabel,
  type IncidentTypeValue,
  type IncidentUrgencyValue,
} from '@/constants/enums';
import { colors, radius, spacing, typography } from '@/theme';
import type { AppNav, AppStackParamList } from '@/navigation/types';

const URGENCY_COLOR: Record<IncidentUrgencyValue, string> = {
  low: colors.success,
  medium: colors.warning,
  high: '#EA580C',
  critical: colors.danger,
};

export function IncidentCreateScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'IncidentCreate'>>();
  const nav = useNavigation<AppNav<'IncidentCreate'>>();
  const driverId = useAuthStore((s) => s.session?.user.id);
  const mutate = useCreateIncident();

  const [type, setType] = useState<IncidentTypeValue>(IncidentType.Other);
  const [urgency, setUrgency] = useState<IncidentUrgencyValue>(IncidentUrgency.Medium);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const captureGps = async () => {
    const c = await getCurrentCoords();
    if (!c) {
      Alert.alert('GPS', 'No se pudo obtener la ubicación.');
      return;
    }
    setCoords({ lat: c.lat, lng: c.lng });
    setLocation((prev) => prev || `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`);
  };

  const onSubmit = async () => {
    if (!driverId) return;
    if (!description.trim()) {
      Alert.alert('Descripción requerida', 'Describe brevemente la incidencia.');
      return;
    }
    try {
      const result = await mutate.mutateAsync({
        driver_id: driverId,
        trip_id: route.params?.tripId ?? null,
        type,
        urgency,
        description,
        occurred_at: new Date().toISOString(),
        location_text: location || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      Alert.alert(
        result.queued ? 'Guardado offline' : 'Reportada',
        result.queued
          ? 'Sin conexión: se enviará al recuperarla.'
          : 'Incidencia enviada a despacho.',
      );
      nav.goBack();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error';
      Alert.alert('No se pudo reportar', msg);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.label}>TIPO DE INCIDENCIA</Text>
        <View style={styles.grid}>
          {Object.values(IncidentType).map((t) => (
            <Pressable
              key={t}
              style={[styles.tile, type === t && styles.tileActive]}
              onPress={() => setType(t)}
            >
              <Text style={styles.tileText}>{IncidentTypeLabel[t]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>URGENCIA</Text>
        <View style={styles.row}>
          {Object.values(IncidentUrgency).map((u) => (
            <Pressable
              key={u}
              onPress={() => setUrgency(u)}
              style={[
                styles.urgency,
                { borderColor: URGENCY_COLOR[u] },
                urgency === u && { backgroundColor: URGENCY_COLOR[u] },
              ]}
            >
              <Text style={styles.urgencyText}>{IncidentUrgencyLabel[u]}</Text>
            </Pressable>
          ))}
        </View>

        <TextField
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={{ height: 100, paddingTop: spacing.sm }}
          placeholder="Describe lo que está pasando..."
        />
        <TextField
          label="Ubicación"
          value={location}
          onChangeText={setLocation}
          placeholder="km 87 autopista..."
        />
        <Button
          title={coords ? '📍 GPS capturado' : '📍 Capturar GPS'}
          variant="secondary"
          onPress={captureGps}
        />

        <View style={{ height: spacing.lg }} />
        <Button
          title="REPORTAR INCIDENCIA"
          variant="danger"
          onPress={onSubmit}
          loading={mutate.isPending}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginTop: spacing.md, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '48%',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileActive: { borderColor: colors.text, backgroundColor: colors.primaryLight },
  tileText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  urgency: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderRadius: radius.pill,
  },
  urgencyText: { color: colors.text, fontWeight: '700' },
});
