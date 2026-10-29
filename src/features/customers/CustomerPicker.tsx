import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Notice, SearchField, Sheet, TextField } from '@/components';
import { useActions, useDb } from '@/data/DataProvider';
import { ValidationError } from '@/domain/validation';
import { colors, spacing, type } from '@/theme';

/** Choose walk-in, an existing customer, or create one without leaving checkout. */
export function CustomerPicker({
  visible,
  onClose,
  value,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  value: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { customers } = useDb();
  const actions = useActions();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = s.replace(/\D/g, '');
    return customers
      .filter((c) => !s || c.name.toLowerCase().includes(s) || (digits && c.phone?.replace(/\D/g, '').includes(digits)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, q]);

  const close = () => {
    setCreating(false);
    setQ('');
    setErrors({});
    onClose();
  };

  const pick = (id: string | null) => {
    onSelect(id);
    close();
  };

  const create = async () => {
    setSaving(true);
    try {
      const c = await actions.createCustomer({ name, phone });
      setName('');
      setPhone('');
      pick(c.id);
    } catch (e) {
      setErrors(e instanceof ValidationError ? e.fields : { name: "Couldn't save the customer. Try again." });
    } finally {
      setSaving(false);
    }
  };

  if (creating) {
    return (
      <Sheet
        visible={visible}
        onClose={close}
        title="New customer"
        footer={
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button label="Back" variant="secondary" onPress={() => setCreating(false)} style={{ minWidth: 96 }} />
            <Button label="Save and select" onPress={create} loading={saving} style={{ flex: 1 }} />
          </View>
        }
      >
        <View style={{ gap: spacing.lg, paddingBottom: spacing.sm }}>
          <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} autoFocus />
          <TextField label="Phone" optional value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={close} title="Customer">
      <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
        <SearchField value={q} onChangeText={setQ} placeholder="Search name or phone" />
      </View>
      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: 380 }}
        ListHeaderComponent={
          <>
            <Option icon="user" title="Walk-in customer" subtitle="No name needed" selected={value === null} onPress={() => pick(null)} />
            <Option icon="user-plus" title={q.trim() ? `Add “${q.trim()}”` : 'Add new customer'} onPress={() => {
              setName(q.trim());
              setCreating(true);
            }} />
          </>
        }
        ListEmptyComponent={customers.length > 0 ? <Notice message="No customer matches that search." /> : undefined}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => pick(item.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === item.id }}
            accessibilityLabel={`${item.name}${item.phone ? ', ' + item.phone : ''}`}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceSubtle }]}
          >
            <Avatar name={item.name} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={type.body}>{item.name}</Text>
              {item.phone && <Text style={type.caption}>{item.phone}</Text>}
            </View>
            {value === item.id && <Feather name="check" size={20} color={colors.primary} />}
          </Pressable>
        )}
      />
    </Sheet>
  );
}

function Option({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: 'user' | 'user-plus';
  title: string;
  subtitle?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceSubtle }]}
    >
      <View style={styles.optionIcon}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.body, icon === 'user-plus' && { color: colors.primary, fontWeight: '600' }]}>{title}</Text>
        {subtitle && <Text style={type.caption}>{subtitle}</Text>}
      </View>
      {selected && <Feather name="check" size={20} color={colors.primary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
