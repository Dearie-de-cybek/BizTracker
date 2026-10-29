import Feather from '@expo/vector-icons/Feather';
import { ComponentProps, memo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { stockLevel } from '@/domain/analytics';
import { formatReceiptNumber } from '@/domain/sales';
import type { BusinessSettings, PaymentStatus, Product, Sale } from '@/domain/types';
import { colors, spacing, touch, type } from '@/theme';
import { formatDateTime, plural } from '@/utils/format';
import { Avatar } from './media';
import { StatusBadge } from './states';

/** Generic tappable list row. */
export function ListRow({
  title,
  subtitle,
  left,
  right,
  icon,
  onPress,
  chevron = !!onPress,
  disabled,
  accessibilityLabel,
  destructive,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  icon?: ComponentProps<typeof Feather>['name'];
  onPress?: () => void;
  chevron?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={!onPress || disabled}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && { opacity: 0.5 }]}
    >
      {icon && <Feather name={icon} size={20} color={destructive ? colors.danger : colors.inkSecondary} style={{ width: 24 }} />}
      {left}
      <View style={styles.body}>
        <Text style={[type.body, destructive && { color: colors.danger }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={type.caption} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
      {chevron && <Feather name="chevron-right" size={18} color={colors.inkMuted} />}
    </Pressable>
  );
}

export const ProductRow = memo(function ProductRow({
  product,
  settings,
  categoryName,
  format,
  onPress,
  right,
}: {
  product: Product;
  settings: BusinessSettings;
  categoryName?: string;
  format: (m: number) => string;
  onPress: () => void;
  right?: ReactNode;
}) {
  const level = stockLevel(product, settings);
  const meta = [categoryName, settings.useSkus && product.sku ? `SKU ${product.sku}` : null].filter(Boolean).join(' · ');
  return (
    <View style={styles.rowOuter}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${format(product.sellingPrice)}${
          level !== 'untracked' ? `, ${product.stockQuantity} in stock` : ''
        }${level === 'low' ? ', low stock' : level === 'out' ? ', out of stock' : ''}`}
        style={({ pressed }) => [styles.row, styles.rowMain, !!right && { paddingRight: spacing.sm }, pressed && styles.pressed]}
      >
        <Avatar name={product.name} uri={product.imageUri} size={44} square />
        <View style={styles.body}>
          <Text style={type.bodyStrong} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={styles.metaRow}>
            {level !== 'untracked' && (
              <Text style={[type.caption, level === 'out' && { color: colors.danger }]}>{product.stockQuantity} in stock</Text>
            )}
            {meta ? <Text style={type.caption} numberOfLines={1}>{(level !== 'untracked' ? '· ' : '') + meta}</Text> : null}
          </View>
          {(level === 'low' || level === 'out') && <StatusBadge status={level} />}
        </View>
        {!right && <Text style={type.amount}>{format(product.sellingPrice)}</Text>}
      </Pressable>
      {/* Interactive trailing content (e.g. a quantity stepper) sits outside the row button */}
      {right && <View style={styles.rowRight}>{right}</View>}
    </View>
  );
});

export const SaleRow = memo(function SaleRow({
  sale,
  status,
  format,
  onPress,
}: {
  sale: Sale;
  status: PaymentStatus;
  format: (m: number) => string;
  onPress: () => void;
}) {
  const units = sale.items.reduce((a, i) => a + i.quantity, 0);
  const who = sale.customerName ?? 'Walk-in customer';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Sale ${formatReceiptNumber(sale.receiptNumber)}, ${who}, ${format(sale.total)}, ${status}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.body}>
        <Text style={type.bodyStrong} numberOfLines={1}>
          {who}
        </Text>
        <Text style={type.caption} numberOfLines={1}>
          {formatReceiptNumber(sale.receiptNumber)} · {plural(units, 'item')} · {formatDateTime(sale.createdAt)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={type.amount}>{format(sale.total)}</Text>
        {status !== 'paid' && <StatusBadge status={status} />}
      </View>
    </Pressable>
  );
});

/** Label/value line used in summaries and receipts. */
export function KeyValue({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <View style={styles.kv}>
      <Text style={[strong ? type.bodyStrong : type.secondary, { flexShrink: 1 }]}>{label}</Text>
      <Text
        style={[strong ? type.amount : type.body, { fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 1 }, muted && { color: colors.inkMuted }]}
      >
        {value}
      </Text>
    </View>
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
    backgroundColor: colors.white,
  },
  pressed: { backgroundColor: colors.surfaceSubtle },
  rowOuter: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white },
  rowMain: { flex: 1 },
  rowRight: { paddingRight: spacing.gutter },
  body: { flex: 1, gap: 3 },
  metaRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, paddingVertical: 6 },
});
