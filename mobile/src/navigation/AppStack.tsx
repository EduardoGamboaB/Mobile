import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { TripDetailScreen } from '@/screens/trips/TripDetailScreen';
import { LogbookCreateScreen } from '@/screens/logbook/LogbookCreateScreen';
import { EvidenceUploadScreen } from '@/screens/evidence/EvidenceUploadScreen';
import { IncidentCreateScreen } from '@/screens/incidents/IncidentCreateScreen';
import { IncidentListScreen } from '@/screens/incidents/IncidentListScreen';
import { PendingSyncScreen } from '@/screens/dashboard/PendingSyncScreen';
import { NotificationsScreen } from '@/screens/dashboard/NotificationsScreen';
import { SettingsScreen } from '@/screens/profile/SettingsScreen';
import { ChatListScreen } from '@/screens/chat/ChatListScreen';
import { ChatThreadScreen } from '@/screens/chat/ChatThreadScreen';
import { MapRouteScreen } from '@/screens/map/MapRouteScreen';
import { QrScannerScreen } from '@/screens/qr/QrScannerScreen';
import { SosScreen } from '@/screens/sos/SosScreen';
import { PreTripInspectionScreen } from '@/screens/inspection/PreTripInspectionScreen';
import { CheckpointDetailScreen } from '@/screens/inspection/CheckpointDetailScreen';
import { SignaturePodScreen } from '@/screens/pod/SignaturePodScreen';
import { EarningsScreen } from '@/screens/payments/EarningsScreen';
import { PaymentDetailScreen } from '@/screens/payments/PaymentDetailScreen';
import { PaymentsHistoryScreen } from '@/screens/payments/PaymentsHistoryScreen';
import { PlansScreen } from '@/screens/subscription/PlansScreen';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
      <Stack.Screen
        name="MapRoute"
        component={MapRouteScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="QrScanner"
        component={QrScannerScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="Sos"
        component={SosScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="PreTripInspection"
        component={PreTripInspectionScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="CheckpointDetail"
        component={CheckpointDetailScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="SignaturePod"
        component={SignaturePodScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="Earnings" component={EarningsScreen} />
      <Stack.Screen name="PaymentDetail" component={PaymentDetailScreen} />
      <Stack.Screen name="PaymentsHistory" component={PaymentsHistoryScreen} />
      <Stack.Screen
        name="Plans"
        component={PlansScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
