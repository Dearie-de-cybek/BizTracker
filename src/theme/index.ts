import { Platform, TextStyle } from 'react-native';

export const colors = {
  // Brand
  primary: '#087F68',
  primaryPressed: '#066A57',
  primaryTint: '#087F6833',
  /** Opaque equivalent of the translucent tint on white, for solid fills */
  primarySoft: '#E6F2EF',
  white: '#FFFFFF',

  // Neutrals (slightly green-tinted so they sit with the brand colour)
  ink: '#15211E',
  inkSecondary: '#4F5E5A',
  inkMuted: '#7D8A87',
  border: '#E2E7E5',
  borderStrong: '#C9D1CE',
  surfaceSubtle: '#F5F7F6',

  // Functional
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  warning: '#9A5B00',
  warningSoft: '#FFF4E0',
  success: '#087F68',

  overlay: 'rgba(8, 14, 12, 0.55)',
  scrim: 'rgba(15, 25, 22, 0.4)',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  gutter: 20,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.6, color: colors.ink },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3, color: colors.ink },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: colors.ink },
  body: { fontSize: 15, lineHeight: 21, color: colors.ink },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: colors.ink },
  secondary: { fontSize: 14, lineHeight: 19, color: colors.inkSecondary },
  caption: { fontSize: 13, lineHeight: 17, color: colors.inkMuted },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '600', color: colors.inkSecondary },
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  amountLarge: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8, color: colors.ink, ...tabular },
  amount: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: colors.ink, ...tabular },
} satisfies Record<string, TextStyle>;

export const hairline = Platform.select({ web: 1, default: 1 }) as number;

/** Minimum touch target (Android 48dp / iOS 44pt) */
export const touch = { min: 48 } as const;

export const theme = { colors, spacing, radius, type, touch };
