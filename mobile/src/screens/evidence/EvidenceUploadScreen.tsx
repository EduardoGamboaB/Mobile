import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { takePhoto, pickPhoto, type CapturedImage } from '@/services/camera';
import { uploadEvidence } from '@/api/evidences';
import { offlineQueue } from '@/services/offlineQueue';
import { useNetworkStore } from '@/stores/network';
import { useAuthStore } from '@/stores/auth';
import {
  EvidenceType,
  EvidenceTypeLabel,
  type EvidenceTypeValue,
} from '@/constants/enums';
import { colors, radius, spacing, typography } from '@/theme';
import type { AppNav, AppStackParamList } from '@/navigation/types';

export function EvidenceUploadScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'EvidenceUpload'>>();
  const nav = useNavigation<AppNav<'EvidenceUpload'>>();
  const driverId = useAuthStore((s) => s.session?.user.id);
  const online = useNetworkStore((s) => s.online);

  const [type, setType] = useState<EvidenceTypeValue>(EvidenceType.BillOfLading);
  const [photo, setPhoto] = useState<CapturedImage | null>(null);
  const [uploading, setUploading] = useState(false);

  const onUpload = async () => {
    if (!driverId || !photo) return;
    setUploading(true);
    try {
      if (!online) {
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
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.label}>TIPO DE EVIDENCIA</Text>
        <View style={styles.row}>
          {Object.values(EvidenceType).map((t) => (
            <Pressable
              key={t}
              style={[styles.chip, type === t && styles.chipActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                {EvidenceTypeLabel[t]}
              </Text>
            </Pressable>
          ))}
        </View>

        {photo ? (
          <View style={styles.preview}>
            <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" />
            <Pressable style={styles.remove} onPress={() => setPhoto(null)}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>QUITAR</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.row}>
          <Button
            title="📷 TOMAR FOTO"
            variant="secondary"
            onPress={async () => setPhoto((await takePhoto()) ?? null)}
            style={{ flex: 1 }}
            fullWidth={false}
          />
          <View style={{ width: spacing.md }} />
          <Button
            title="🖼 ELEGIR"
            variant="secondary"
            onPress={async () => setPhoto((await pickPhoto()) ?? null)}
            style={{ flex: 1 }}
            fullWidth={false}
          />
        </View>

        <View style={{ height: spacing.lg }} />
        <Button
          title="SUBIR EVIDENCIA"
          onPress={onUpload}
          disabled={!photo}
          loading={uploading}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextActive: { color: colors.text, fontWeight: '700' },
  preview: { marginVertical: spacing.lg, alignItems: 'center' },
  image: { width: '100%', aspectRatio: 1, borderRadius: radius.md },
  remove: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
});
