import { useState } from 'react';
import { View } from 'react-native';

import { Button, Notice, Segmented, Sheet, TextField } from '@/components';
import { useActions } from '@/data/DataProvider';
import { PAYMENT_METHODS } from '@/domain/reference';
import type { Money, PaymentMethod } from '@/domain/types';
import { ValidationError } from '@/domain/validation';
import { useMoney } from '@/hooks/useMoney';
import { spacing } from '@/theme';

/** Record a later payment towards an unpaid balance. */
export function RecordPaymentSheet({
  visible,
  onClose,
  saleId,
  balance,
}: {
  visible: boolean;
  onClose: () => void;
  saleId: string;
  balance: Money;
}) {
  const actions = useActions();
  const money = useMoney();
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amountText, setAmountText] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = amountText == null ? balance : money.parse(amountText);

  const save = async () => {
    if (amount == null || amount <= 0) return setError('Enter an amount greater than zero.');
    setSaving(true);
    setError(null);
    try {
      await actions.recordPayment(saleId, { method, amount, reference });
      setAmountText(null);
      setReference('');
      onClose();
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : "Payment couldn't be saved. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Record payment"
      footer={<Button label={`Record ${amount != null ? money.format(amount) : 'payment'}`} onPress={save} loading={saving} />}
    >
      <View style={{ gap: spacing.lg, paddingBottom: spacing.sm }}>
        <Segmented<PaymentMethod>
          label="Method"
          value={method}
          onChange={setMethod}
          options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.value === 'pos' ? 'POS' : m.value === 'transfer' ? 'Transfer' : m.label }))}
        />
        <TextField
          label="Amount received"
          value={amountText ?? money.toInput(balance)}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          prefix={money.currency.symbol}
          hint={`Balance due: ${money.format(balance)}`}
        />
        {method !== 'cash' && <TextField label="Reference" optional value={reference} onChangeText={setReference} />}
        {error && <Notice tone="danger" message={error} />}
      </View>
    </Sheet>
  );
}
