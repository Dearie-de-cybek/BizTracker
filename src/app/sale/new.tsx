import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BottomBar,
  Button,
  Chip,
  ConfirmDialog,
  Divider,
  EmptyState,
  Header,
  IconButton,
  KeyValue,
  Notice,
  Page,
  ProductRow,
  QuantityStepper,
  ScrollScreen,
  SearchField,
  Segmented,
  SelectField,
  TextField,
} from '@/components';
import { generateId } from '@/data/database';
import { useActions, useBusiness, useDb } from '@/data/DataProvider';
import { parsePercent } from '@/domain/money';
import { PAYMENT_METHODS } from '@/domain/reference';
import { CartLine, DuplicateSaleError, priceCart } from '@/domain/sales';
import type { DiscountInput, PaymentMethod } from '@/domain/types';
import { ValidationError } from '@/domain/validation';
import { CustomerPicker } from '@/features/customers/CustomerPicker';
import { filterProducts } from '@/features/inventory/filterProducts';
import { useMoney } from '@/hooks/useMoney';
import { colors, spacing, type } from '@/theme';
import { plural } from '@/utils/format';
import { goBack } from '@/utils/navigation';

type DiscountMode = 'none' | 'amount' | 'percent';

export default function NewSale() {
  const state = useDb();
  const { settings } = useBusiness();
  const actions = useActions();
  const money = useMoney();
  const router = useRouter();

  // One id per checkout: retries after a failed save reuse it, so a sale can't be recorded twice.
  const requestId = useRef(generateId()).current;

  const [phase, setPhase] = useState<'pick' | 'pay'>('pick');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerSheet, setCustomerSheet] = useState(false);
  const [discountMode, setDiscountMode] = useState<DiscountMode>('none');
  const [discountText, setDiscountText] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [paidText, setPaidText] = useState<string | null>(null); // null = pay in full
  const [tenderedText, setTenderedText] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const qty = (id: string) => cart.find((l) => l.productId === id)?.quantity ?? 0;
  const setQty = (id: string, q: number) =>
    setCart((c) => (q <= 0 ? c.filter((l) => l.productId !== id) : c.some((l) => l.productId === id) ? c.map((l) => (l.productId === id ? { ...l, quantity: q } : l)) : [...c, { productId: id, quantity: q }]));

  const discount: DiscountInput | null = useMemo(() => {
    if (discountMode === 'none' || !discountText.trim()) return { type: 'none' };
    if (discountMode === 'amount') {
      const a = money.parse(discountText);
      return a == null ? null : { type: 'amount', amount: a };
    }
    const bp = parsePercent(discountText);
    return bp == null ? null : { type: 'percent', basisPoints: bp };
  }, [discountMode, discountText, money]);

  const priced = useMemo(() => priceCart(state, cart, discount ?? { type: 'none' }), [state, cart, discount]);
  const products = useMemo(() => filterProducts(state.products, settings, query, category), [state.products, settings, query, category]);
  const units = cart.reduce((a, l) => a + l.quantity, 0);

  const paid = paidText == null ? priced.total : money.parse(paidText);
  const tendered = method === 'cash' && tenderedText.trim() ? money.parse(tenderedText) : null;
  const balance = paid == null ? null : priced.total - paid;
  const customer = state.customers.find((c) => c.id === customerId);

  const leave = () => (cart.length ? setConfirmLeave(true) : goBack(router));

  const submit = async () => {
    setError(null);
    if (discount == null) return setError(discountMode === 'percent' ? 'Enter a discount between 0 and 100%.' : 'Enter a valid discount amount.');
    if (paid == null) return setError('Enter a valid amount paid.');
    if (method === 'cash' && tenderedText.trim() && tendered == null) return setError('Enter a valid cash amount received.');
    setSubmitting(true);
    try {
      const sale = await actions.createSale({
        requestId,
        lines: cart,
        customerId,
        discount,
        payment: { method, amount: paid, tendered: tendered ?? undefined, reference },
        note,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.replace({ pathname: '/sale/[id]', params: { id: sale.id, done: '1' } });
    } catch (e) {
      if (e instanceof DuplicateSaleError) {
        router.replace({ pathname: '/sale/[id]', params: { id: e.saleId } });
        return;
      }
      setError(
        e instanceof ValidationError ? e.message : "The sale couldn't be saved, so nothing was recorded and stock is unchanged. Try again.",
      );
      setSubmitting(false);
    }
  };

  const categories = [{ id: 'all', name: 'All' }, ...state.categories];

  if (phase === 'pick') {
    return (
      <Page>
        <Header title="New sale" back={leave} subtitle="Tap products to add them" />
        <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.sm }}>
          <SearchField value={query} onChangeText={setQuery} placeholder={settings.useSkus ? 'Search name, SKU or barcode' : 'Search products'} />
        </View>
        {state.categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0 }}>
            {categories.map((c) => (
              <Chip key={c.id} label={c.name} selected={category === c.id} onPress={() => setCategory(c.id)} />
            ))}
          </ScrollView>
        )}
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <Divider inset={spacing.gutter + 56} />}
          ListEmptyComponent={<EmptyState compact icon="search" title="No products found" body="Check the spelling or choose another category." />}
          renderItem={({ item }) => {
            const q = qty(item.id);
            const out = settings.trackStock && item.stockQuantity <= 0;
            const add = () => !out && (!settings.trackStock || q < item.stockQuantity) && setQty(item.id, q + 1);
            return (
              <ProductRow
                product={item}
                settings={settings}
                format={money.format}
                onPress={add}
                right={
                  q > 0 ? (
                    <QuantityStepper
                      label={item.name}
                      value={q}
                      onChange={(v) => setQty(item.id, v)}
                      max={settings.trackStock ? item.stockQuantity : undefined}
                    />
                  ) : (
                    <Pressable
                      onPress={add}
                      disabled={out}
                      accessibilityRole="button"
                      accessibilityLabel={out ? `${item.name} is out of stock` : `Add ${item.name}`}
                      style={{ alignItems: 'flex-end', gap: 2, minHeight: 44, justifyContent: 'center' }}
                    >
                      <Text style={type.amount}>{money.format(item.sellingPrice)}</Text>
                      <Text style={[type.caption, { color: out ? colors.danger : colors.primary, fontWeight: '600' }]}>{out ? 'Out of stock' : '+ Add'}</Text>
                    </Pressable>
                  )
                }
              />
            );
          }}
        />
        <BottomBar>
          <Button
            label={cart.length ? `Review sale · ${plural(units, 'item')} · ${money.format(priced.subtotal)}` : 'Add products to continue'}
            disabled={!cart.length}
            onPress={() => setPhase('pay')}
          />
        </BottomBar>
        <ConfirmDialog
          visible={confirmLeave}
          title="Discard this sale?"
          message="The products you added will be removed. Nothing has been recorded."
          confirmLabel="Discard"
          destructive
          onCancel={() => setConfirmLeave(false)}
          onConfirm={() => {
            setConfirmLeave(false);
            goBack(router);
          }}
        />
      </Page>
    );
  }

  const lineErrors = priced.lineErrors;
  const creditWithoutCustomer = balance != null && balance > 0 && !customer;

  return (
    <Page>
      <Header title="Review sale" back={() => setPhase('pick')} right={<IconButton icon="plus" label="Add more products" onPress={() => setPhase('pick')} />} />
      <ScrollScreen
        footer={
          <BottomBar>
            {error && <Notice tone="danger" message={error} />}
            <Button
              label={`Complete sale · ${money.format(priced.total)}`}
              onPress={submit}
              loading={submitting}
              disabled={!cart.length || Object.keys(lineErrors).length > 0 || creditWithoutCustomer}
            />
          </BottomBar>
        }
      >
        {/* Items */}
        <View>
          {priced.items.map((i) => (
            <View key={i.productId} style={styles.item}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.bodyStrong} numberOfLines={2}>
                  {i.productName}
                </Text>
                <Text style={type.caption}>
                  {money.format(i.unitPrice)} each · {money.format(i.lineTotal)}
                </Text>
                {lineErrors[i.productId] && <Text style={styles.lineError}>{lineErrors[i.productId]}</Text>}
              </View>
              <QuantityStepper
                label={i.productName}
                value={i.quantity}
                onChange={(v) => {
                  setQty(i.productId, v);
                  if (v === 0 && cart.length === 1) setPhase('pick');
                }}
                max={settings.trackStock ? state.products.find((p) => p.id === i.productId)?.stockQuantity : undefined}
              />
            </View>
          ))}
        </View>

        <SelectField
          label="Customer"
          value={customer ? customer.name : 'Walk-in customer'}
          onPress={() => setCustomerSheet(true)}
        />

        <View style={{ gap: spacing.md }}>
          <Segmented<DiscountMode>
            label="Discount"
            value={discountMode}
            onChange={(m) => {
              setDiscountMode(m);
              setDiscountText('');
            }}
            options={[
              { value: 'none', label: 'None' },
              { value: 'amount', label: money.currency.symbol + ' Amount' },
              { value: 'percent', label: '% Percent' },
            ]}
          />
          {discountMode !== 'none' && (
            <TextField
              label={discountMode === 'amount' ? 'Discount amount' : 'Discount percentage'}
              value={discountText}
              onChangeText={setDiscountText}
              keyboardType="decimal-pad"
              prefix={discountMode === 'amount' ? money.currency.symbol : undefined}
              suffix={discountMode === 'percent' ? <Text style={type.secondary}>%</Text> : undefined}
              error={discount == null ? 'Enter a valid discount.' : undefined}
            />
          )}
        </View>

        <View style={styles.totals}>
          <KeyValue label="Subtotal" value={money.format(priced.subtotal)} />
          {priced.discountAmount > 0 && <KeyValue label="Discount" value={'−' + money.format(priced.discountAmount)} />}
          <View style={styles.totalRow}>
            <Text style={type.heading}>Total</Text>
            <Text style={[type.amountLarge, { fontSize: 26, lineHeight: 32 }]}>{money.format(priced.total)}</Text>
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          <Segmented<PaymentMethod>
            label="Payment method"
            value={method}
            onChange={setMethod}
            options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.value === 'pos' ? 'POS' : m.value === 'transfer' ? 'Transfer' : m.label }))}
          />
          <Text style={type.caption}>{PAYMENT_METHODS.find((m) => m.value === method)!.hint}</Text>

          <TextField
            label="Amount paid"
            value={paidText ?? money.toInput(priced.total)}
            onChangeText={setPaidText}
            keyboardType="decimal-pad"
            prefix={money.currency.symbol}
            error={paid == null ? 'Enter a valid amount.' : paid > priced.total ? 'More than the total.' : undefined}
            hint="Lower this if the customer is paying part now and the rest later."
          />
          {method === 'cash' && (
            <TextField
              label="Cash received"
              optional
              value={tenderedText}
              onChangeText={setTenderedText}
              keyboardType="decimal-pad"
              prefix={money.currency.symbol}
              placeholder={money.toInput(paid ?? priced.total)}
              suffix={
                tendered != null && paid != null && tendered >= paid ? (
                  <Text style={[type.bodyStrong, { color: colors.primary }]}>Change {money.format(tendered - paid)}</Text>
                ) : undefined
              }
              error={tendered != null && paid != null && tendered < paid ? 'Less than the amount paid.' : undefined}
            />
          )}
          {(method === 'transfer' || method === 'pos') && (
            <TextField
              label={method === 'transfer' ? 'Transfer reference' : 'POS receipt / reference'}
              optional
              value={reference}
              onChangeText={setReference}
              autoCapitalize="characters"
            />
          )}

          {balance != null && balance > 0 && (
            <Notice
              tone={customer ? 'warning' : 'danger'}
              title={`${money.format(balance)} still owed`}
              message={
                customer
                  ? `This will be recorded as owed by ${customer.name}. You can record the rest later from the sale.`
                  : 'Select a customer to record a sale that is not fully paid.'
              }
              action={!customer ? <Button label="Choose customer" size="sm" variant="secondary" onPress={() => setCustomerSheet(true)} style={{ alignSelf: 'flex-start', marginTop: spacing.sm }} /> : undefined}
            />
          )}
        </View>

        <TextField label="Note" optional value={note} onChangeText={setNote} placeholder="e.g. Delivered to shop 12" maxLength={200} />

        <Pressable style={styles.disclaimer} accessible accessibilityRole="text">
          <Feather name="info" size={14} color={colors.inkMuted} />
          <Text style={[type.caption, { flex: 1 }]}>
            BizTracker records the payment you received. It does not charge cards or confirm bank transfers.
          </Text>
        </Pressable>
      </ScrollScreen>

      <CustomerPicker visible={customerSheet} onClose={() => setCustomerSheet(false)} value={customerId} onSelect={setCustomerId} />
    </Page>
  );
}

const styles = StyleSheet.create({
  chips: { gap: spacing.sm, paddingHorizontal: spacing.gutter, paddingBottom: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lineError: { color: colors.danger, fontSize: 13, fontWeight: '500' },
  totals: { paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: spacing.sm },
  disclaimer: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
});
