import Feather from '@expo/vector-icons/Feather';
import { forwardRef, ReactNode, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, TextInputInstance, TextInputProps, View } from 'react-native';

import { colors, radius, spacing, touch, type } from '@/theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  prefix?: string;
  suffix?: ReactNode;
}

export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  { label, error, hint, optional, prefix, suffix, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={type.label}>
        {label}
        {optional && <Text style={styles.optional}> (optional)</Text>}
      </Text>
      <View
        style={[
          styles.inputWrap,
          multiline && styles.multilineWrap,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      >
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.inkMuted}
          multiline={multiline}
          style={[styles.input, multiline && styles.multiline]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {suffix}
      </View>
      {error ? <FieldError message={error} /> : hint ? <Text style={type.caption}>{hint}</Text> : null}
    </View>
  );
});

export function FieldError({ message }: { message: string }) {
  return (
    <View style={styles.errorRow} accessibilityLiveRegion="polite">
      <Feather name="alert-circle" size={14} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

/** A field that opens a picker (sheet) instead of the keyboard. */
export function SelectField({
  label,
  value,
  placeholder = 'Select',
  onPress,
  error,
  optional,
}: {
  label: string;
  value?: string | null;
  placeholder?: string;
  onPress: () => void;
  error?: string;
  optional?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={type.label}>
        {label}
        {optional && <Text style={styles.optional}> (optional)</Text>}
      </Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        accessibilityHint={error}
        style={({ pressed }) => [styles.inputWrap, pressed && styles.pressed, !!error && styles.inputError]}
      >
        <Text style={[styles.input, styles.selectText, !value && { color: colors.inkMuted }]} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.inkSecondary} />
      </Pressable>
      {error && <FieldError message={error} />}
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Feather name="search" size={18} color={colors.inkMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        style={styles.searchInput}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}>
          <Feather name="x-circle" size={18} color={colors.inkMuted} />
        </Pressable>
      )}
    </View>
  );
}

export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      style={[styles.switchRow, disabled && { opacity: 0.5 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.bodyStrong}>{label}</Text>
        {description && <Text style={type.secondary}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor={colors.white}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

/** Horizontal segmented choice. Selection is shown by fill and a check mark, not colour alone. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      {label && <Text style={type.label}>{label}</Text>}
      <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={o.label}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Scrollable filter chips */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.chip, selected && styles.chipActive]}
    >
      {selected && <Feather name="check" size={14} color={colors.white} />}
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

/** Large radio card used for two or three mutually exclusive choices. */
export function ChoiceCard({
  title,
  description,
  selected,
  onPress,
}: {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      accessibilityHint={description}
      style={[styles.choice, selected && styles.choiceActive]}
    >
      <View style={[styles.radio, selected && styles.radioActive]}>{selected && <View style={styles.radioDot} />}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.bodyStrong}>{title}</Text>
        {description && <Text style={type.secondary}>{description}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  optional: { fontWeight: '400', color: colors.inkMuted },
  inputWrap: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  multilineWrap: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  inputFocused: { borderColor: colors.primary, borderWidth: 1.5 },
  inputError: { borderColor: colors.danger },
  pressed: { backgroundColor: colors.surfaceSubtle },
  // Web: the wrapper draws the focus ring, so drop the browser's default outline
  input: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 12, minHeight: 50, ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null) },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  selectText: { paddingVertical: 15, minHeight: 0 },
  prefix: { fontSize: 16, color: colors.inkSecondary, fontWeight: '500' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { fontSize: 13, color: colors.danger, flex: 1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink, height: 46, ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null) },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: touch.min, paddingVertical: spacing.sm },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: 3,
  },
  segment: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingHorizontal: 6 },
  segmentActive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentText: { fontSize: 14, fontWeight: '500', color: colors.inkSecondary },
  segmentTextActive: { color: colors.primary, fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '500', color: colors.ink },
  choice: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },
  choiceActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
