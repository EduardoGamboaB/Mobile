import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export type AuthStackParamList = {
  Onboarding: undefined;
  PhoneLogin: undefined;
  OtpVerify: { phone: string };
  EmailLogin: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Trips: undefined;
  History: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  TripDetail: { tripId: string };
  LogbookCreate: { tripId: string };
  EvidenceUpload: { tripId: string };
  IncidentCreate: { tripId?: string };
  IncidentList: undefined;
  PendingSync: undefined;
  Settings: undefined;
};

export type AppNav<T extends keyof AppStackParamList> = NativeStackNavigationProp<
  AppStackParamList,
  T
>;
export type AppRoute<T extends keyof AppStackParamList> = RouteProp<AppStackParamList, T>;

export type TabNav<T extends keyof MainTabParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, T>,
  NativeStackNavigationProp<AppStackParamList>
>;
