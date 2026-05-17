import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { Banner, bannerIconColor } from '@/components/common/Banner';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import { MapPinIcon, CameraIcon, SparklesIcon } from '@/components/icons';
import { useCreateIncident } from '@/hooks/useIncidents';
import { useAuthStore } from '@/stores/auth';
import { getCurrentCoords } from '@/services/location';
import { ai } from '@/services/ai';
import {
  IncidentType,
  IncidentTypeLabel,
  IncidentTypeIcon,
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
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  const onDescriptionChange = async (txt: string) => {
    setDescription(txt);
    if (txt.length < 8) {
      setAiSuggestion(null);
      return;
    }
    const r = await ai.routeIncident({ description: txt });
    if (r.confidence > 0.7) {
      setType(r.type);
      setUrgency(r.urgency);
      setAiSuggestion(
        `Clasificado como ${IncidentTypeLabel[r.type]} · urgencia ${IncidentUrgencyLabel[r.urgency]}. Notificará a ${r.routeTo.join(', ')}.`,
      );
    }
  };

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
    <Screen padded={false} background="bg">
      <ScrollView contentContainerStyle={{ padding: spacing.lg + 4 }}>
        <AppBar title="Reportar incidencia" />

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.grid}>
          {Object.values(IncidentType).map((t) => {
            const isActive = type === t;
            return (
              <Pressable
                key={t}
                style={[styles.tile, isActive && styles.tileActive]}
                onPress={() => setType(t)}
              >
                <IconTile tone={isActive ? 'dark' : 'blue'} size="md">
                  <DynamicIcon
                    name={IncidentTypeIcon[t]}
                    size={20}
                    color={isActive ? '#fff' : tileIconColor('blue')}
                  />
                </IconTile>
                <Text style={[styles.tileName, isActive && { color: '#fff' }]}>
                  {IncidentTypeLabel[t]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Urgencia</Text>
        <View style={styles.urgencyRow}>
          {Object.values(IncidentUrgency).map((u) => {
            const c = URGENCY_COLOR[u];
            const isActive = urgency === u;
            return (
              <Pressable
                key={u}
                onPress={() => setUrgency(u)}
                style={[
                  styles.urgency,
                  { borderColor: c },
                  isActive && { backgroundColor: c },
                ]}
              >
                <Text style={[styles.urgencyText, { color: isActive ? '#fff' : c }]}>
                  {IncidentUrgencyLabel[u]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextField
          label="Descripción"
          multiline
          value={description}
          onChangeText={onDescriptionChange}
          placeholder="Describe lo que está pasando..."
        />

        {aiSuggestion ? (
          <Banner tone="info" icon={<SparklesIcon size={18} color={bannerIconColor('info')} />}>
            {aiSuggestion}
          </Banner>
        ) : null}

        <TextField
          label="Ubicación"
          leftIcon={<MapPinIcon size={20} color={colors.muted} />}
          value={location}
          onChangeText={setLocation}
          placeholder="km 87 autopista..."
        />
        <Button
          title={coords ? 'GPS capturado' : 'Capturar GPS'}
          variant="outline"
          size="md"
          leftIcon={<MapPinIcon size={18} color={colors.navy} />}
          onPress={captureGps}
        />
        <View style={{ height: spacing.md }} />
        <Button
          title="Adjuntar evidencia"
          variant="outline"
          size="md"
          leftIcon={<CameraIcon size={18} color={colors.navy} />}
          onPress={() => Alert.alert('Próximamente', 'Adjuntar foto en la siguiente tanda.')}
          style={{ marginBottom: spacing.lg }}
        />
        <Button
          title="Reportar incidencia"
          variant="danger"
          onPress={onSubmit}
          loading={mutate.isPending}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.eyebrow, marginTop: spacing.md, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  tile: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md + 2,
  },
  tileActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  tileName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  urgencyRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md },
  urgency: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderRadius: radius.pill,
    backgroundColor: '#fff',
  },
  urgencyText: { fontWeight: '700', fontSize: 13 },
});
