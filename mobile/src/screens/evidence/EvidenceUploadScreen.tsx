import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/common/Button';
import { Banner, bannerIconColor } from '@/components/common/Banner';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import {
  CameraIcon,
  ImageIcon,
  SendIcon,
  SparklesIcon,
} from '@/components/icons';
import { takePhoto, pickPhoto, type CapturedImage } from '@/services/camera';
import { uploadEvidence } from '@/api/evidences';
import { offlineQueue } from '@/services/offlineQueue';
import { useNetworkStore } from '@/stores/network';
import { useAuthStore } from '@/stores/auth';
import { isDemo } from '@/demo';
import { ai } from '@/services/ai';
import {
  EvidenceType,
  EvidenceTypeLabel,
  EvidenceTypeIcon,
  type EvidenceTypeValue,
} from '@/constants/enums';
import { useColors, radius, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';
import type { AppNav, AppStackParamList } from '@/navigation/types';

export function EvidenceUploadScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const route = useRoute<RouteProp<AppStackParamList, 'EvidenceUpload'>>();
  const nav = useNavigation<AppNav<'EvidenceUpload'>>();
  const driverId = useAuthStore((s) => s.session?.user.id);
  const online = useNetworkStore((s) => s.online);
  const effectiveOnline = isDemo || online;

  const [type, setType] = useState<EvidenceTypeValue>(EvidenceType.BillOfLading);
  const [photo, setPhoto] = useState<CapturedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracted, setExtracted] = useState<string | null>(null);

  const onPickPhoto = async (source: 'camera' | 'gallery') => {
    const img = source === 'camera' ? await takePhoto() : await pickPhoto();
    if (!img) return;
    setPhoto(img);

    // G3 AI-First: intentar extraer datos del documento automáticamente
    const r = await ai.extractEvidence({ photoUri: img.uri, hintType: type });
    if (r.confidence > 0.5) {
      const fields = [];
      if (r.fields.folio) fields.push(`Folio ${r.fields.folio}`);
      if (r.fields.tons) fields.push(`${r.fields.tons} ton`);
      if (r.fields.amount) fields.push(`$${r.fields.amount.toFixed(2)}`);
      setExtracted(
        fields.length
          ? `Datos detectados: ${fields.join(' · ')}`
          : 'Documento analizado — datos guardados.',
      );
    }
  };

  const onUpload = async () => {
    if (!driverId || !photo) return;
    setUploading(true);
    try {
      if (!effectiveOnline) {
        await offlineQueue.enqueue('evidence', {
          driverId,
          tripId: route.params.tripId,
          type,
          localUri: photo.uri,
          mimeType: 'image/jpeg',
        });
        Alert.alert('Guardado offline', 'Se subirá cuando recuperes conexión.');
      } else {
        await uploadEvidence({
          driverId,
          tripId: route.params.tripId,
          type,
          localUri: photo.uri,
          mimeType: 'image/jpeg',
        });
        Alert.alert('Subida', 'Evidencia almacenada.');
      }
      nav.goBack();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('Falló la subida', msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen padded={false} background="bg">
      <ScrollView contentContainerStyle={{ padding: spacing.lg + 4 }}>
        <AppBar title="Subir evidencia" />

        <Text style={styles.label}>Tipo de documento</Text>
        <View style={styles.grid}>
          {Object.values(EvidenceType).map((t) => {
            const isActive = type === t;
            return (
              <Pressable
                key={t}
                style={[styles.tile, isActive && styles.tileActive]}
                onPress={() => setType(t)}
              >
                <IconTile tone={isActive ? 'dark' : 'blue'} size="md">
                  <DynamicIcon
                    name={EvidenceTypeIcon[t]}
                    size={20}
                    color={isActive ? '#fff' : tileIconColor('blue')}
                  />
                </IconTile>
                <Text style={[styles.tileName, isActive && { color: '#fff' }]}>
                  {EvidenceTypeLabel[t]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {photo ? (
          <View style={styles.preview}>
            <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" />
            <Pressable
              style={styles.removeBtn}
              onPress={() => {
                setPhoto(null);
                setExtracted(null);
              }}
            >
              <Text style={styles.removeText}>QUITAR</Text>
            </Pressable>
          </View>
        ) : null}

        {extracted ? (
          <Banner tone="info" icon={<SparklesIcon size={18} color={bannerIconColor('info')} />}>
            {extracted}
          </Banner>
        ) : null}

        <View style={{ flexDirection: 'row', gap: spacing.sm + 2 }}>
          <Button
            title="Tomar foto"
            leftIcon={<CameraIcon size={18} color="#fff" />}
            onPress={() => onPickPhoto('camera')}
            style={{ flex: 1 }}
            fullWidth={false}
          />
          <Button
            title="Galería"
            variant="outline"
            leftIcon={<ImageIcon size={18} color={c.navy} />}
            onPress={() => onPickPhoto('gallery')}
            style={{ flex: 1 }}
            fullWidth={false}
          />
        </View>

        <View style={{ height: spacing.lg }} />
        <Button
          title="Subir evidencia"
          variant="accent"
          leftIcon={<SendIcon size={18} color="#fff" />}
          onPress={onUpload}
          disabled={!photo}
          loading={uploading}
        />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  label: { ...typography.eyebrow, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2, marginBottom: spacing.md },
  tile: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md + 2,
  },
  tileActive: { backgroundColor: c.navy, borderColor: c.navy },
  tileName: { flex: 1, fontSize: 13, fontWeight: '600', color: c.text },
  preview: { marginBottom: spacing.md },
  image: { width: '100%', aspectRatio: 1, borderRadius: radius.card },
  removeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  removeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
});
