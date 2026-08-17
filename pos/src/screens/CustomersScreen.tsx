import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listCustomers } from '@/db/customers';
import { useLayout } from '@/hooks/useLayout';
import { Button, EmptyState, SearchBar } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import type { Customer } from '@/models/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CustomersScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { columns } = useLayout();
  const listColumns = Math.min(columns, 2) as 1 | 2;

  const refresh = useCallback(() => {
    void listCustomers(search.trim()).then(setCustomers);
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
          <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar cliente…" />
        </View>
        <Button title="+ Nuevo" onPress={() => navigation.navigate('CustomerForm', undefined)} />
      </View>
      <FlatList
        key={listColumns}
        numColumns={listColumns}
        columnWrapperStyle={listColumns > 1 ? { gap: spacing.sm } : undefined}
        data={customers}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
        ListEmptyComponent={
          <EmptyState
            icon="👤"
            title="Sin clientes"
            subtitle="Registra a tus clientes para asignarlos a ventas y agilizar la facturación."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, listColumns > 1 && { flex: 1 }]}
            onPress={() => navigation.navigate('CustomerForm', { customerId: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>{item.name}</Text>
              <Text style={typography.caption} numberOfLines={1}>
                {[item.phone, item.email, item.taxId].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
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

export default CustomersScreen;
