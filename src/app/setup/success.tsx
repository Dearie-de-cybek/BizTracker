import Feather from '@expo/vector-icons/Feather';
import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, BottomBar, Button, Page } from '@/components';
import { Confetti } from '@/components/Confetti';
import { useDb } from '@/data/DataProvider';
import { colors, spacing, type } from '@/theme';

/** Only reachable after the business has been saved. */
export default function SetupSuccess() {
  const { business, settings, setupCompletedAt } = useDb();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!setupCompletedAt || !business) return <Redirect href="/setup" />;
  const addNow = settings?.openingInventory === 'add_now';

  return (
    <Page>
      <View style={[styles.body, { paddingTop: insets.top + spacing.xxxl }]}>
        <View style={styles.mark}>
          {business.logoUri ? (
            <Avatar name={business.name} uri={business.logoUri} size={72} square />
          ) : (
            <Feather name="check" size={34} color={colors.white} />
          )}
        </View>
        <Text style={[type.overline, { color: colors.primary }]}>You’re all set</Text>
        <Text style={[type.display, styles.center]} accessibilityRole="header">
          {business.name} is ready
        </Text>
        <Text style={[type.secondary, styles.center, { maxWidth: 340 }]}>
          Your business details are saved on this device.{' '}
          {addNow ? 'Add your products to start recording sales.' : 'You can start recording sales and add products whenever you like.'}
        </Text>
      </View>
      <Confetti />
      <BottomBar>
        {addNow && (
          <Button
            label="Add your first product"
            icon="plus"
            onPress={() => {
              router.replace('/(tabs)/inventory');
              router.push('/product/form');
            }}
          />
        )}
        <Button
          label="Continue to Dashboard"
          variant={addNow ? 'secondary' : 'primary'}
          onPress={() => router.replace('/(tabs)')}
        />
      </BottomBar>
    </Page>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.gutter, gap: spacing.md },
  mark: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  center: { textAlign: 'center' },
});
