import { useRouter } from 'expo-router';
import { forwardRef, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, ScrollViewInstance, ScrollViewProps, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, type } from '@/theme';
import { IconButton } from './Button';

/** Screen header: back button (stack screens), title, optional right action. */
export function Header({
  title,
  subtitle,
  back,
  right,
  large,
}: {
  title: string;
  subtitle?: string;
  back?: boolean | (() => void);
  right?: ReactNode;
  large?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const onBack = typeof back === 'function' ? back : () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View style={[styles.header, { paddingTop: insets.top + (large ? spacing.md : spacing.xs) }]}>
      {(!large || back || right) && (
        <View style={styles.headerRow}>
          {back ? <IconButton icon="arrow-left" label="Go back" onPress={onBack} /> : null}
          <View style={{ flex: 1, paddingLeft: back ? spacing.xs : 0 }}>
            {!large && (
              <Text style={type.heading} numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
            )}
            {!large && subtitle && <Text style={type.caption}>{subtitle}</Text>}
          </View>
          {right}
        </View>
      )}
      {large && (
        <View style={{ paddingTop: spacing.xs, paddingLeft: 8 }}>
          <Text style={type.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle && <Text style={[type.secondary, { marginTop: 2 }]}>{subtitle}</Text>}
        </View>
      )}
    </View>
  );
}

/** Scrollable form/content screen that keeps inputs above the keyboard. */
export const ScrollScreen = forwardRef<
  ScrollViewInstance,
  { children: ReactNode; footer?: ReactNode; contentStyle?: ScrollViewProps['contentContainerStyle'] } & ScrollViewProps
>(function ScrollScreen({ children, footer, contentStyle, ...rest }, ref) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={ref}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.content, contentStyle]}
        {...rest}
      >
        {children}
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
});

/** Sticky bottom action area, thumb-reachable and safe-area aware. */
export function BottomBar({ children, tabBar }: { children: ReactNode; tabBar?: boolean }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bottomBar, { paddingBottom: tabBar ? spacing.md : Math.max(insets.bottom, spacing.lg) }]}>{children}</View>;
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={type.overline} accessibilityRole="header">
        {title}
      </Text>
      {action}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: inset }} />;
}

export function Page({ children }: { children: ReactNode }) {
  return <View style={styles.page}>{children}</View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  header: { backgroundColor: colors.white, paddingHorizontal: spacing.gutter - 8, paddingBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: spacing.xs, paddingLeft: 8 },
  content: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.xxxl, gap: spacing.xl },
  bottomBar: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
});
