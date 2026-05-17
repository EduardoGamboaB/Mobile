import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { TripDetailScreen } from '@/screens/trips/TripDetailScreen';
import { LogbookCreateScreen } from '@/screens/logbook/LogbookCreateScreen';
import { EvidenceUploadScreen } from '@/screens/evidence/EvidenceUploadScreen';
import { IncidentCreateScreen } from '@/screens/incidents/IncidentCreateScreen';
import { IncidentListScreen } from '@/screens/incidents/IncidentListScreen';
import { PendingSyncScreen } from '@/screens/dashboard/PendingSyncScreen';
import { colors } from '@/theme';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surfaceAlt },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Viaje' }} />
      <Stack.Screen
        name="LogbookCreate"
        component={LogbookCreateScreen}
        options={{ title: 'Nuevo evento', presentation: 'modal' }}
      />
      <Stack.Screen
        name="EvidenceUpload"
        component={EvidenceUploadScreen}
        options={{ title: 'Subir evidencia', presentation: 'modal' }}
      />
      <Stack.Screen
        name="IncidentCreate"
        component={IncidentCreateScreen}
        options={{ title: 'Reportar incidencia', presentation: 'modal' }}
      />
      <Stack.Screen
        name="IncidentList"
        component={IncidentListScreen}
        options={{ title: 'Incidencias' }}
      />
      <Stack.Screen
        name="PendingSync"
        component={PendingSyncScreen}
        options={{ title: 'Pendientes de sincronizar' }}
      />
    </Stack.Navigator>
  );
}
