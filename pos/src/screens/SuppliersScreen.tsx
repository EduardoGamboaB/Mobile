import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listSuppliers } from '@/db/suppliers';
import { Button, EmptyState, SearchBar } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import type { Supplier } from '@/models/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SuppliersScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const refresh = useCallback(() => {
    void listSuppliers(search.trim()).then(setSuppliers);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar proveedor…" />
        </View>
        <Button title="+ Nuevo" onPress={() => navigation.navigate('SupplierForm', undefined)} />
      </View>
      <FlatList
        data={suppliers}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
        ListEmptyComponent={
          <EmptyState icon="🚚" title="Sin proveedores" subtitle="Registra a tus proveedores para vincularlos a tus compras." />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('SupplierForm', { supplierId: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>{item.name}</Text>
              <Text style={typography.caption}>
                {[item.contactName, item.phone, item.taxId].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});

export default SuppliersScreen;
