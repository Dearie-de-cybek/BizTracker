import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomBar, Button, Chip, Divider, EmptyState, Header, Page, SaleRow, SearchField } from '@/components';
import { useDb } from '@/data/DataProvider';
import { addDays, DateRange, inRange, startOfDay, summarizeSales } from '@/domain/analytics';
import { formatReceiptNumber, paidBySale, paymentStatus } from '@/domain/sales';
import { useMoney } from '@/hooks/useMoney';
import { colors, spacing, type } from '@/theme';
import { plural } from '@/utils/format';

type RangeKey = 'today' | 'yesterday' | 'week' | 'month' | 'all';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'Last 7 days' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All time' },
];

function rangeFor(key: RangeKey, now: Date): DateRange {
  const today = startOfDay(now);
  switch (key) {
    case 'today':
      return { from: today, to: addDays(today, 1) };
    case 'yesterday':
      return { from: addDays(today, -1), to: today };
    case 'week':
      return { from: addDays(today, -6), to: addDays(today, 1) };
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: addDays(today, 1) };
    default:
      return { from: null, to: null };
  }
}

export default function Sales() {
  const state = useDb();
  const money = useMoney();
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>('today');
  const [query, setQuery] = useState('');

  const { list, summary, paid } = useMemo(() => {
    const r = rangeFor(range, new Date());
    const q = query.trim().toLowerCase();
    const paid = paidBySale(state.payments);
    const list = state.sales
      .filter((s) => inRange(s.createdAt, r))
      .filter(
        (s) =>
          !q ||
          formatReceiptNumber(s.receiptNumber).includes(q.replace(/^#?/, '#')) ||
          (s.customerName ?? 'walk-in').toLowerCase().includes(q) ||
          s.items.some((i) => i.productName.toLowerCase().includes(q)),
      )
      .reverse();
    return { list, summary: summarizeSales(state, r), paid };
  }, [state, range, query]);

  const hasAnySales = state.sales.length > 0;
  const canSell = state.products.length > 0;

  return (
    <Page>
      <Header title="Sales" large />
      {hasAnySales && (
        <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
          <View style={{ paddingHorizontal: spacing.gutter }}>
            <SearchField value={query} onChangeText={setQuery} placeholder="Search receipt, customer or product" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {RANGES.map((r) => (
              <Chip key={r.key} label={r.label} selected={range === r.key} onPress={() => setRange(r.key)} />
            ))}
          </ScrollView>
          <View style={styles.summary} accessible accessibilityLabel={`${plural(summary.transactions, 'sale')}, revenue ${money.format(summary.revenue)}, received ${money.format(summary.paymentsReceived)}`}>
            <SummaryItem label="Revenue" value={money.format(summary.revenue)} />
            <SummaryItem label="Received" value={money.format(summary.paymentsReceived)} />
            <SummaryItem label="Sales" value={String(summary.transactions)} />
          </View>
        </View>
      )}

      <FlatList
        data={list}
        keyExtractor={(s) => s.id}
        ItemSeparatorComponent={() => <Divider inset={spacing.gutter} />}
        initialNumToRender={15}
        windowSize={10}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <SaleRow
            sale={item}
            status={paymentStatus(item.total, paid.get(item.id) ?? 0)}
            format={money.format}
            onPress={() => router.push({ pathname: '/sale/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          !hasAnySales ? (
            <EmptyState
              icon="shopping-cart"
              title="No sales yet"
              body={canSell ? 'Record your first sale and it will appear here with its receipt.' : 'Add a product to your inventory, then record your first sale.'}
            >
              {!canSell && <Button label="Add product" variant="secondary" onPress={() => router.push('/product/form')} />}
            </EmptyState>
          ) : (
            <EmptyState
              compact
              icon="search"
              title="No matching sales"
              body={query ? 'Try a different search.' : `No sales ${RANGES.find((r) => r.key === range)!.label.toLowerCase()}.`}
            />
          )
        }
      />

      <BottomBar tabBar>
        <Button label="New sale" icon="plus" onPress={() => router.push('/sale/new')} disabled={!canSell} />
      </BottomBar>
    </Page>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={type.caption}>{label}</Text>
      <Text style={[type.amount, { fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: spacing.sm, paddingHorizontal: spacing.gutter },
  summary: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
