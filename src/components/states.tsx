import Feather from '@expo/vector-icons/Feather';
import { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { StockLevel } from '@/domain/analytics';
import type { PaymentStatus } from '@/domain/types';
import { colors, radius, spacing, type } from '@/theme';
import { Button } from './Button';

type IconName = ComponentProps<typeof Feather>['name'];

export function EmptyState({
  icon,
  title,
  body,
  children,
  compact,
}: {
  icon: IconName;
  title: string;
  body?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={[styles.empty, compact && { paddingVertical: spacing.xl }]}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={[type.heading, { textAlign: 'center' }]}>{title}</Text>
      {body && <Text style={[type.secondary, styles.emptyBody]}>{body}</Text>}
      {children && <View style={styles.emptyActions}>{children}</View>}
    </View>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.primary} />
      <Text style={type.secondary}>{label}</Text>
    </View>
  );
}

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Feather name="alert-triangle" size={28} color={colors.danger} />
      <Text style={[type.heading, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.secondary, { textAlign: 'center' }]}>{message}</Text>
      {onRetry && <Button label="Try again" onPress={onRetry} variant="secondary" />}
    </View>
  );
}

/** Inline banner for errors/warnings/info inside a screen. */
export function Notice({
  tone = 'info',
  title,
  message,
  action,
}: {
  tone?: 'info' | 'warning' | 'danger';
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  const t = {
    info: { bg: colors.surfaceSubtle, fg: colors.inkSecondary, icon: 'info' as const },
    warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'alert-triangle' as const },
    danger: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' as const },
  }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t.bg }]} accessibilityRole={tone === 'info' ? undefined : 'alert'}>
      <Feather name={t.icon} size={18} color={t.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {title && <Text style={[type.bodyStrong, { color: tone === 'info' ? colors.ink : t.fg }]}>{title}</Text>}
        <Text style={[type.secondary, tone !== 'info' && { color: colors.ink }]}>{message}</Text>
        {action}
      </View>
    </View>
  );
}

const paymentBadge: Record<PaymentStatus, { label: string; fg: string; bg: string; icon: IconName }> = {
  paid: { label: 'Paid', fg: colors.primary, bg: colors.primarySoft, icon: 'check' },
  partial: { label: 'Part paid', fg: colors.warning, bg: colors.warningSoft, icon: 'clock' },
  unpaid: { label: 'Unpaid', fg: colors.danger, bg: colors.dangerSoft, icon: 'alert-circle' },
};

const stockBadge: Record<Exclude<StockLevel, 'ok' | 'untracked'>, { label: string; fg: string; bg: string; icon: IconName }> = {
  low: { label: 'Low stock', fg: colors.warning, bg: colors.warningSoft, icon: 'trending-down' },
  out: { label: 'Out of stock', fg: colors.danger, bg: colors.dangerSoft, icon: 'slash' },
};

/** Status pill with icon + text so meaning never depends on colour alone. */
export function StatusBadge({ status }: { status: PaymentStatus | StockLevel }) {
  if (status === 'ok' || status === 'untracked') return null;
  const b = status in paymentBadge ? paymentBadge[status as PaymentStatus] : stockBadge[status as 'low' | 'out'];
  return (
    <View style={[styles.badge, { backgroundColor: b.bg }]} accessibilityLabel={b.label}>
      <Feather name={b.icon} size={12} color={b.fg} />
      <Text style={[styles.badgeText, { color: b.fg }]}>{b.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl + 8, paddingHorizontal: spacing.lg, gap: spacing.sm },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyBody: { textAlign: 'center', maxWidth: 320 },
  emptyActions: { marginTop: spacing.md, gap: spacing.sm, alignSelf: 'stretch', maxWidth: 360, width: '100%', marginHorizontal: 'auto' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl, backgroundColor: colors.white },
  notice: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
