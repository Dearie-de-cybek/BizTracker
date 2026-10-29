import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/theme';

const LOGO = require('../../assets/brand/logo.png');
/** Source asset is 162×172 — keep that ratio wherever it is shown. */
const LOGO_RATIO = 162 / 172;

export function AppLogo({ height = 40 }: { height?: number }) {
  return (
    <Image
      source={LOGO}
      style={{ height, width: height * LOGO_RATIO, borderRadius: height * 0.16 }}
      contentFit="contain"
      accessibilityLabel="BizTracker"
    />
  );
}

function initials(name: string): string {
  // Skip sizes like "70g" or "1kg" so "Indomie Noodles 70g" becomes "IN"
  const words = name.trim().split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  return ((words[0]?.[0] ?? name.trim()[0] ?? '?') + (words[1]?.[0] ?? '')).toUpperCase();
}

/** Image if available, otherwise initials. Used for business logos, customers and products. */
export function Avatar({ name, uri, size = 40, square }: { name: string; uri?: string; size?: number; square?: boolean }) {
  const r = square ? radius.sm + 2 : size / 2;
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r, backgroundColor: colors.surfaceSubtle }} contentFit="cover" />;
  }
  return (
    <View
      style={{ width: size, height: size, borderRadius: r, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}
      importantForAccessibility="no"
    >
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: size * 0.38 }}>{initials(name)}</Text>
    </View>
  );
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  const canDec = value > min;
  const canInc = max == null || value < max;
  return (
    <View style={styles.stepper} accessibilityLabel={`${label} quantity ${value}`}>
      <Pressable
        onPress={() => canDec && onChange(value - 1)}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        accessibilityState={{ disabled: !canDec }}
        style={[styles.stepBtn, !canDec && { opacity: 0.35 }]}
      >
        <Feather name={value === 1 && min === 0 ? 'trash-2' : 'minus'} size={18} color={colors.ink} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        onPress={() => canInc && onChange(value + 1)}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        accessibilityState={{ disabled: !canInc }}
        style={[styles.stepBtn, !canInc && { opacity: 0.35 }]}
      >
        <Feather name="plus" size={18} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  stepBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 32, textAlign: 'center', fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'], color: colors.ink },
});
