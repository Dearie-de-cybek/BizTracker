import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLogo, Avatar, Divider, ListRow, SectionHeader } from '@/components';
import { useBusiness } from '@/data/DataProvider';
import { businessTypeLabel } from '@/domain/reference';
import { colors, spacing, type } from '@/theme';

export default function More() {
  const { business, settings } = useBusiness();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.white }} contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl }}>
      <Text style={[type.title, styles.pad]} accessibilityRole="header">
        More
      </Text>

      <ListRow
        left={<Avatar name={business.name} uri={business.logoUri} size={48} square />}
        title={business.name}
        subtitle={`${businessTypeLabel(business.type, business.typeOther)} · ${business.ownerName}`}
        onPress={() => router.push('/settings/business')}
      />

      <Group title="Business">
        <ListRow icon="briefcase" title="Business profile" subtitle="Name, contact and logo" onPress={() => router.push('/settings/business')} />
        <ListRow icon="file-text" title="Receipt settings" subtitle="What appears on receipts" onPress={() => router.push('/settings/receipt')} />
      </Group>

      <Group title="Sales and inventory">
        <ListRow
          icon="shopping-cart"
          title="Sales preferences"
          subtitle={settings.pricesIncludeTax ? 'Prices include tax' : 'Prices exclude tax'}
          onPress={() => router.push('/settings/preferences')}
        />
        <ListRow
          icon="package"
          title="Inventory preferences"
          subtitle={settings.trackStock ? `Tracking stock${settings.useSkus ? ' · SKUs on' : ''}` : 'Stock tracking off'}
          onPress={() => router.push('/settings/preferences')}
        />
        <ListRow
          icon="bell"
          title="Low-stock alerts"
          subtitle={settings.trackStock && settings.lowStockAlerts ? `In-app, at ${settings.lowStockThreshold} units or below` : 'Off'}
          onPress={() => router.push('/settings/preferences')}
        />
      </Group>

      <Group title="Data">
        <ListRow icon="download" title="Export data" subtitle="Sales, products and customers as CSV" onPress={() => router.push('/settings/export')} />
      </Group>

      <Group title="Coming later">
        <ListRow icon="users" title="Team and staff" subtitle="Staff accounts and permissions aren't available yet" disabled chevron={false} />
        <ListRow icon="cloud" title="Cloud backup and sync" subtitle="Not available yet — data stays on this device" disabled chevron={false} />
      </Group>

      <Group title="Support">
        <ListRow icon="help-circle" title="Help and support" onPress={() => router.push('/settings/help')} />
        <ListRow icon="shield" title="Privacy and app settings" subtitle="Where your data is stored, reset" onPress={() => router.push('/settings/privacy')} />
      </Group>

      <View style={styles.footer}>
        <AppLogo height={28} />
        <Text style={type.caption}>BizTracker {Constants.expoConfig?.version ?? ''}</Text>
      </View>
    </ScrollView>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.xl }}>
      <View style={styles.pad}>
        <SectionHeader title={title} />
      </View>
      <Divider />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: spacing.gutter, marginBottom: spacing.xs },
  footer: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxxl },
});
