import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from '@/theme';

const PALETTE = [colors.primary, colors.primaryTint, '#0FA383', '#B9DDD5', colors.ink];
const COUNT = 36;

/** Deterministic pseudo-random in [0, 1) so rendering stays pure. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** One restrained burst of falling paper; skipped when the user prefers reduced motion. */
export function Confetti() {
  const { width, height } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  const pieces = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x: rand(i + 1) * width,
        drift: (rand(i + 101) - 0.5) * 120,
        delay: rand(i + 201) * 0.25,
        size: 6 + rand(i + 301) * 6,
        spin: (rand(i + 401) > 0.5 ? 1 : -1) * (180 + rand(i + 501) * 360),
        color: PALETTE[i % PALETTE.length],
        ratio: rand(i + 601) > 0.5 ? 0.45 : 1,
      })),
    [width],
  );

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled || reduce) return;
        Animated.timing(progress, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      });
    return () => {
      cancelled = true;
    };
  }, [progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => {
        const local = progress.interpolate({
          inputRange: [0, p.delay, 1],
          outputRange: [0, 0, 1],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: -20,
              width: p.size,
              height: p.size * p.ratio,
              backgroundColor: p.color,
              borderRadius: 1,
              opacity: local.interpolate({ inputRange: [0, 0.01, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateY: local.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.75] }) },
                { translateX: local.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
                { rotate: local.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
