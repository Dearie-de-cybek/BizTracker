import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { BottomBar, Button, Chip, Divider, EmptyState, Header, Page, ProductRow, SearchField } from '@/components';
import { useBusiness, useDb } from '@/data/DataProvider';
import { lowStockProducts } from '@/domain/analytics';
import { filterProducts } from '@/features/inventory/filterProducts';
import { useMoney } from '@/hooks/useMoney';
import { spacing } from '@/theme';
import { plural } from '@/utils/format';

export default function Inventory() {
  const state = useDb();
  const { settings } = useBusiness();
  const money = useMoney();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(params.filter ?? 'all');
  // Follow deep links like Home → "Low stock" while keeping the chip selection local
  const [linkedFilter, setLinkedFilter] = useState(params.filter);
  if (params.filter !== linkedFilter) {
    setLinkedFilter(params.filter);
    if (params.filter) setFilter(params.filter);
  }

  const products = useMemo(() => filterProducts(state.products, settings, query, filter), [state.products, settings, query, filter]);
  const categoryName = useMemo(() => new Map(state.categories.map((c) => [c.id, c.name])), [state.categories]);
  const lowCount = useMemo(() => lowStockProducts(state).length, [state]);
  const showLowFilter = settings.trackStock && settings.lowStockAlerts;

  const chips = [
    { id: 'all', label: 'All' },
    ...(showLowFilter ? [{ id: 'low', label: `Low stock${lowCount ? ` (${lowCount})` : ''}` }] : []),
    ...state.categories.map((c) => ({ id: c.id, label: c.name })),
    ...(state.categories.length && state.products.some((p) => !p.categoryId) ? [{ id: 'none', label: 'Uncategorised' }] : []),
  ];

  const empty = state.products.length === 0;

  return (
    <Page>
      <Header title="Inventory" large subtitle={empty ? undefined : plural(state.products.length, 'product')} />
      {!empty && (
        <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
          <View style={{ paddingHorizontal: spacing.gutter }}>
            <SearchField value={query} onChangeText={setQuery} placeholder={settings.useSkus ? 'Search name, SKU or barcode' : 'Search products'} />
          </View>
          {chips.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {chips.map((c) => (
                <Chip key={c.id} label={c.label} selected={filter === c.id} onPress={() => setFilter(c.id)} />
              ))}
            </ScrollView>
          )}
        </View>
      )}
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={15}
        ItemSeparatorComponent={() => <Divider inset={spacing.gutter + 56} />}
        renderItem={({ item }) => (
          <ProductRow
            product={item}
            settings={settings}
            categoryName={item.categoryId ? categoryName.get(item.categoryId) : undefined}
            format={money.format}
            onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          empty ? (
            <EmptyState
              icon="package"
              title="Your inventory is empty"
              body="Add the products you sell. Include a cost price so BizTracker can work out your profit."
            />
          ) : (
            <EmptyState compact icon="search" title="No products match" body={filter === 'low' ? 'Nothing is running low right now.' : 'Try another search or category.'} />
          )
        }
      />
      <BottomBar tabBar>
        <Button label="Add product" icon="plus" onPress={() => router.push('/product/form')} />
      </BottomBar>
    </Page>
  );
}

const styles = StyleSheet.create({
  chips: { gap: spacing.sm, paddingHorizontal: spacing.gutter },
});
