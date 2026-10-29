import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Divider, EmptyState, Header, IconButton, ListRow, Page, SaleRow, ScrollScreen, SectionHeader } from '@/components';
import { useDb } from '@/data/DataProvider';
import { customerStats } from '@/domain/analytics';
import { paidBySale, paymentStatus } from '@/domain/sales';
import { useMoney } from '@/hooks/useMoney';
import { colors, spacing, type } from '@/theme';
import { formatDate } from '@/utils/format';

export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useDb();
  const money = useMoney();
  const router = useRouter();
  const customer = state.customers.find((c) => c.id === id);

  const { stats, history, paid } = useMemo(
    () => ({
      stats: customerStats(state, id),
      history: state.sales.filter((s) => s.customerId === id).reverse(),
      paid: paidBySale(state.payments),
    }),
    [state, id],
  );

  if (!customer) {
    return (
      <Page>
        <Header title="Customer" back />
        <EmptyState icon="user" title="Customer not found" />
      </Page>
    );
  }

  return (
    <Page>
      <Header
        title={customer.name}
        back
        right={<IconButton icon="edit-2" label="Edit customer" onPress={() => router.push({ pathname: '/customer/form', params: { id: customer.id } })} />}
      />
      <ScrollScreen contentStyle={{ paddingHorizontal: 0 }}>
        <View style={styles.top}>
          <Avatar name={customer.name} size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.title}>{customer.name}</Text>
            <Text style={type.caption}>Customer since {formatDate(new Date(customer.createdAt))}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat label="Total spent" value={money.format(stats.totalSpent)} />
          <Stat label="Purchases" value={String(stats.purchases)} />
          <Stat label="Owes" value={money.format(stats.outstanding)} warn={stats.outstanding > 0} />
        </View>

        {(customer.phone || customer.email || customer.address || customer.note) && (
          <View>
            <View style={{ paddingHorizontal: spacing.gutter }}>
              <SectionHeader title="Contact" />
            </View>
            {customer.phone && (
              <ListRow icon="phone" title={customer.phone} subtitle="Call" onPress={() => Linking.openURL(`tel:${customer.phone!.replace(/[^\d+]/g, '')}`)} />
            )}
            {customer.email && <ListRow icon="mail" title={customer.email} subtitle="Email" onPress={() => Linking.openURL(`mailto:${customer.email}`)} />}
            {customer.address && <ListRow icon="map-pin" title={customer.address} />}
            {customer.note && <ListRow icon="file-text" title={customer.note} />}
          </View>
        )}

        <View>
          <View style={{ paddingHorizontal: spacing.gutter }}>
            <SectionHeader title="Purchase history" />
          </View>
          {history.length === 0 ? (
            <View style={{ paddingHorizontal: spacing.gutter, gap: spacing.md }}>
              <Text style={type.secondary}>No purchases recorded for {customer.name} yet.</Text>
              {state.products.length > 0 && <Button label="Start a sale" variant="secondary" onPress={() => router.push('/sale/new')} />}
            </View>
          ) : (
            history.map((s, i) => (
              <View key={s.id}>
                {i > 0 && <Divider inset={spacing.gutter} />}
                <SaleRow
                  sale={s}
                  status={paymentStatus(s.total, paid.get(s.id) ?? 0)}
                  format={money.format}
                  onPress={() => router.push({ pathname: '/sale/[id]', params: { id: s.id } })}
                />
              </View>
            ))
          )}
        </View>
      </ScrollScreen>
    </Page>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={type.caption}>{label}</Text>
      <Text style={[type.amount, warn && { color: colors.warning }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.gutter },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
