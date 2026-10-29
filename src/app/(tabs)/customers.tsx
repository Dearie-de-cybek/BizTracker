import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, BottomBar, Button, Divider, EmptyState, Header, Page, SearchField } from '@/components';
import { useDb } from '@/data/DataProvider';
import { paidBySale } from '@/domain/sales';
import type { Money } from '@/domain/types';
import { useMoney } from '@/hooks/useMoney';
import { colors, spacing, touch, type } from '@/theme';
import { plural } from '@/utils/format';

export default function Customers() {
  const state = useDb();
  const money = useMoney();
  const router = useRouter();
  const [query, setQuery] = useState('');

  // Totals derived from recorded sales only
  const stats = useMemo(() => {
    const paid = paidBySale(state.payments);
    const m = new Map<string, { spent: Money; owed: Money; count: number }>();
    for (const s of state.sales) {
      if (!s.customerId) continue;
      const e = m.get(s.customerId) ?? { spent: 0, owed: 0, count: 0 };
      e.spent += s.total;
      e.owed += s.total - (paid.get(s.id) ?? 0);
      e.count += 1;
      m.set(s.customerId, e);
    }
    return m;
  }, [state.sales, state.payments]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return state.customers
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (digits.length > 2 && c.phone?.replace(/\D/g, '').includes(digits)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.customers, query]);

  const empty = state.customers.length === 0;

  return (
    <Page>
      <Header title="Customers" large subtitle={empty ? undefined : plural(state.customers.length, 'customer')} />
      {!empty && (
        <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.sm }}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search name or phone number" />
        </View>
      )}
      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <Divider inset={spacing.gutter + 52} />}
        renderItem={({ item }) => {
          const s = stats.get(item.id);
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/customer/[id]', params: { id: item.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}${s ? `, spent ${money.format(s.spent)}` : ', no purchases yet'}${s?.owed ? `, owes ${money.format(s.owed)}` : ''}`}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceSubtle }]}
            >
              <Avatar name={item.name} size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.bodyStrong} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={type.caption} numberOfLines={1}>
                  {[item.phone, s ? plural(s.count, 'purchase') : 'No purchases yet'].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                {s && <Text style={type.amount}>{money.format(s.spent)}</Text>}
                {s && s.owed > 0 && <Text style={[type.caption, { color: colors.warning, fontWeight: '600' }]}>Owes {money.format(s.owed)}</Text>}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          empty ? (
            <EmptyState
              icon="users"
              title="No customers yet"
              body="Save regular customers to see what they buy and track anything they owe. Walk-in sales don't need a customer."
            />
          ) : (
            <EmptyState compact icon="search" title="No customers match" body="Try another name or number." />
          )
        }
      />
      <BottomBar tabBar>
        <Button label="Add customer" icon="user-plus" onPress={() => router.push('/customer/form')} />
      </BottomBar>
    </Page>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min + 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.gutter,
  },
});
