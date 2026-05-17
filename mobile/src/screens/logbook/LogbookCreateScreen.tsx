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
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { useCreateLogbookEntry } from '@/hooks/useLogbook';
import { useAuthStore } from '@/stores/auth';
import { getCurrentCoords } from '@/services/location';
import {
  LogbookEvent,
  LogbookEventIcon,
  LogbookEventLabel,
  FuelLevel,
  FuelLevelLabel,
  type LogbookEventValue,
  type FuelLevelValue,
} from '@/constants/enums';
import { colors, radius, spacing, typography } from '@/theme';
import type { AppNav, AppStackParamList } from '@/navigation/types';

export function LogbookCreateScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'LogbookCreate'>>();
  const nav = useNavigation<AppNav<'LogbookCreate'>>();
  const driverId = useAuthStore((s) => s.session?.user.id);
  const mutate = useCreateLogbookEntry(route.params.tripId);

  const [type, setType] = useState<LogbookEventValue>(LogbookEvent.Stop);
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [odometer, setOdometer] = useState('');
  const [fuel, setFuel] = useState<FuelLevelValue | null>(null);
  const [expense, setExpense] = useState('');
  const [concept, setConcept] = useState('');
  const [comments, setComments] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  const captureGps = async () => {
    setGpsLoading(true);
    const c = await getCurrentCoords();
    setGpsLoading(false);
    if (!c) {
      Alert.alert('GPS', 'No se pudo obtener la ubicación. Captura el lugar manualmente.');
      return;
    }
    setCoords({ lat: c.lat, lng: c.lng });
    setLocation((prev) => prev || `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`);
  };

  const onSubmit = async () => {
    if (!driverId) return;
    const odo = odometer ? parseInt(odometer, 10) : null;
    const exp = expense ? parseFloat(expense) : null;
    try {
      const result = await mutate.mutateAsync({
        driver_id: driverId,
        event_type: type,
        occurred_at: new Date().toISOString(),
        location_text: location || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        odometer_km: Number.isNaN(odo as number) ? null : odo,
        fuel,
        expense_amount: Number.isNaN(exp as number) ? null : exp,
        expense_concept: concept || null,
        comments: comments || null,
      });
      Alert.alert(
        result.queued ? 'Guardado offline' : 'Registrado',
        result.queued
          ? 'Sin conexión: se sincronizará automáticamente.'
          : 'Evento agregado a la bitácora.',
      );
      nav.goBack();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('No se pudo guardar', msg);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.label}>TIPO DE EVENTO</Text>
        <View style={styles.grid}>
          {Object.values(LogbookEvent).map((ev) => (
            <Pressable
              key={ev}
              style={[styles.tile, type === ev && styles.tileActive]}
              onPress={() => setType(ev)}
            >
              <Text style={styles.tileIcon}>{LogbookEventIcon[ev]}</Text>
              <Text style={styles.tileLabel}>{LogbookEventLabel[ev]}</Text>
            </Pressable>
          ))}
        </View>

        <TextField
          label="Ubicación"
          value={location}
          onChangeText={setLocation}
          placeholder="Caseta Atlacomulco, km 87..."
        />
        <Button
          title={coords ? '📍 GPS capturado' : '📍 Capturar GPS'}
          variant="secondary"
          onPress={captureGps}
          loading={gpsLoading}
        />

        <View style={{ height: spacing.md }} />

        <TextField
          label="Kilometraje"
          keyboardType="number-pad"
          value={odometer}
          onChangeText={setOdometer}
          placeholder="ej. 142385"
        />

        <Text style={styles.label}>NIVEL DE COMBUSTIBLE</Text>
        <View style={styles.row}>
          {Object.values(FuelLevel).map((f) => (
            <Pressable
              key={f}
              style={[styles.pill, fuel === f && styles.pillActive]}
              onPress={() => setFuel(fuel === f ? null : f)}
            >
              <Text style={[styles.pillText, fuel === f && styles.pillTextActive]}>
                {FuelLevelLabel[f]}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextField
          label="Gasto registrado"
          keyboardType="decimal-pad"
          value={expense}
          onChangeText={setExpense}
          placeholder="0.00"
        />
        <TextField
          label="Concepto"
          value={concept}
          onChangeText={setConcept}
          placeholder="diesel, caseta, comida..."
        />
        <TextField
          label="Comentarios"
          value={comments}
          onChangeText={setComments}
          multiline
          numberOfLines={3}
          style={{ height: 80, paddingTop: spacing.sm }}
        />

        <Button title="GUARDAR" onPress={onSubmit} loading={mutate.isPending} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginTop: spacing.md, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  tile: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileActive: { borderColor: colors.text, backgroundColor: colors.primaryLight },
  tileIcon: { fontSize: 28, marginBottom: 4 },
  tileLabel: { color: colors.text, fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.text, fontWeight: '600' },
  pillTextActive: { color: colors.text },
});
