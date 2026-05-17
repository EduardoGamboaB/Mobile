import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect, Circle, G, Line } from 'react-native-svg';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import {
  ChevronLeftIcon,
  LayersIcon,
  LocateIcon,
  MapPinIcon,
  CompassIcon,
  TruckIcon,
  FlagIcon,
} from '@/components/icons';
import { useTrip } from '@/hooks/useTrips';
import { colors, radius, spacing, typography } from '@/theme';
import type { AppStackParamList } from '@/navigation/types';

const { width } = Dimensions.get('window');
const MAP_HEIGHT = 540;

export function MapRouteScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<AppStackParamList, 'MapRoute'>>();
  const { data: trip } = useTrip(route.params.tripId);

  return (
    <Screen padded={false} background="bg" hideBanners>
      {/* Mapa estilizado SVG: trabaja en todos los entornos sin necesidad de
          react-native-maps. Para producción nativa cambiar por MapView. */}
      <View style={[styles.mapWrap, { width, height: MAP_HEIGHT }]}>
        <Svg width={width} height={MAP_HEIGHT}>
          <Defs>
            <Pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <Path d="M40 0H0V40" fill="none" stroke="#CED7E0" strokeWidth={0.5} />
            </Pattern>
          </Defs>
          <Rect width={width} height={MAP_HEIGHT} fill="#E8EDF1" />
          <Rect width={width} height={MAP_HEIGHT} fill="url(#grid)" />
          {/* Carreteras */}
          <Path d={`M-10 320 Q 100 290 200 300 T ${width + 20} 260`} stroke="#CBD5E1" strokeWidth={22} fill="none" />
          <Path d={`M-10 320 Q 100 290 200 300 T ${width + 20} 260`} stroke="#fff" strokeWidth={20} fill="none" />
          <Path d={`M80 -10 Q 90 200 180 380 T 200 ${MAP_HEIGHT + 20}`} stroke="#CBD5E1" strokeWidth={14} fill="none" />
          <Path d={`M80 -10 Q 90 200 180 380 T 200 ${MAP_HEIGHT + 20}`} stroke="#fff" strokeWidth={12} fill="none" />
          <Path d={`M260 -10 Q 280 150 300 320 T 380 ${MAP_HEIGHT + 20}`} stroke="#CBD5E1" strokeWidth={10} fill="none" />
          <Path d={`M260 -10 Q 280 150 300 320 T 380 ${MAP_HEIGHT + 20}`} stroke="#fff" strokeWidth={8} fill="none" />
          {/* Ruta del viaje */}
          <Path
            d="M90 480 Q 130 420 170 360 Q 220 300 280 260 Q 340 230 360 180"
            stroke={colors.blue}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M360 180 Q 380 140 390 90"
            stroke={colors.blue}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="8 6"
            opacity={0.6}
          />
          {/* Origen */}
          <Circle cx={90} cy={480} r={14} fill="#fff" stroke={colors.navy} strokeWidth={3} />
          <Circle cx={90} cy={480} r={6} fill={colors.navy} />
          {/* Camión en posición actual */}
          <Circle cx={280} cy={260} r={22} fill={colors.blue} opacity={0.2} />
          <Circle cx={280} cy={260} r={16} fill={colors.blue} />
          {/* Destino: flag SVG inline */}
          <G x={380} y={80}>
            <Line x1={-30} y1={-10} x2={-30} y2={20} stroke="#9B2C2C" strokeWidth={2} />
            <Path d="M0 20 L-10 0 L-30 0 L-30 -10 L 0 -10 Z" fill="#9B2C2C" />
          </G>
        </Svg>
        {/* Etiquetas */}
        <View style={[styles.label, { left: 108, top: 472 }]}>
          <Text style={styles.labelText}>{trip?.origin.split(',')[0] ?? 'Tula'}</Text>
        </View>
        <View style={[styles.label, { left: 304, top: 252 }]}>
          <Text style={styles.labelText}>U-104</Text>
        </View>
        <View style={[styles.label, { left: 344, top: 86 }]}>
          <Text style={styles.labelText}>{trip?.destination.split(',')[0] ?? 'Tampico'}</Text>
        </View>
      </View>

      {/* Header overlay */}
      <View style={styles.headerOverlay}>
        <Pressable onPress={() => nav.goBack()}>
          <View style={styles.fab}>
            <ChevronLeftIcon color={colors.navy} />
          </View>
        </Pressable>
        <View style={styles.tripPill}>
          <Text style={typography.eyebrow}>EN RUTA · {trip?.folio ?? ''}</Text>
          <Text style={typography.bodyStrong} numberOfLines={1}>
            {trip?.destination ?? 'Cargando...'}
          </Text>
        </View>
      </View>

      {/* FAB layers + locate */}
      <View style={styles.fabStack}>
        <View style={styles.fab}>
          <LayersIcon color={colors.navy} />
        </View>
        <View style={[styles.fab, { marginTop: spacing.sm }]}>
          <LocateIcon color={colors.blue} />
        </View>
      </View>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.sheetTop}>
          <View>
            <Text style={typography.eyebrow}>Tiempo restante</Text>
            <Text style={typography.h2}>2h 18min</Text>
          </View>
          <View>
            <Text style={[typography.eyebrow, { textAlign: 'right' }]}>Distancia</Text>
            <Text style={[typography.h2, { textAlign: 'right' }]}>142 km</Text>
          </View>
        </View>
        <Card variant="flat" style={styles.nextStep}>
          <IconTile tone="blue">
            <MapPinIcon color={tileIconColor('blue')} />
          </IconTile>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={typography.bodyStrong}>Próximo punto: Caseta Mante</Text>
            <Text style={typography.caption}>En 38 km · ~30 min</Text>
          </View>
        </Card>
        <Button
          title="Abrir navegación"
          variant="accent"
          leftIcon={<CompassIcon size={18} color="#fff" />}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: { position: 'absolute', top: 0, left: 0 },
  label: { position: 'absolute' },
  labelText: { fontSize: 11, fontWeight: '600', color: colors.navy },
  headerOverlay: {
    position: 'absolute',
    top: 54,
    left: spacing.lg + 4,
    right: spacing.lg + 4,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tripPill: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fabStack: { position: 'absolute', right: spacing.lg + 4, top: 260 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg + 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    minHeight: 280,
  },
  handle: { width: 38, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  nextStep: { flexDirection: 'row', alignItems: 'center' },
});
