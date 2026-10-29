import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomBar, Button, ChoiceCard, EmptyState, Header, Notice, Page, ScrollScreen, Segmented, TextField } from '@/components';
import { useActions, useDb } from '@/data/DataProvider';
import { ADJUSTMENT_REASONS } from '@/domain/reference';
import type { AdjustmentReason } from '@/domain/types';
import { parseQuantity, ValidationError } from '@/domain/validation';
import { colors, spacing, type } from '@/theme';
import { goBack } from '@/utils/navigation';

type Mode = 'add' | 'remove' | 'set';

const DEFAULT_REASON: Record<Mode, AdjustmentReason> = { add: 'restock', remove: 'damaged', set: 'count_correction' };

export default function AdjustStock() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products } = useDb();
  const actions = useActions();
  const router = useRouter();
  const product = products.find((p) => p.id === id);

  const [mode, setMode] = useState<Mode>('add');
  const [qtyText, setQtyText] = useState('');
  const [reason, setReason] = useState<AdjustmentReason>('restock');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) {
    return (
      <Page>
        <Header title="Adjust stock" back />
        <EmptyState icon="package" title="Product not found" />
      </Page>
    );
  }

  const qty = parseQuantity(qtyText);
  const before = product.stockQuantity;
  const after = qty == null ? null : mode === 'add' ? before + qty : mode === 'remove' ? before - qty : qty;
  const reasons = ADJUSTMENT_REASONS.filter((r) =>
    mode === 'set' ? r.direction === 'any' : r.direction === 'any' || r.direction === (mode === 'add' ? 'in' : 'out'),
  );

  const save = async () => {
    if (qty == null) return setError('Enter a whole number of units.');
    setSaving(true);
    setError(null);
    try {
      await actions.adjustStock({ productId: product.id, mode, quantity: qty, reason, note });
      goBack(router);
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : "The adjustment couldn't be saved. Stock is unchanged.");
      setSaving(false);
    }
  };

  return (
    <Page>
      <Header title="Adjust stock" subtitle={product.name} back />
      <ScrollScreen
        footer={
          <BottomBar>
            {error && <Notice tone="danger" message={error} />}
            <Button label="Save adjustment" onPress={save} loading={saving} disabled={qty == null || after == null || after < 0 || after === before} />
          </BottomBar>
        }
      >
        <Segmented<Mode>
          value={mode}
          onChange={(m) => {
            setMode(m);
            setReason(DEFAULT_REASON[m]);
          }}
          options={[
            { value: 'add', label: 'Add stock' },
            { value: 'remove', label: 'Remove' },
            { value: 'set', label: 'Set count' },
          ]}
        />
        <TextField
          label={mode === 'set' ? 'Counted quantity' : mode === 'add' ? 'Units to add' : 'Units to remove'}
          value={qtyText}
          onChangeText={(v) => setQtyText(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          autoFocus
          placeholder="0"
          error={after != null && after < 0 ? `Only ${before} in stock.` : undefined}
        />

        <View style={styles.preview} accessible accessibilityLabel={`Stock changes from ${before} to ${after ?? before}`}>
          <View>
            <Text style={type.caption}>Current</Text>
            <Text style={type.title}>{before}</Text>
          </View>
          <Text style={[type.title, { color: colors.inkMuted }]}>→</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={type.caption}>After</Text>
            <Text style={[type.title, after != null && after < 0 && { color: colors.danger }]}>{after ?? '—'}</Text>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={type.label}>Reason</Text>
          {reasons.map((r) => (
            <ChoiceCard key={r.value} title={r.label} selected={reason === r.value} onPress={() => setReason(r.value)} />
          ))}
        </View>
        <TextField
          label="Note"
          optional={reason !== 'other'}
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Delivery from supplier, invoice 2231"
          maxLength={160}
        />
        <Text style={type.caption}>Every adjustment is kept in the product’s stock history.</Text>
      </ScrollScreen>
    </Page>
  );
}

const styles = StyleSheet.create({
  preview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
