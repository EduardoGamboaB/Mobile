import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { TripDetailScreen } from '@/screens/trips/TripDetailScreen';
import { LogbookCreateScreen } from '@/screens/logbook/LogbookCreateScreen';
import { EvidenceUploadScreen } from '@/screens/evidence/EvidenceUploadScreen';
import { IncidentCreateScreen } from '@/screens/incidents/IncidentCreateScreen';
import { IncidentListScreen } from '@/screens/incidents/IncidentListScreen';
import { PendingSyncScreen } from '@/screens/dashboard/PendingSyncScreen';
import { SettingsScreen } from '@/screens/profile/SettingsScreen';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen
        name="LogbookCreate"
        component={LogbookCreateScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="EvidenceUpload"
        component={EvidenceUploadScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="IncidentCreate"
        component={IncidentCreateScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="IncidentList" component={IncidentListScreen} />
      <Stack.Screen name="PendingSync" component={PendingSyncScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
