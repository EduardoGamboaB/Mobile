import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { useScanStore } from '@/stores/scanStore';
import { Button } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

/**
 * Escáner de códigos de barras con la cámara. Entrega el código leído al
 * handler registrado en scanStore y regresa a la pantalla anterior.
 */
const ScannerScreen: React.FC = () => {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [lastCode, setLastCode] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(
    () => () => {
      useScanStore.getState().setHandler(null);
    },
    [],
  );

  const onScanned = ({ data }: { data: string }) => {
    if (handled.current || !data) return;
    handled.current = true;
    setLastCode(data);
    const handler = useScanStore.getState().handler;
    navigation.goBack();
    // El handler corre después del goBack para no bloquear la animación.
    setTimeout(() => handler?.(data), 150);
  };

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={[typography.subtitle, { textAlign: 'center', marginBottom: spacing.md }]}>
          Se necesita permiso de cámara para escanear códigos de barras.
        </Text>
        <Button title="Conceder permiso" onPress={() => void requestPermission()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'qr'],
        }}
        onBarcodeScanned={onScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>Apunta la cámara al código de barras</Text>
        {lastCode ? <Text style={styles.code}>{lastCode}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 260,
    height: 160,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: { color: '#fff', marginTop: spacing.md, fontSize: 14 },
  code: { color: '#4ADE80', marginTop: spacing.sm, fontSize: 16, fontWeight: '700' },
});

export default ScannerScreen;
