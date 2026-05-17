import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PhoneLoginScreen } from '@/screens/auth/PhoneLoginScreen';
import { OtpVerifyScreen } from '@/screens/auth/OtpVerifyScreen';
import { EmailLoginScreen } from '@/screens/auth/EmailLoginScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
      <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />
    </Stack.Navigator>
  );
}
