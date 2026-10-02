import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';

import React, { useCallback, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

import { RootNavigator } from '@/navigation/RootNavigator';
import { navigationRef, safeNavigate } from '@/navigation/navigationRef';
import { navTheme, darkNavTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useSubscriptionStore } from '@/stores/subscription';
import { syncService } from '@/services/sync';
import { onUpgradeRequired, onUnauthorized } from '@/api/g3/client';
import { configureNotificationHandler, subscribeToNotificationTaps } from '@/services/pushNotifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const bootstrapAuth = useAuthStore((s) => s.bootstrap);
  const bootstrapTheme = useThemeStore((s) => s.bootstrap);
  const bootstrapSubscription = useSubscriptionStore((s) => s.bootstrap);
  const night = useThemeStore((s) => s.night);
  const session = useAuthStore((s) => s.session);

  // Tap en push de incidente (`data.incidentId`): abre la lista de incidencias
  // del chofer. Si la app abrió en frío, espera a que haya navegación y sesión.
  const pendingIncidentTap = useRef(false);
  const openIncidents = useCallback(() => {
    if (navigationRef.isReady() && useAuthStore.getState().session) {
      pendingIncidentTap.current = false;
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      safeNavigate('IncidentList');
    } else {
      pendingIncidentTap.current = true;
    }
  }, []);
  const flushIncidentTap = useCallback(() => {
    // Un tick para que AppStack (y la ruta IncidentList) ya esté montado.
    if (pendingIncidentTap.current) setTimeout(openIncidents, 0);
  }, [openIncidents]);

  useEffect(() => {
    configureNotificationHandler();
    return subscribeToNotificationTaps(openIncidents);
  }, [openIncidents]);

  useEffect(() => {
    if (session) flushIncidentTap();
  }, [session, flushIncidentTap]);

  useEffect(() => {
    bootstrapAuth();
    bootstrapTheme();
    bootstrapSubscription();
    syncService.start();

    onUpgradeRequired((payload) => {
      safeNavigate('Plans', { highlight: payload.suggestedUpgrade });
    });
    onUnauthorized(() => {
      useAuthStore.getState().signOut();
    });

    return () => syncService.stop();
  }, [bootstrapAuth, bootstrapTheme, bootstrapSubscription]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer
          ref={navigationRef}
          theme={night ? darkNavTheme : navTheme}
          onReady={flushIncidentTap}
        >
          <StatusBar style={night ? 'light' : 'dark'} />
          <RootNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
