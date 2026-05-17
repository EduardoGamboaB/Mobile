import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { LinearGradient, Stop, Rect } from 'react-native-svg';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { XIcon, ZapIcon } from '@/components/icons';
import { useColors, radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme';

const { width } = Dimensions.get('window');
const BOX = 260;

export function QrScannerScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const nav = useNavigation();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const onManual = () => Alert.alert('Próximamente', 'Captura manual de folio.');

  return (
    <Screen padded={false} background="#000" hideBanners>
      <View style={styles.top}>
        <Pressable onPress={() => nav.goBack()} style={styles.fab}>
          <XIcon color="#fff" />
        </Pressable>
        <Text style={styles.title}>Escanear QR</Text>
        <Pressable style={styles.fab}>
          <ZapIcon color="#fff" />
        </Pressable>
      </View>

      <View style={styles.boxWrap}>
        <View style={styles.box}>
          {/* Esquinas */}
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          {/* Línea de escaneo */}
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, BOX - 10],
                    }),
                  },
                ],
              },
            ]}
          >
            <Svg width={BOX - 48} height={2}>
              <LinearGradient id="scan" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#2E86C1" stopOpacity={0} />
                <Stop offset="0.5" stopColor="#2E86C1" stopOpacity={1} />
                <Stop offset="1" stopColor="#2E86C1" stopOpacity={0} />
              </LinearGradient>
              <Rect width={BOX - 48} height={2} fill="url(#scan)" />
            </Svg>
          </Animated.View>
        </View>
      </View>

      <View style={styles.hintWrap}>
        <Text style={styles.hint}>Alinea el código QR dentro del recuadro</Text>
        <Text style={styles.hintMuted}>Buscando…</Text>
      </View>

      <View style={styles.bottom}>
        <Button
          title="Capturar folio manualmente"
          variant="outline"
          onPress={onManual}
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  top: {
    position: 'absolute',
    top: 54,
    left: spacing.lg + 4,
    right: spacing.lg + 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  title: { color: '#fff', fontWeight: '700', fontSize: 16 },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  corner: { position: 'absolute', width: 38, height: 38 },
  tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderColor: c.blue, borderTopLeftRadius: 24 },
  tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderColor: c.blue, borderTopRightRadius: 24 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: c.blue, borderBottomLeftRadius: 24 },
  br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderColor: c.blue, borderBottomRightRadius: 24 },
  scanLine: { position: 'absolute', left: 24, right: 24 },
  hintWrap: { position: 'absolute', bottom: 200, left: spacing.lg + 4, right: spacing.lg + 4, alignItems: 'center' },
  hint: { color: '#fff', fontSize: 15, marginBottom: 4 },
  hintMuted: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  bottom: { position: 'absolute', bottom: spacing.xl + 4, left: spacing.lg + 4, right: spacing.lg + 4 },
});
