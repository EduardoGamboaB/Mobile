import React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '@/theme';
import { useNotificationsStore } from '@/stores/notificationsStore';
import type { MainTabsParamList, RootStackParamList } from './types';

import PosScreen from '@/screens/PosScreen';
import ProductsScreen from '@/screens/ProductsScreen';
import ReportsScreen from '@/screens/ReportsScreen';
import MoreScreen from '@/screens/MoreScreen';
import CheckoutScreen from '@/screens/CheckoutScreen';
import ScannerScreen from '@/screens/ScannerScreen';
import ProductFormScreen from '@/screens/ProductFormScreen';
import InventoryScreen from '@/screens/InventoryScreen';
import ProductKardexScreen from '@/screens/ProductKardexScreen';
import SuppliersScreen from '@/screens/SuppliersScreen';
import SupplierFormScreen from '@/screens/SupplierFormScreen';
import PurchasesScreen from '@/screens/PurchasesScreen';
import PurchaseFormScreen from '@/screens/PurchaseFormScreen';
import PurchaseDetailScreen from '@/screens/PurchaseDetailScreen';
import SalesScreen from '@/screens/SalesScreen';
import SaleDetailScreen from '@/screens/SaleDetailScreen';
import InvoicesScreen from '@/screens/InvoicesScreen';
import InvoiceFormScreen from '@/screens/InvoiceFormScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import SettingsScreen from '@/screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabsParamList>();

const TabIcon: React.FC<{ emoji: string; focused: boolean; badge?: number }> = ({ emoji, focused, badge }) => (
  <View style={{ alignItems: 'center' }}>
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
    {badge ? (
      <View
        style={{
          position: 'absolute',
          top: -4,
          right: -10,
          backgroundColor: colors.danger,
          borderRadius: 8,
          minWidth: 16,
          height: 16,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 3,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badge > 99 ? '99+' : badge}</Text>
      </View>
    ) : null}
  </View>
);

const MainTabs = () => {
  const unread = useNotificationsStore((s) => s.unread);
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="Pos"
        component={PosScreen}
        options={{ title: 'Vender', tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} /> }}
      />
      <Tabs.Screen
        name="Products"
        component={ProductsScreen}
        options={{ title: 'Productos', tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} /> }}
      />
      <Tabs.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Reportes', tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }}
      />
      <Tabs.Screen
        name="More"
        component={MoreScreen}
        options={{
          title: 'Más',
          tabBarIcon: ({ focused }) => <TabIcon emoji="☰" focused={focused} badge={unread} />,
        }}
      />
    </Tabs.Navigator>
  );
};

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.accent },
};

export const AppNavigator = () => (
  <NavigationContainer theme={navTheme}>
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Cobrar' }} />
      <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: 'Escanear código' }} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen} options={{ title: 'Producto' }} />
      <Stack.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Inventario' }} />
      <Stack.Screen name="ProductKardex" component={ProductKardexScreen} options={{ title: 'Kardex' }} />
      <Stack.Screen name="Suppliers" component={SuppliersScreen} options={{ title: 'Proveedores' }} />
      <Stack.Screen name="SupplierForm" component={SupplierFormScreen} options={{ title: 'Proveedor' }} />
      <Stack.Screen name="Purchases" component={PurchasesScreen} options={{ title: 'Compras' }} />
      <Stack.Screen name="PurchaseForm" component={PurchaseFormScreen} options={{ title: 'Nueva compra' }} />
      <Stack.Screen name="PurchaseDetail" component={PurchaseDetailScreen} options={{ title: 'Compra' }} />
      <Stack.Screen name="Sales" component={SalesScreen} options={{ title: 'Ventas' }} />
      <Stack.Screen name="SaleDetail" component={SaleDetailScreen} options={{ title: 'Venta' }} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'Facturas' }} />
      <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} options={{ title: 'Facturar venta' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notificaciones' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configuración' }} />
    </Stack.Navigator>
  </NavigationContainer>
);
