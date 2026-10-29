import Feather from '@expo/vector-icons/Feather';
import { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, touch } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Feather>['name'];
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  size = 'md',
  style,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;
  const v = variants[variant];
  return (
    <Pressable
      testID={testID}
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.sm,
        { backgroundColor: pressed && !inactive ? v.pressed : v.bg, borderColor: v.border },
        inactive && !loading && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Feather name={icon} size={size === 'sm' ? 16 : 18} color={v.fg} />}
          <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: v.fg }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const variants: Record<Variant, { bg: string; pressed: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.white, border: colors.primary },
  secondary: { bg: colors.white, pressed: colors.surfaceSubtle, fg: colors.ink, border: colors.borderStrong },
  ghost: { bg: 'transparent', pressed: colors.primarySoft, fg: colors.primary, border: 'transparent' },
  danger: { bg: colors.white, pressed: colors.dangerSoft, fg: colors.danger, border: colors.borderStrong },
  /** Outline on dark photography */
  inverse: { bg: 'transparent', pressed: 'rgba(255,255,255,0.12)', fg: colors.white, border: 'rgba(255,255,255,0.6)' },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: { minHeight: 40, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: 16, fontWeight: '600' },
  labelSm: { fontSize: 14 },
  disabled: { opacity: 0.45 },
});

/** Square icon-only button with an accessible label. */
export function IconButton({
  icon,
  label,
  onPress,
  color = colors.ink,
  disabled,
}: {
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
  onPress?: () => void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={4}
      style={({ pressed }) => ({
        width: touch.min,
        height: touch.min,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.surfaceSubtle : 'transparent',
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Feather name={icon} size={22} color={color} />
    </Pressable>
  );
}
