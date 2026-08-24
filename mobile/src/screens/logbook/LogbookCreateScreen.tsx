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
import { Chip } from '@/components/common/Chip';
import { Banner, bannerIconColor } from '@/components/common/Banner';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import { MapPinIcon, CameraIcon, SparklesIcon } from '@/components/icons';
import { useCreateLogbookEntry } from '@/hooks/useLogbook';
import { useExpensePolicy } from '@/hooks/useExpensePolicy';
import { useAuthStore } from '@/stores/auth';
import { getCurrentCoords } from '@/services/location';
import { takePhoto, type CapturedImage } from '@/services/camera';
import { uploadEvidence } from '@/api/evidences';
import { validateExpense } from '@/api/expensePolicy';
import { offlineQueue } from '@/services/offlineQueue';
import { useNetworkStore } from '@/stores/network';
import { isDemo } from '@/demo';
import { ai } from '@/services/ai';
import {
  LogbookEvent,
  LogbookEventLabel,
  LogbookEventIcon,
  FuelLevel,
  FuelLevelLabel,
  EvidenceType,
  type LogbookEventValue,
  type FuelLevelValue,
  type EvidenceTypeValue,
} from '@/constants/enums';
import { useColors, radius, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';
import type { AppNav, AppStackParamList } from '@/navigation/types';

export function LogbookCreateScreen() {
  const c = useColors();
  const styles = makeStyles(c);
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
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<CapturedImage | null>(null);
  const [receiptHint, setReceiptHint] = useState<string | null>(null);
  const { policy } = useExpensePolicy();
  const online = useNetworkStore((s) => s.online);
  const effectiveOnline = isDemo || online;

  /** Tipo de evidencia según el evento (para que la IA sepa qué buscar). */
  const receiptEvidenceType = (): EvidenceTypeValue => {
    if (type === LogbookEvent.Diesel) return EvidenceType.DieselTicket;
    if (type === LogbookEvent.Toll) return EvidenceType.TollTicket;
    return EvidenceType.Other;
  };

  // Foto del ticket → IA extrae monto/concepto y prellena el gasto.
  const onCaptureReceipt = async () => {
    const img = await takePhoto();
    if (!img) return;
    setReceipt(img);
    const r = await ai.extractEvidence({
      photoUri: img.uri,
      hintType: receiptEvidenceType(),
    });
    if (r.confidence > 0.5) {
      const parts: string[] = [];
      if (r.fields.amount != null) {
        setExpense(String(r.fields.amount));
        parts.push(`$${r.fields.amount.toFixed(2)}`);
      }
      if (r.fields.liters != null) parts.push(`${r.fields.liters} L`);
      if (!concept) {
        const suggested =
          type === LogbookEvent.Diesel ? 'diesel'
          : type === LogbookEvent.Toll ? 'caseta'
          : r.fields.counterpartyName ?? '';
        if (suggested) setConcept(suggested);
      }
      setReceiptHint(
        parts.length
          ? `Ticket leído por IA: ${parts.join(' · ')} — revisa y ajusta si hace falta.`
          : 'Ticket capturado — no se pudieron leer montos, captura el gasto manualmente.',
      );
    } else {
      setReceiptHint('Ticket capturado. La IA no pudo leerlo; captura el gasto manualmente.');
    }
  };

  // G3 AI-First: al cambiar comentarios, sugerir tipo de evento.
  const onCommentsChange = async (txt: string) => {
    setComments(txt);
    if (txt.length < 5) {
      setAiHint(null);
      return;
    }
    const result = await ai.classifyLogbookEvent({ text: txt });
    if (result.confidence > 0.6 && result.eventType !== type) {
      setAiHint(`Asistente sugiere: ${LogbookEventLabel[result.eventType]}`);
    } else {
      setAiHint(null);
    }
    if (result.suggested.expenseConcept && !concept) setConcept(result.suggested.expenseConcept);
  };

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
    const expenseAmount = Number.isNaN(exp as number) ? null : exp;

    // Regla de gastos configurada desde G3 Admin: los gastos sin ticket
    // solo pasan si la política de la compañía lo permite.
    if (expenseAmount != null && expenseAmount > 0) {
      const rejection = validateExpense(policy, expenseAmount, !!receipt);
      if (rejection) {
        Alert.alert('Gasto sin comprobante', rejection, [
          { text: 'Tomar foto del ticket', onPress: onCaptureReceipt },
          { text: 'Cancelar', style: 'cancel' },
        ]);
        return;
      }
    }

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
        expense_amount: expenseAmount,
        expense_concept: concept || null,
        expense_has_receipt: !!receipt,
        comments: comments || null,
      });

      // Sube la foto del ticket como evidencia ligada a la entrada.
      if (receipt) {
        const evidencePayload = {
          driverId,
          tripId: route.params.tripId,
          logbookId: result.queued ? null : (result.entry as { id?: string }).id ?? null,
          type: receiptEvidenceType(),
          localUri: receipt.uri,
          mimeType: 'image/jpeg',
          coords,
        };
        if (!effectiveOnline) {
          await offlineQueue.enqueue('evidence', evidencePayload);
        } else {
          await uploadEvidence(evidencePayload);
        }
      }

      Alert.alert(
        result.queued ? 'Guardado offline' : 'Registrado',
        result.queued
          ? 'Sin conexión: se sincronizará automáticamente.'
          : receipt
            ? 'Evento y ticket agregados a la bitácora.'
            : 'Evento agregado a la bitácora.',
      );
      nav.goBack();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('No se pudo guardar', msg);
    }
  };

  return (
    <Screen padded={false} background="bg">
      <ScrollView contentContainerStyle={{ padding: spacing.lg + 4 }}>
        <AppBar title="Nuevo evento" />

        <Text style={styles.label}>Tipo de evento</Text>
        <View style={styles.grid}>
          {Object.values(LogbookEvent).map((ev) => {
            const isActive = type === ev;
            return (
              <Pressable
                key={ev}
                style={[styles.tile, isActive && styles.tileActive]}
                onPress={() => setType(ev)}
              >
                <IconTile tone={isActive ? 'dark' : 'blue'} size="md">
                  <DynamicIcon
                    name={LogbookEventIcon[ev]}
                    size={20}
                    color={isActive ? '#fff' : tileIconColor('blue')}
                  />
                </IconTile>
                <Text style={[styles.tileName, isActive && { color: '#fff' }]}>
                  {LogbookEventLabel[ev]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {aiHint ? (
          <Banner
            tone="info"
            icon={<SparklesIcon size={18} color={bannerIconColor('info')} />}
          >
            {aiHint}
          </Banner>
        ) : null}

        <TextField
          label="Ubicación"
          leftIcon={<MapPinIcon size={20} color={c.muted} />}
          value={location}
          onChangeText={setLocation}
          placeholder="Caseta Atlacomulco, km 87…"
        />
        <Button
          title={coords ? 'GPS capturado' : 'Capturar GPS'}
          variant="outline"
          size="md"
          leftIcon={<MapPinIcon size={18} color={c.navy} />}
          onPress={captureGps}
          loading={gpsLoading}
        />

        <View style={{ height: spacing.md }} />

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Kilometraje"
              keyboardType="number-pad"
              value={odometer}
              onChangeText={setOdometer}
              placeholder="142,510"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Gasto"
              keyboardType="decimal-pad"
              value={expense}
              onChangeText={setExpense}
              placeholder="0.00"
            />
          </View>
        </View>

        <Text style={styles.label}>Combustible</Text>
        <View style={styles.pills}>
          {Object.values(FuelLevel).map((f) => (
            <Pressable key={f} onPress={() => setFuel(fuel === f ? null : f)}>
              <Chip label={FuelLevelLabel[f]} variant={fuel === f ? 'navy' : 'gray'} />
            </Pressable>
          ))}
        </View>

        <TextField
          label="Concepto"
          value={concept}
          onChangeText={setConcept}
          placeholder="diesel, caseta, comida…"
        />
        <TextField
          label="Comentarios"
          multiline
          value={comments}
          onChangeText={onCommentsChange}
          placeholder="Describe brevemente..."
        />

        {receiptHint ? (
          <Banner
            tone="info"
            icon={<SparklesIcon size={18} color={bannerIconColor('info')} />}
          >
            {receiptHint}
          </Banner>
        ) : null}

        {policy.require_receipt || !policy.allow_manual_expense ? (
          <Text style={[typography.caption, { color: c.muted, marginBottom: spacing.sm }]}>
            Tu administrador requiere foto del ticket para registrar gastos.
          </Text>
        ) : policy.manual_max_amount != null ? (
          <Text style={[typography.caption, { color: c.muted, marginBottom: spacing.sm }]}>
            Gastos sin ticket hasta ${policy.manual_max_amount.toFixed(2)} — arriba de eso, foto obligatoria.
          </Text>
        ) : null}

        <Button
          title={receipt ? 'Ticket capturado · volver a tomar' : 'Foto del ticket (IA)'}
          variant="outline"
          size="md"
          leftIcon={<CameraIcon size={18} color={receipt ? c.blue : c.navy} />}
          style={{ marginBottom: spacing.md + 2 }}
          onPress={onCaptureReceipt}
        />
        <Button title="Guardar evento" onPress={onSubmit} loading={mutate.isPending} />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  label: { ...typography.eyebrow, marginTop: spacing.md, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2, marginBottom: spacing.md },
  tile: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: spacing.sm,
  },
  tileActive: { backgroundColor: c.navy, borderColor: c.navy },
  tileName: { fontSize: 12, fontWeight: '600', color: c.text, textAlign: 'center' },
  pills: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md + 2 },
});
