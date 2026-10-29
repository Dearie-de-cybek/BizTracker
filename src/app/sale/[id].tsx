import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import {
  Avatar,
  BottomBar,
  Button,
  EmptyState,
  Header,
  IconButton,
  KeyValue,
  Notice,
  Page,
  ScrollScreen,
  SectionHeader,
  StatusBadge,
} from '@/components';
import { useBusiness, useDb } from '@/data/DataProvider';
import { paymentMethodLabel } from '@/domain/reference';
import { formatReceiptNumber, paymentStatus, paymentsForSale } from '@/domain/sales';
import { RecordPaymentSheet } from '@/features/sales/RecordPaymentSheet';
import { receiptText } from '@/features/sales/receiptText';
import { useMoney } from '@/hooks/useMoney';
import { colors, spacing, type } from '@/theme';
import { formatDateTime } from '@/utils/format';

export default function SaleDetail() {
  const { id, done } = useLocalSearchParams<{ id: string; done?: string }>();
  const state = useDb();
  const { business, settings } = useBusiness();
  const money = useMoney();
  const router = useRouter();
  const [paySheet, setPaySheet] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const sale = state.sales.find((s) => s.id === id);
  if (!sale) {
    return (
      <Page>
        <Header title="Sale" back />
        <EmptyState icon="file" title="Sale not found" body="It may have been recorded on another device." />
      </Page>
    );
  }

  const payments = paymentsForSale(state, sale.id);
  const paid = payments.reduce((a, p) => a + p.amount, 0);
  const balance = sale.total - paid;
  const status = paymentStatus(sale.total, paid);
  const r = settings.receipt;
  const profit = sale.costOfGoods != null ? sale.total - sale.costOfGoods : null;

  const share = async () => {
    setShareError(null);
    try {
      await Share.share({ message: receiptText(sale, payments, business, settings), title: `Receipt ${formatReceiptNumber(sale.receiptNumber)}` });
    } catch {
      setShareError('Sharing is not available on this device.');
    }
  };

  return (
    <Page>
      <Header
        title={`Receipt ${formatReceiptNumber(sale.receiptNumber)}`}
        back={done ? () => router.replace('/(tabs)/sales') : true}
        right={<IconButton icon="share-2" label="Share receipt" onPress={share} />}
      />
      <ScrollScreen
        footer={
          done || balance > 0 ? (
            <BottomBar>
              {balance > 0 && <Button label={`Record payment · ${money.format(balance)} due`} variant={done ? 'secondary' : 'primary'} onPress={() => setPaySheet(true)} />}
              {done && <Button label="Start another sale" icon="plus" onPress={() => router.replace('/sale/new')} />}
            </BottomBar>
          ) : undefined
        }
      >
        {done && (
          <View style={styles.done} accessibilityLiveRegion="polite">
            <Feather name="check-circle" size={20} color={colors.primary} />
            <Text style={[type.bodyStrong, { color: colors.primary, flex: 1 }]}>Sale recorded. Stock has been updated.</Text>
          </View>
        )}
        {shareError && <Notice tone="warning" message={shareError} />}

        {/* Receipt header */}
        <View style={styles.receiptHead}>
          {r.showLogo && business.logoUri && <Avatar name={business.name} uri={business.logoUri} size={48} square />}
          <Text style={[type.heading, { textAlign: 'center' }]}>{business.name}</Text>
          {r.showAddress && <Text style={[type.caption, { textAlign: 'center' }]}>{business.address}</Text>}
          {r.showPhone && <Text style={[type.caption, { textAlign: 'center' }]}>{business.phone}</Text>}
        </View>

        <View style={styles.meta}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.bodyStrong}>{sale.customerName ?? 'Walk-in customer'}</Text>
            <Text style={type.caption}>{formatDateTime(sale.createdAt)}</Text>
          </View>
          <StatusBadge status={status} />
        </View>

        <View>
          <SectionHeader title="Items" />
          {sale.items.map((i) => (
            <View key={i.id} style={styles.item}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.body}>{i.productName}</Text>
                <Text style={type.caption}>
                  {i.quantity} × {money.format(i.unitPrice)}
                  {settings.useSkus && i.sku ? ` · SKU ${i.sku}` : ''}
                </Text>
              </View>
              <Text style={type.amount}>{money.format(i.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <KeyValue label="Subtotal" value={money.format(sale.subtotal)} />
          {sale.discountAmount > 0 && (
            <KeyValue
              label={sale.discount.type === 'percent' ? `Discount (${sale.discount.basisPoints / 100}%)` : 'Discount'}
              value={'−' + money.format(sale.discountAmount)}
            />
          )}
          <KeyValue label="Total" value={money.format(sale.total)} strong />
          {settings.pricesIncludeTax && <Text style={type.caption}>Prices include tax.</Text>}
        </View>

        <View>
          <SectionHeader title="Payments" />
          {payments.length === 0 && <Text style={type.secondary}>No payment recorded yet.</Text>}
          {payments.map((p) => (
            <View key={p.id} style={styles.item}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.body}>{paymentMethodLabel(p.method)}</Text>
                <Text style={type.caption}>
                  {formatDateTime(p.receivedAt)}
                  {p.reference ? ` · Ref ${p.reference}` : ''}
                  {p.tendered != null && p.tendered > p.amount ? ` · Received ${money.format(p.tendered)}, change ${money.format(p.tendered - p.amount)}` : ''}
                </Text>
              </View>
              <Text style={type.amount}>{money.format(p.amount)}</Text>
            </View>
          ))}
          {balance > 0 && <KeyValue label="Balance due" value={money.format(balance)} strong />}
          <Text style={[type.caption, { marginTop: spacing.sm }]}>Payments are recorded manually, not processed by BizTracker.</Text>
        </View>

        {profit != null && (
          <View>
            <SectionHeader title="For you only" />
            <KeyValue label="Cost of goods" value={money.format(sale.costOfGoods!)} />
            <KeyValue label="Gross profit" value={money.format(profit)} strong />
          </View>
        )}
        {sale.note && (
          <View>
            <SectionHeader title="Note" />
            <Text style={type.body}>{sale.note}</Text>
          </View>
        )}
        {r.footerMessage ? <Text style={[type.caption, { textAlign: 'center' }]}>{r.footerMessage}</Text> : null}
      </ScrollScreen>
      <RecordPaymentSheet visible={paySheet} onClose={() => setPaySheet(false)} saleId={sale.id} balance={balance} />
    </Page>
  );
}

const styles = StyleSheet.create({
  done: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', padding: spacing.md, backgroundColor: colors.primarySoft, borderRadius: 10 },
  receiptHead: { alignItems: 'center', gap: 4, paddingTop: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  item: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingVertical: spacing.sm },
  totals: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm },
});
