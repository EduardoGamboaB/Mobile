import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen, ONBOARDING_KEY } from '@/screens/onboarding/OnboardingScreen';
import { PhoneLoginScreen } from '@/screens/auth/PhoneLoginScreen';
import { OtpVerifyScreen } from '@/screens/auth/OtpVerifyScreen';
import { EmailLoginScreen } from '@/screens/auth/EmailLoginScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  const [initial, setInitial] = useState<keyof AuthStackParamList | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((v) => {
      setInitial(v ? 'PhoneLogin' : 'Onboarding');
    });
  }, []);

  if (!initial) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initial}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
      <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
