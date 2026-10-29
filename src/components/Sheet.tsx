import Feather from '@expo/vector-icons/Feather';
import { ReactNode, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, touch, type } from '@/theme';
import { Button } from './Button';
import { SearchField } from './fields';

/** Bottom sheet built on Modal: slides up, dismisses on backdrop tap and Android back. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={type.heading} accessibilityRole="header">
              {title}
            </Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} style={styles.close}>
              <Feather name="x" size={22} color={colors.inkSecondary} />
            </Pressable>
          </View>
          <View style={styles.body}>{children}</View>
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
}

/** Single-choice picker presented in a sheet, with search for long lists. */
export function OptionSheet<T extends string>({
  visible,
  onClose,
  title,
  options,
  value,
  onSelect,
  searchable,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: Option<T>[];
  value: T | null;
  onSelect: (v: T) => void;
  searchable?: boolean;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s)) : options;
  }, [q, options]);
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {searchable && (
        <View style={{ paddingBottom: spacing.sm }}>
          <SearchField value={q} onChangeText={setQ} placeholder="Search" />
        </View>
      )}
      <FlatList
        data={filtered}
        keyExtractor={(o) => o.value}
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: 420 }}
        renderItem={({ item }) => {
          const selected = item.value === value;
          return (
            <Pressable
              onPress={() => {
                onSelect(item.value);
                setQ('');
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={item.label}
              style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.surfaceSubtle }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[type.body, selected && { fontWeight: '600', color: colors.primary }]}>{item.label}</Text>
                {item.description && <Text style={type.caption}>{item.description}</Text>}
              </View>
              {selected && <Feather name="check" size={20} color={colors.primary} />}
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}

/** Confirmation dialog (cross-platform, unlike Alert on web). */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive,
  loading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialog} accessibilityViewIsModal accessibilityRole="alert">
          <Text style={type.heading}>{title}</Text>
          <Text style={[type.secondary, { marginTop: spacing.sm }]}>{message}</Text>
          <View style={styles.dialogActions}>
            <Button label="Cancel" variant="secondary" onPress={onCancel} style={{ flex: 1 }} disabled={loading} />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
    maxHeight: '88%',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  close: { width: touch.min, height: touch.min, alignItems: 'flex-end', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.gutter, flexShrink: 1 },
  footer: { paddingHorizontal: spacing.gutter, paddingTop: spacing.md },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  dialogBackdrop: { flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  dialog: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xxl, width: '100%', maxWidth: 420 },
  dialogActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl },
});
