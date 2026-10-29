import { StyleSheet, Text, View } from 'react-native';

import type { Money } from '@/domain/types';
import { colors, radius, spacing, type } from '@/theme';
import { weekdayShort } from '@/utils/format';

/** Seven-day revenue bars. Text summary carries the meaning; bars are supporting. */
export function SalesTrend({
  days,
  format,
}: {
  days: { date: Date; revenue: Money; count: number }[];
  format: (m: Money, o?: { compact?: boolean }) => string;
}) {
  const max = Math.max(...days.map((d) => d.revenue), 1);
  const total = days.reduce((a, d) => a + d.revenue, 0);
  const best = days.reduce((a, d) => (d.revenue > a.revenue ? d : a), days[0]);
  const bestLabel = best.date.toLocaleDateString(undefined, { weekday: 'long' });
  return (
    <View
      accessible
      accessibilityLabel={`Last 7 days: ${format(total)} in sales. Best day ${bestLabel}, ${format(best.revenue)}.`}
    >
      <View style={styles.head}>
        <Text style={type.heading}>{format(total)}</Text>
        <Text style={type.caption}>
          Best day: {bestLabel} · {format(best.revenue, { compact: true })}
        </Text>
      </View>
      <View style={styles.chart}>
        {days.map((d, i) => {
          const today = i === days.length - 1;
          const h = d.revenue === 0 ? 2 : Math.max(6, Math.round((d.revenue / max) * 88));
          return (
            <View key={d.date.toISOString()} style={styles.col}>
              <View style={styles.track}>
                <View style={[styles.bar, { height: h, backgroundColor: today ? colors.primary : colors.primaryTint }]} />
              </View>
              <Text style={[styles.day, today && { color: colors.primary, fontWeight: '700' }]}>{weekdayShort(d.date)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { gap: 2, marginBottom: spacing.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  track: { height: 90, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: '70%', maxWidth: 28, borderRadius: radius.sm - 2 },
  day: { fontSize: 12, color: colors.inkMuted },
});
