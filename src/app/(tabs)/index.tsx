import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { ReactNode, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Divider, SaleRow, SectionHeader } from '@/components';
import { useBusiness, useDb } from '@/data/DataProvider';
import { dailyRevenue, lowStockProducts, summarizeSales, todayRange } from '@/domain/analytics';
import { amountPaid, paymentStatus } from '@/domain/sales';
import { SalesTrend } from '@/features/home/SalesTrend';
import { useMoney } from '@/hooks/useMoney';
import { colors, radius, spacing, type } from '@/theme';
import { greeting, plural } from '@/utils/format';

export default function Home() {
  const state = useDb();
  const { business, settings } = useBusiness();
  const money = useMoney();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const data = useMemo(() => {
    const now = new Date();
    const today = summarizeSales(state, todayRange(now));
    const week = dailyRevenue(state.sales, now, 7);
    return {
      today,
      week,
      weekHasSales: week.some((d) => d.count > 0),
      low: settings.trackStock && settings.lowStockAlerts ? lowStockProducts(state) : [],
      recent: state.sales.slice(-5).reverse(),
    };
  }, [state, settings]);

  const firstName = business.ownerName.split(' ')[0];
  const hasProducts = state.products.length > 0;
  const hasSales = state.sales.length > 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.white }} contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl }}>
      {/* Identity */}
      <View style={styles.identity}>
        <Avatar name={business.name} uri={business.logoUri} size={44} square />
        <View style={{ flex: 1 }}>
          <Text style={type.caption}>
            {greeting()}, {firstName}
          </Text>
          <Text style={type.heading} numberOfLines={1}>
            {business.name}
          </Text>
        </View>
      </View>

      {/* Today */}
      <View style={styles.block}>
        <Text style={type.overline}>Today’s sales</Text>
        <Text style={[type.amountLarge, { marginTop: spacing.xs }]} accessibilityLabel={`Today's sales ${money.format(data.today.revenue)}`}>
          {money.format(data.today.revenue)}
        </Text>
        <View style={styles.stats}>
          <Stat label="Transactions" value={String(data.today.transactions)} />
          <View style={styles.statDivider} />
          <Stat
            label="Gross profit"
            value={data.today.grossProfit != null ? money.format(data.today.grossProfit, { compact: true }) : '—'}
            note={data.today.grossProfit == null ? 'Needs cost prices' : undefined}
          />
          {settings.trackStock && settings.lowStockAlerts && (
            <>
              <View style={styles.statDivider} />
              <Stat
                label="Low stock"
                value={String(data.low.length)}
                tone={data.low.length ? 'warning' : undefined}
                onPress={() => router.push({ pathname: '/(tabs)/inventory', params: { filter: 'low' } })}
              />
            </>
          )}
        </View>
        {data.today.paymentsReceived !== data.today.revenue && data.today.transactions > 0 && (
          <Text style={[type.caption, { marginTop: spacing.sm }]}>
            {money.format(data.today.paymentsReceived)} received in payments today
          </Text>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.actions}>
        <Button label="New sale" icon="plus" onPress={() => router.push('/sale/new')} disabled={!hasProducts} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button label="Add product" icon="package" variant="secondary" size="sm" style={{ flex: 1 }} onPress={() => router.push('/product/form')} />
          <Button label="Add customer" icon="user-plus" variant="secondary" size="sm" style={{ flex: 1 }} onPress={() => router.push('/customer/form')} />
        </View>
      </View>

      {!hasSales ? (
        <GettingStarted
          steps={[
            {
              done: hasProducts,
              title: 'Add your products',
              body: 'Selling price, cost price and how many you have in stock.',
              onPress: () => router.push(hasProducts ? '/(tabs)/inventory' : '/product/form'),
            },
            {
              done: false,
              title: 'Record your first sale',
              body: hasProducts ? 'Pick products, take payment, and stock updates itself.' : 'Available once you have a product.',
              onPress: hasProducts ? () => router.push('/sale/new') : undefined,
            },
            {
              done: state.customers.length > 0,
              title: 'Save regular customers',
              body: 'See what each customer buys and what they owe.',
              onPress: () => router.push('/customer/form'),
            },
          ]}
        />
      ) : (
        <>
          {data.low.length > 0 && (
            <Pressable
              onPress={() => router.push({ pathname: '/(tabs)/inventory', params: { filter: 'low' } })}
              accessibilityRole="button"
              style={styles.lowBanner}
            >
              <Feather name="alert-triangle" size={18} color={colors.warning} />
              <Text style={[type.body, { flex: 1 }]}>
                {plural(data.low.length, 'product')} running low: {data.low.slice(0, 2).map((p) => p.name).join(', ')}
                {data.low.length > 2 ? '…' : ''}
              </Text>
              <Feather name="chevron-right" size={18} color={colors.inkMuted} />
            </Pressable>
          )}

          {data.weekHasSales && (
            <View style={styles.block}>
              <SectionHeader title="Last 7 days" />
              <SalesTrend days={data.week} format={money.format} />
            </View>
          )}

          <View style={{ marginTop: spacing.xl }}>
            <View style={{ paddingHorizontal: spacing.gutter }}>
              <SectionHeader
                title="Recent sales"
                action={<Button label="See all" variant="ghost" size="sm" onPress={() => router.push('/(tabs)/sales')} />}
              />
            </View>
            {data.recent.map((s, i) => (
              <View key={s.id}>
                {i > 0 && <Divider inset={spacing.gutter} />}
                <SaleRow
                  sale={s}
                  status={paymentStatus(s.total, amountPaid(state, s.id))}
                  format={money.format}
                  onPress={() => router.push({ pathname: '/sale/[id]', params: { id: s.id } })}
                />
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
  onPress,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: 'warning';
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text style={[type.amount, { fontSize: 17 }, tone === 'warning' && { color: colors.warning }]}>{value}</Text>
      <Text style={type.caption}>{label}</Text>
      {note && <Text style={[type.caption, { fontSize: 11 }]}>{note}</Text>}
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={styles.stat} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}${note ? `. ${note}` : ''}`}>
      {content}
    </View>
  );
}

function GettingStarted({
  steps,
}: {
  steps: { done: boolean; title: string; body: string; onPress?: () => void }[];
}) {
  return (
    <View style={styles.block}>
      <SectionHeader title="Get started" />
      <Text style={[type.secondary, { marginBottom: spacing.sm }]}>
        Your figures will appear here once you record sales. Nothing is estimated.
      </Text>
      {steps.map((s, i) => (
        <Row key={s.title} onPress={s.onPress} label={`${s.title}${s.done ? ', done' : ''}`}>
          <View style={[styles.stepNum, s.done && styles.stepDone]}>
            {s.done ? <Feather name="check" size={14} color={colors.white} /> : <Text style={styles.stepNumText}>{i + 1}</Text>}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.bodyStrong, s.done && { color: colors.inkMuted, textDecorationLine: 'line-through' }]}>{s.title}</Text>
            <Text style={type.caption}>{s.body}</Text>
          </View>
          {s.onPress && !s.done && <Feather name="chevron-right" size={18} color={colors.inkMuted} />}
        </Row>
      ))}
    </View>
  );
}

function Row({ children, onPress, label }: { children: ReactNode; onPress?: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.stepRow, pressed && { backgroundColor: colors.surfaceSubtle }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.gutter },
  block: { paddingHorizontal: spacing.gutter, marginTop: spacing.xxl },
  stats: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stat: { flex: 1, gap: 2, minHeight: 44, justifyContent: 'center' },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: spacing.md },
  actions: { paddingHorizontal: spacing.gutter, marginTop: spacing.xl, gap: spacing.md },
  lowBanner: {
    marginHorizontal: spacing.gutter,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderRadius: radius.sm },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: { backgroundColor: colors.primary },
  stepNumText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
