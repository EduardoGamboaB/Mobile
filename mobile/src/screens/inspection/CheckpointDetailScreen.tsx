import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Chip } from '@/components/common/Chip';
import { Banner, bannerIconColor } from '@/components/common/Banner';
import { TextField } from '@/components/common/TextField';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import {
  CameraIcon,
  ImageIcon,
  CheckIcon,
  AlertIcon,
  SparklesIcon,
  InfoIcon,
  FileIcon,
} from '@/components/icons';
import { takePhoto, pickPhoto } from '@/services/camera';
import { ai } from '@/services/ai';
import { demoStore } from '@/demo';
import {
  INSPECTION_CATALOG,
  InspectionSeverityLabel,
} from '@/constants/inspection';
import type { AiFinding, InspectionResult } from '@/models/inspection';
import { useColors, radius, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';
import type { AppStackParamList } from '@/navigation/types';

export function CheckpointDetailScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const route = useRoute<RouteProp<AppStackParamList, 'CheckpointDetail'>>();
  const nav = useNavigation();
  const checkpoint = INSPECTION_CATALOG.find((c) => c.id === route.params.checkpointId);

  const [result, setResult] = useState<InspectionResult | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await demoStore.listInspection();
      const r = list.find((i) => i.checkpointId === route.params.checkpointId);
      if (r) {
        setResult(r);
        setNotes(r.notes ?? '');
      }
    })();
  }, [route.params.checkpointId]);

  if (!checkpoint || !result) {
    return (
      <Screen>
        <Text>Cargando…</Text>
      </Screen>
    );
  }

  const severityVariant =
    checkpoint.severity === 'critical' ? 'red' : checkpoint.severity === 'major' ? 'amber' : 'gray';

  const onPhoto = async (source: 'camera' | 'gallery') => {
    const img = source === 'camera' ? await takePhoto() : await pickPhoto();
    if (!img) return;
    setBusy(true);
    const r = await ai.analyzeInspectionPhoto({
      checkpointId: checkpoint.id,
      photoUri: img.uri,
    });
    const updated = await demoStore.updateCheckpoint(checkpoint.id, {
      photoUri: img.uri,
      aiFindings: r.findings,
    });
    setResult(updated);
    setBusy(false);
  };

  const setStatus = async (status: InspectionResult['status']) => {
    if (checkpoint.photoRequired && !result.photoUri && status === 'ok') {
      Alert.alert('Falta foto', 'Este punto requiere foto antes de marcar OK.');
      return;
    }
    const updated = await demoStore.updateCheckpoint(checkpoint.id, {
      status,
      notes: notes || null,
    });
    setResult(updated);
    if (status === 'ok' || status === 'fail') {
      setTimeout(() => nav.goBack(), 400);
    }
  };

  const hasCriticalFinding = result.aiFindings.some((f) => f.severity === 'critical');

  return (
    <Screen padded={false} background="bg">
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppBar title="Punto de inspección" />

        <View style={styles.head}>
          <Chip label={InspectionSeverityLabel[checkpoint.severity]} variant={severityVariant} />
          {checkpoint.blocksDeparture ? <Chip label="Bloquea salida" variant="red" /> : null}
          {checkpoint.photoRequired ? <Chip label="Foto requerida" variant="blue" /> : null}
        </View>

        <Text style={[typography.h2, { color: c.text }]}>{checkpoint.label}</Text>
        <Text style={[typography.body, { marginTop: spacing.xs, color: c.textSoft }]}>
          {checkpoint.description}
        </Text>

        <View style={styles.refRow}>
          <FileIcon size={14} color={c.muted} />
          <Text style={styles.refText}>{checkpoint.reference}</Text>
        </View>

        {/* AI hint */}
        {checkpoint.aiAnalysisHint !== '—' ? (
          <Banner tone="info" icon={<SparklesIcon size={18} color={bannerIconColor('info')} />}>
            <Text style={{ color: bannerIconColor('info'), fontWeight: '700', fontSize: 13 }}>
              La IA analizará la foto buscando:
            </Text>
            {'\n'}
            {checkpoint.aiAnalysisHint}
          </Banner>
        ) : null}

        {/* Foto */}
        <Text style={styles.label}>Evidencia fotográfica</Text>
        {result.photoUri ? (
          <View>
            <Image source={{ uri: result.photoUri }} style={styles.image} resizeMode="cover" />
            <Pressable
              style={styles.retakeBtn}
              onPress={() =>
                demoStore.updateCheckpoint(checkpoint.id, { photoUri: null, aiFindings: [] }).then(setResult)
              }
            >
              <Text style={styles.retakeText}>QUITAR</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <CameraIcon size={28} color={c.muted} />
            <Text style={styles.placeholderText}>
              {checkpoint.photoRequired ? 'Foto requerida' : 'Foto opcional'}
            </Text>
          </View>
        )}
        <View style={styles.photoActions}>
          <Button
            title={busy ? 'Analizando…' : 'Tomar foto'}
            leftIcon={<CameraIcon size={18} color="#fff" />}
            onPress={() => onPhoto('camera')}
            loading={busy}
            style={{ flex: 1 }}
            fullWidth={false}
          />
          <Button
            title="Galería"
            variant="outline"
            leftIcon={<ImageIcon size={18} color={c.navy} />}
            onPress={() => onPhoto('gallery')}
            style={{ flex: 1 }}
            fullWidth={false}
            disabled={busy}
          />
        </View>

        {/* Hallazgos AI */}
        {result.aiFindings.length > 0 ? (
          <Card>
            <View style={styles.aiHead}>
              <SparklesIcon size={18} color={c.blue} />
              <Text style={[typography.bodyStrong, { color: c.text }, { marginLeft: spacing.xs + 2 }]}>
                Análisis IA
              </Text>
            </View>
            {result.aiFindings.map((f, i) => (
              <Finding key={i} finding={f} />
            ))}
            {hasCriticalFinding ? (
              <Banner tone="danger" icon={<AlertIcon size={18} color={bannerIconColor('danger')} />}>
                Hallazgo crítico detectado. Reporta a despacho antes de continuar.
              </Banner>
            ) : null}
          </Card>
        ) : null}

        <TextField
          label="Notas del chofer (opcional)"
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Observaciones adicionales..."
        />

        {/* Acciones — apiladas para no encimar labels en pantallas estrechas */}
        <View style={styles.actions}>
          <Button
            title="Marcar OK"
            leftIcon={<CheckIcon size={18} color="#fff" />}
            onPress={() => setStatus('ok')}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            title="Reportar falla"
            variant="outline"
            leftIcon={<AlertIcon size={18} color={c.danger} />}
            onPress={() => setStatus('fail')}
            style={{ borderColor: c.danger }}
          />
        </View>

        <View style={styles.helpRow}>
          <InfoIcon size={14} color={c.muted} />
          <Text style={styles.helpText}>
            {checkpoint.blocksDeparture
              ? 'Este punto es crítico. Hasta marcarlo OK no puedes iniciar el viaje.'
              : 'Este punto no bloquea la salida, pero quedará registrado.'}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Finding({ finding }: { finding: AiFinding }) {
  const palette = useColors();
  const styles = makeStyles(palette);
  const colorMap = {
    info: palette.blue,
    warning: palette.warning,
    critical: palette.danger,
  };
  const dotColor = colorMap[finding.severity];
  return (
    <View style={styles.findingRow}>
      <View style={[styles.findingDot, { backgroundColor: dotColor }]} />
      <Text style={[typography.body, { flex: 1, color: palette.text }]}>{finding.note}</Text>
    </View>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  scroll: { padding: spacing.lg + 4, paddingBottom: spacing.xxl + 12 },
  head: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  refText: { color: c.muted, fontSize: 12, fontStyle: 'italic' },
  label: { ...typography.eyebrow, marginTop: spacing.md, marginBottom: spacing.sm },
  image: { width: '100%', aspectRatio: 1.4, borderRadius: radius.card },
  retakeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  retakeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  photoPlaceholder: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderStyle: 'dashed',
    borderRadius: radius.card,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  placeholderText: { color: c.muted, fontSize: 13 },
  photoActions: { flexDirection: 'row', gap: spacing.sm + 2, marginTop: spacing.md },
  aiHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  findingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.xs + 2 },
  findingDot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  actions: { marginTop: spacing.lg },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  helpText: { color: c.muted, fontSize: 12, flex: 1 },
});
