import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { PageDots } from '@/components/common/PageDots';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import { TruckIcon, CloudOffIcon, ShieldCheckIcon } from '@/components/icons';
import { useColors, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';

export const ONBOARDING_KEY = 'g3.onboarding.completed.v1';

const PAGES = [
  {
    icon: (color: string) => <TruckIcon size={80} color={color} />,
    title: 'Tu unidad operativa, en el bolsillo',
    body: 'G3 Drive centraliza viajes, bitácoras, evidencias e incidencias en una sola app diseñada para el chofer.',
  },
  {
    icon: (color: string) => <CloudOffIcon size={80} color={color} />,
    title: 'Funciona sin internet',
    body: 'Registra tu bitácora y sube fotos aunque no haya señal. Todo se sincroniza automáticamente cuando vuelves a tener red.',
  },
  {
    icon: (color: string) => <ShieldCheckIcon size={80} color={color} />,
    title: 'Evidencia segura y respaldada',
    body: 'Carta porte, báscula, diesel y prueba de entrega: todo queda guardado, fechado y geolocalizado.',
  },
];

const WIDTH = Dimensions.get('window').width;

export function OnboardingScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const nav = useNavigation();
  const list = useRef<FlatList>(null);
  const [page, setPage] = useState(0);

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    nav.reset({ index: 0, routes: [{ name: 'PhoneLogin' as never }] });
  };

  const next = () => {
    if (page < PAGES.length - 1) {
      list.current?.scrollToIndex({ index: page + 1, animated: true });
    } else {
      finish();
    }
  };

  return (
    <Screen background="cream" padded={false} hideBanners>
      <View style={styles.skipRow}>
        <Text onPress={finish} style={styles.skip}>
          Saltar
        </Text>
      </View>
      <FlatList
        ref={list}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / WIDTH))
        }
        renderItem={({ item }) => (
          <View style={[styles.page, { width: WIDTH }]}>
            <View style={{ marginBottom: spacing.xl + 4 }}>
              <View style={styles.iconWrap}>
                <IconTile tone="blue" size="lg">
                  {item.icon(tileIconColor('blue'))}
                </IconTile>
              </View>
            </View>
            <Text style={[typography.h1, { color: c.text }, styles.title]}>{item.title}</Text>
            <Text style={[typography.body, { color: c.text }, styles.body]}>{item.body}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        <PageDots count={PAGES.length} active={page} />
      </View>
      <View style={styles.bottom}>
        <Button title={page === PAGES.length - 1 ? 'Comenzar' : 'Continuar'} onPress={next} />
      </View>
    </Screen>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  skipRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg + 4, paddingTop: spacing.md },
  skip: { fontSize: 13, color: c.muted, fontWeight: '600' },
  page: { paddingHorizontal: spacing.lg + 4, alignItems: 'center', paddingTop: spacing.xl + 4 },
  iconWrap: { transform: [{ scale: 2.4 }] },
  title: { textAlign: 'center', marginBottom: spacing.md, paddingHorizontal: spacing.md },
  body:  { textAlign: 'center', color: c.textSoft, paddingHorizontal: spacing.lg },
  dots:   { position: 'absolute', bottom: 120, left: 0, right: 0 },
  bottom: { position: 'absolute', bottom: spacing.xl + 4, left: spacing.lg + 4, right: spacing.lg + 4 },
});
