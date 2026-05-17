import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { Chip } from '@/components/common/Chip';
import { Banner, bannerIconColor } from '@/components/common/Banner';
import { SignaturePad, type SignaturePadHandle } from '@/components/common/SignaturePad';
import {
  UserIcon,
  BuildingIcon,
  CameraIcon,
  CheckIcon,
  InfoIcon,
  CalendarIcon,
} from '@/components/icons';
import { useTrip } from '@/hooks/useTrips';
import { useColors, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';
import type { AppStackParamList } from '@/navigation/types';

export function SignaturePodScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const nav = useNavigation();
  const route = useRoute<RouteProp<AppStackParamList, 'SignaturePod'>>();
  const { data: trip } = useTrip(route.params.tripId);

  const padRef = useRef<SignaturePadHandle | null>(null);
  const [receiver, setReceiver] = useState('');
  const [area, setArea] = useState('');
  const [hasSignature, setHasSignature] = useState(false);

  const onConfirm = () => {
    if (!receiver.trim()) {
      Alert.alert('Faltan datos', 'Captura el nombre de quien recibe.');
      return;
    }
    if (!hasSignature) {
      Alert.alert('Falta firma', 'Pide al cliente que firme.');
      return;
    }
    Alert.alert(
      'POD registrado',
      'La prueba de entrega se guardó con tu ubicación, hora y foto del sello.',
      [{ text: 'OK', onPress: () => nav.goBack() }],
    );
  };

  return (
    <Screen padded={false} background="bg">
      <ScrollView contentContainerStyle={{ padding: spacing.lg + 4, paddingBottom: spacing.xxl }}>
        <AppBar title="Prueba de entrega" />
        <View style={styles.chipsRow}>
          <Chip label={trip?.folio ?? '—'} variant="blue" />
          {trip?.client_name ? (
            <Chip label={trip.client_name.split(' ')[0]} variant="gray" />
          ) : null}
        </View>

        <TextField
          label="Recibió"
          leftIcon={<UserIcon size={20} color={c.muted} />}
          value={receiver}
          onChangeText={setReceiver}
          placeholder="Lic. Ricardo Hernández"
        />
        <TextField
          label="Cargo / área"
          leftIcon={<BuildingIcon size={20} color={c.muted} />}
          value={area}
          onChangeText={setArea}
          placeholder="Almacén · Turno A"
        />

        <Text style={styles.label}>Firma</Text>
        <SignaturePad ref={padRef} onChange={setHasSignature} />
        <View style={styles.signRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CalendarIcon size={14} color={c.muted} />
            <Text style={[typography.caption, { color: c.muted }]}>Hoy · {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <Pressable
            onPress={() => {
              padRef.current?.clear();
              setHasSignature(false);
            }}
          >
            <Text style={styles.link}>Limpiar firma</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: spacing.md }}>
          <Banner tone="info" icon={<InfoIcon size={18} color={bannerIconColor('info')} />}>
            Al confirmar quedará registrada tu ubicación y la foto del documento sellado.
          </Banner>
        </View>

        <View style={styles.actions}>
          <Button
            title="Foto sello"
            variant="outline"
            leftIcon={<CameraIcon size={18} color={c.navy} />}
            onPress={() => Alert.alert('Próximamente', 'Captura de sello.')}
            style={{ flex: 1 }}
            fullWidth={false}
          />
          <Button
            title="Confirmar"
            leftIcon={<CheckIcon size={18} color="#fff" />}
            onPress={onConfirm}
            style={{ flex: 1 }}
            fullWidth={false}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  chipsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  label: { ...typography.eyebrow, marginBottom: spacing.sm + 2 },
  signRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  link: { color: c.blue, fontWeight: '600', fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing.sm + 2, marginTop: spacing.md },
});
