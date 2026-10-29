import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLogo } from '@/components';
import { SETUP_STEPS } from '@/domain/setup';
import { colors, spacing, type } from '@/theme';

/** Header for the setup flow: brand, step count, segmented progress and title. */
export function SetupProgress({ step, title, subtitle }: { step: number | null; title: string; subtitle?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.top}>
        <AppLogo height={28} />
        {step != null && (
          <Text style={type.label} accessibilityLiveRegion="polite">
            Step {step + 1} of {SETUP_STEPS.length}
          </Text>
        )}
      </View>
      {step != null && (
        <View
          style={styles.bars}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: SETUP_STEPS.length, now: step + 1 }}
          accessibilityLabel={`Setup step ${step + 1} of ${SETUP_STEPS.length}`}
        >
          {SETUP_STEPS.map((s, i) => (
            <View key={s.short} style={{ flex: 1, gap: 6 }}>
              <View style={[styles.bar, i <= step && styles.barActive]} />
              <Text style={[styles.barLabel, i === step && { color: colors.primary, fontWeight: '600' }]} numberOfLines={1}>
                {s.short}
              </Text>
            </View>
          ))}
        </View>
      )}
      <Text style={[type.title, { marginTop: spacing.lg }]} accessibilityRole="header">
        {title}
      </Text>
      {subtitle && <Text style={[type.secondary, { marginTop: spacing.xs }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.lg, backgroundColor: colors.white },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.border },
  barActive: { backgroundColor: colors.primary },
  barLabel: { fontSize: 12, color: colors.inkMuted },
});
