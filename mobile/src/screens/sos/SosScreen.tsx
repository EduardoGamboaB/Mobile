import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import {
  XIcon,
  AlertOctagonIcon,
  MapPinIcon,
  TruckIcon,
  PhoneIcon,
  ClockIcon,
} from '@/components/icons';
import { colors, radius, spacing, typography } from '@/theme';

const HOLD_MS = 3_000;

export function SosScreen() {
  const nav = useNavigation();
  const pulse = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0,  duration: 1000, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  const start = () => {
    setArmed(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      useNativeDriver: false,
    }).start();
    timer.current = setTimeout(() => {
      Alert.alert(
        '⚠ SOS activado',
        'Tu ubicación, datos de unidad y hora se enviaron a despacho, supervisor y seguridad.',
      );
      progress.setValue(0);
      setArmed(false);
    }, HOLD_MS);
  };

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    progress.stopAnimation();
    progress.setValue(0);
    setArmed(false);
  };

  return (
    <Screen padded={false} background={colors.danger} hideBanners>
      <View style={styles.gradient} />
      <View style={styles.top}>
        <Pressable onPress={() => nav.goBack()}>
          <View style={styles.fab}>
            <XIcon color="#fff" />
          </View>
        </Pressable>
      </View>

      <View style={styles.header}>
        <View style={styles.iconRing}>
          <AlertOctagonIcon size={36} color="#fff" />
        </View>
        <Text style={styles.title}>Botón de pánico</Text>
        <Text style={styles.body}>
          Solo úsalo en una emergencia real. Notificará a despacho, al supervisor y enviará tu ubicación.
        </Text>
      </View>

      <View style={styles.center}>
        <Animated.View style={[styles.ringOuter, { transform: [{ scale: pulse }] }]} />
        <View style={styles.ringInner} />
        <Pressable onPressIn={start} onPressOut={cancel} style={styles.button}>
          <Text style={styles.sos}>SOS</Text>
          <Text style={styles.hold}>MANTÉN 3 SEG</Text>
        </Pressable>
        {armed ? (
          <Animated.View
            style={[
              styles.progress,
              { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        ) : null}
      </View>

      <Text style={styles.dataLabel}>Al activar enviaremos:</Text>
      <View style={styles.grid}>
        <Info icon={<MapPinIcon size={18} color="#fff" />} text="Ubicación GPS" />
        <Info icon={<TruckIcon size={18} color="#fff" />} text="Datos unidad" />
        <Info icon={<PhoneIcon size={18} color="#fff" />} text="Tu teléfono" />
        <Info icon={<ClockIcon size={18} color="#fff" />} text="Hora y viaje" />
      </View>

      <View style={{ paddingHorizontal: spacing.lg + 4, paddingBottom: spacing.xl + 4 }}>
        <Button
          title="Llamar al 911"
          variant="outline"
          leftIcon={<PhoneIcon size={20} color="#fff" />}
          style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.4)' }}
          onPress={() => Alert.alert('Llamada', 'Se abrirá el marcador del sistema.')}
        />
      </View>
    </Screen>
  );
}

function Info({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.infoTile}>
      {icon}
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.danger },
  top: { position: 'absolute', top: 54, right: spacing.lg + 4, zIndex: 2 },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { alignItems: 'center', marginTop: 110, paddingHorizontal: spacing.lg + 4 },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: radius.card,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { color: '#fff', fontWeight: '800', fontSize: 28, letterSpacing: -0.4 },
  body: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: spacing.sm, fontSize: 14 },
  center: { alignItems: 'center', marginVertical: spacing.xl + 4 },
  ringOuter: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.1)' },
  ringInner: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.15)' },
  button: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sos: { color: colors.danger, fontSize: 36, fontWeight: '900', letterSpacing: 6 },
  hold: { color: colors.danger, fontSize: 11, letterSpacing: 1, fontWeight: '700' },
  progress: {
    position: 'absolute',
    bottom: -spacing.md,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  dataLabel: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: 13, marginBottom: spacing.md },
  grid: {
    paddingHorizontal: spacing.lg + 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoTile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
