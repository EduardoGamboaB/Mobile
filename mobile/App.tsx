import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';

import React, { useEffect } from 'react';
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
        <NavigationContainer ref={navigationRef} theme={night ? darkNavTheme : navTheme}>
          <StatusBar style={night ? 'light' : 'dark'} />
          <RootNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
