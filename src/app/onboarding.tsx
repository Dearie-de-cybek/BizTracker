import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLogo, Button } from '@/components';
import { useActions } from '@/data/DataProvider';
import { colors, radius, spacing } from '@/theme';

// Photographs from Unsplash (Unsplash License). Loaded remotely and cached on disk.
const photo = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&w=1600&q=70`;

const SLIDES = [
  {
    key: 'sales',
    title: 'Track Sales Effortlessly',
    body: 'Record every sale in seconds and keep your daily business moving without the paperwork.',
    image: photo('1556742049-0cfed4f6a45d'),
    alt: 'A shop owner serving a customer at a checkout counter',
    position: 'left' as const,
    dim: 0.5,
  },
  {
    key: 'inventory',
    title: 'Manage Inventory and Customers',
    body: "Know what's in stock, what's selling, and every customer's history, all in one place.",
    image: photo('1764795850513-fa8a469a4600'),
    alt: 'A shop worker checking stock on shelves with a tablet',
    position: 'left' as const,
    dim: 0.45,
  },
  {
    key: 'profit',
    title: 'Understand Profit and Grow Your Business',
    body: 'See clear analytics, understand your profit, and make smarter decisions for what comes next.',
    image: photo('1774977868322-4731ee449606'),
    alt: 'A trader writing up records at a market stall',
    position: 'center' as const,
    // Already a dark photo; lighter overlay keeps the subject visible
    dim: 0.28,
  },
];

export default function Onboarding() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useActions();
  const list = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const last = index === SLIDES.length - 1;

  useEffect(() => {
    Image.prefetch(SLIDES.map((s) => s.image), 'disk').catch(() => undefined);
  }, []);

  const goTo = (i: number) => {
    list.current?.scrollToOffset({ offset: i * width, animated: true });
    setIndex(i);
  };

  const finish = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      await completeOnboarding();
    } finally {
      // Even if the flag can't be saved, continue to setup; onboarding will just show again next launch.
      router.replace('/setup');
    }
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        keyExtractor={(s) => s.key}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            <Image
              source={{ uri: item.image }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition={item.position}
              cachePolicy="disk"
              transition={250}
              accessibilityLabel={item.alt}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(8, 14, 12, ${item.dim})` }]} />
          </View>
        )}
      />

      {/* Fixed chrome on top of the photos */}
      <View style={[styles.top, { paddingTop: insets.top + spacing.md }]} pointerEvents="box-none">
        <View style={styles.brand}>
          <AppLogo height={34} />
          <Text style={styles.brandName}>BizTracker</Text>
        </View>
        {!last && (
          <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="Skip introduction" hitSlop={12} style={styles.skip}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm }]} pointerEvents="box-none">
        <View
          style={styles.progress}
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}
          accessibilityValue={{ min: 1, max: SLIDES.length, now: index + 1 }}
        >
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.bar, i <= index && styles.barActive]} />
          ))}
          <Text style={styles.stepText}>
            {index + 1} of {SLIDES.length}
          </Text>
        </View>

        <Text style={[styles.title, width < 360 && { fontSize: 28, lineHeight: 33 }]} accessibilityRole="header">
          {SLIDES[index].title}
        </Text>
        <Text style={styles.body}>{SLIDES[index].body}</Text>

        <View style={styles.actions}>
          {index > 0 && (
            <Button
              label="Back"
              variant="inverse"
              onPress={() => goTo(index - 1)}
              style={styles.backBtn}
            />
          )}
          <Button
            label={last ? 'Get Started' : 'Next'}
            icon={last ? undefined : 'arrow-right'}
            onPress={() => (last ? finish() : goTo(index + 1))}
            loading={leaving}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E1513' },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandName: { color: colors.white, fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  skip: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
  },
  skipText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.gutter, gap: spacing.md },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  bar: { width: 28, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  barActive: { backgroundColor: colors.white },
  stepText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginLeft: spacing.sm },
  title: { color: colors.white, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8, maxWidth: 480 },
  body: { color: 'rgba(255,255,255,0.9)', fontSize: 16, lineHeight: 23, maxWidth: 440 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  backBtn: { minWidth: 96 },
});
