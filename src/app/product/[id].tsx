import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomBar, Button, Divider, EmptyState, Header, IconButton, KeyValue, Notice, Page, ScrollScreen, SectionHeader, StatusBadge } from '@/components';
import { useBusiness, useDb } from '@/data/DataProvider';
import { lowStockThresholdFor, stockLevel } from '@/domain/analytics';
import { adjustmentReasonLabel } from '@/domain/reference';
import { formatReceiptNumber } from '@/domain/sales';
import type { StockMovement } from '@/domain/types';
import { useMoney } from '@/hooks/useMoney';
import { colors, radius, spacing, type } from '@/theme';
import { formatDateTime } from '@/utils/format';

export default function ProductDetail() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const state = useDb();
  const { settings } = useBusiness();
  const money = useMoney();
  const router = useRouter();
  const product = state.products.find((p) => p.id === id);

  const { movements, unitsSold, receipts } = useMemo(() => {
    const movements = state.stockMovements.filter((m) => m.productId === id).reverse();
    let unitsSold = 0;
    for (const s of state.sales) for (const i of s.items) if (i.productId === id) unitsSold += i.quantity;
    return { movements, unitsSold, receipts: new Map(state.sales.map((s) => [s.id, s.receiptNumber])) };
  }, [state.stockMovements, state.sales, id]);

  if (!product) {
    return (
      <Page>
        <Header title="Product" back />
        <EmptyState icon="package" title="Product not found" />
      </Page>
    );
  }

  const level = stockLevel(product, settings);
  const category = state.categories.find((c) => c.id === product.categoryId)?.name;
  const margin = product.costPrice != null ? product.sellingPrice - product.costPrice : null;

  return (
    <Page>
      <Header
        title={product.name}
        back={created ? () => router.replace('/(tabs)/inventory') : true}
        right={<IconButton icon="edit-2" label="Edit product" onPress={() => router.push({ pathname: '/product/form', params: { id: product.id } })} />}
      />
      <ScrollScreen
        footer={
          settings.trackStock ? (
            <BottomBar>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                {created && <Button label="Add another" variant="secondary" onPress={() => router.replace('/product/form')} style={{ flex: 1 }} />}
                <Button
                  label="Adjust stock"
                  icon="sliders"
                  variant={created ? 'secondary' : 'primary'}
                  onPress={() => router.push({ pathname: '/product/adjust', params: { id: product.id } })}
                  style={{ flex: 1 }}
                />
              </View>
            </BottomBar>
          ) : undefined
        }
      >
        {created && <Notice title="Product added" message="It is now available when you record a sale." />}

        <View style={styles.hero}>
          {product.imageUri && <Image source={{ uri: product.imageUri }} style={styles.image} contentFit="cover" accessibilityLabel={product.name} />}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={type.title}>{money.format(product.sellingPrice)}</Text>
            <Text style={type.secondary}>
              {[category, product.unit && `per ${product.unit}`].filter(Boolean).join(' · ') || 'Selling price'}
            </Text>
          </View>
        </View>

        {settings.trackStock && (
          <View style={styles.stock} accessible accessibilityLabel={`${product.stockQuantity} in stock`}>
            <View style={{ flex: 1 }}>
              <Text style={type.overline}>In stock</Text>
              <Text style={[type.amountLarge, level === 'out' && { color: colors.danger }]}>{product.stockQuantity}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <StatusBadge status={level} />
              {settings.lowStockAlerts && <Text style={type.caption}>Low at {lowStockThresholdFor(product, settings)} or below</Text>}
            </View>
          </View>
        )}

        <View>
          <SectionHeader title="Pricing" />
          <KeyValue label="Selling price" value={money.format(product.sellingPrice)} />
          <KeyValue label="Cost price" value={product.costPrice != null ? money.format(product.costPrice) : 'Not set'} muted={product.costPrice == null} />
          <KeyValue label="Profit per unit" value={margin != null ? money.format(margin) : 'Needs cost price'} muted={margin == null} />
          <KeyValue label="Units sold" value={String(unitsSold)} />
          {settings.useSkus && <KeyValue label="SKU" value={product.sku ?? '—'} />}
          {settings.useSkus && <KeyValue label="Barcode" value={product.barcode ?? '—'} />}
        </View>

        {settings.trackStock && (
          <View>
            <SectionHeader title="Stock history" />
            {movements.length === 0 && <Text style={type.secondary}>No stock recorded yet. Use “Adjust stock” when new stock arrives.</Text>}
            {movements.slice(0, 50).map((m, i) => (
              <View key={m.id}>
                {i > 0 && <Divider />}
                <MovementRow
                  m={m}
                  receipt={m.saleId ? receipts.get(m.saleId) : undefined}
                  onPress={m.saleId ? () => router.push({ pathname: '/sale/[id]', params: { id: m.saleId! } }) : undefined}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollScreen>
    </Page>
  );
}

function MovementRow({ m, receipt, onPress }: { m: StockMovement; receipt?: number; onPress?: () => void }) {
  const title =
    m.type === 'opening' ? 'Opening stock' : m.type === 'sale' ? `Sold${receipt ? ` · ${formatReceiptNumber(receipt)}` : ''}` : adjustmentReasonLabel(m.reason);
  const positive = m.change > 0;
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} style={styles.movement}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.body}>{title}</Text>
        <Text style={type.caption}>
          {formatDateTime(m.createdAt)}
          {m.note ? ` · ${m.note}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[type.amount, { color: positive ? colors.primary : colors.ink }]}>
          {positive ? '+' : '−'}
          {Math.abs(m.change)}
        </Text>
        <Text style={type.caption}>→ {m.quantityAfter}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  image: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceSubtle },
  stock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  movement: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
});
