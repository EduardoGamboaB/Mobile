import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from '@/db/database';
import { initNotifications } from '@/services/alerts';
import { startSyncEngine } from '@/services/sync';
import { useSettingsStore } from '@/stores/settingsStore';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { AppNavigator } from '@/navigation';
import { colors } from '@/theme';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const boot = async () => {
      try {
        await initDatabase();
        await useSettingsStore.getState().load();
        await useNotificationsStore.getState().refresh();
        await initNotifications();
        startSyncEngine();
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al iniciar la aplicación');
      }
    };
    void boot();
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>No se pudo iniciar</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorTitle: { fontSize: 18, fontWeight: '700', color: colors.danger },
  errorBody: { marginTop: 8, color: colors.textSecondary, paddingHorizontal: 32, textAlign: 'center' },
});
