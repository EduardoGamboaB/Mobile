import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '@/screens/dashboard/DashboardScreen';
import { TripsScreen } from '@/screens/trips/TripsScreen';
import { HistoryScreen } from '@/screens/trips/HistoryScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { HomeIcon, TruckIcon, ClipboardIcon, UserIcon } from '@/components/icons';
import { colors } from '@/theme';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcon =
  (Icon: React.FC<{ size?: number; color?: string }>) =>
  ({ color, focused }: { color: string; focused: boolean }) => (
    <View style={{ alignItems: 'center' }}>
      <Icon size={22} color={color} />
      {focused ? (
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.blue,
            marginTop: 4,
          }}
        />
      ) : null}
    </View>
  );

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Inicio', tabBarIcon: tabIcon(HomeIcon) }}
      />
      <Tab.Screen
        name="Trips"
        component={TripsScreen}
        options={{ title: 'Viajes', tabBarIcon: tabIcon(TruckIcon) }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Historial', tabBarIcon: tabIcon(ClipboardIcon) }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Perfil', tabBarIcon: tabIcon(UserIcon) }}
      />
    </Tab.Navigator>
  );
}
