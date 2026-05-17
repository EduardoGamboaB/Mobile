import React from 'react';
import { useAuthStore } from '@/stores/auth';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';
import { SplashScreen } from '@/screens/auth/SplashScreen';

export function RootNavigator() {
  const initialized = useAuthStore((s) => s.initialized);
  const session = useAuthStore((s) => s.session);

  if (!initialized) return <SplashScreen />;
  return session ? <AppStack /> : <AuthStack />;
}
