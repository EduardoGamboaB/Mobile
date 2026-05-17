import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

import { RootNavigator } from '@/navigation/RootNavigator';
import { navTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { syncService } from '@/services/sync';

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

  useEffect(() => {
    bootstrapAuth();
    bootstrapTheme();
    syncService.start();
    return () => syncService.stop();
  }, [bootstrapAuth, bootstrapTheme]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
