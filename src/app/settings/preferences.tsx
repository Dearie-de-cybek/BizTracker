import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { BottomBar, Button, Divider, Header, Notice, Page, ScrollScreen, SectionHeader, SwitchRow, TextField } from '@/components';
import { useActions, useBusiness } from '@/data/DataProvider';
import { parseQuantity } from '@/domain/validation';
import { spacing, type } from '@/theme';
import { goBack } from '@/utils/navigation';

export default function Preferences() {
  const { settings } = useBusiness();
  const actions = useActions();
  const router = useRouter();
  const [trackStock, setTrackStock] = useState(settings.trackStock);
  const [lowStockAlerts, setLowStockAlerts] = useState(settings.lowStockAlerts);
  const [threshold, setThreshold] = useState(String(settings.lowStockThreshold));
  const [useSkus, setUseSkus] = useState(settings.useSkus);
  const [pricesIncludeTax, setPricesIncludeTax] = useState(settings.pricesIncludeTax);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const t = parseQuantity(threshold);

  const save = async () => {
    if (trackStock && lowStockAlerts && t == null) return setError('Enter a whole number for the low-stock level.');
    setSaving(true);
    try {
      await actions.updateSettings({
        trackStock,
        lowStockAlerts: trackStock && lowStockAlerts,
        lowStockThreshold: t ?? settings.lowStockThreshold,
        useSkus,
        pricesIncludeTax,
      });
      goBack(router);
    } catch {
      setError("Changes couldn't be saved. Try again.");
      setSaving(false);
    }
  };

  return (
    <Page>
      <Header title="Sales and inventory" back />
      <ScrollScreen
        footer={
          <BottomBar>
            {error && <Notice tone="danger" message={error} />}
            <Button label="Save changes" onPress={save} loading={saving} />
          </BottomBar>
        }
      >
        <View>
          <SectionHeader title="Sales" />
          <SwitchRow
            label="Prices include tax"
            description="Shown on receipts. BizTracker doesn't calculate tax yet."
            value={pricesIncludeTax}
            onValueChange={setPricesIncludeTax}
          />
          <Text style={type.caption}>Payment methods: cash, bank transfer, POS and other — all recorded manually.</Text>
        </View>

        <View>
          <SectionHeader title="Inventory" />
          <SwitchRow label="Track stock quantities" description="Sales reduce stock and can't exceed what you have." value={trackStock} onValueChange={setTrackStock} />
          {settings.trackStock && !trackStock && (
            <Notice tone="warning" message="While tracking is off, sales won't reduce stock, so quantities will be out of date if you turn it back on. Use “Set count” to correct them." />
          )}
          <Divider />
          <SwitchRow label="Use SKUs and barcodes" description="Typed in manually. Camera scanning isn't available yet." value={useSkus} onValueChange={setUseSkus} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Low-stock alerts" />
          <SwitchRow
            label="Highlight low stock"
            description="Shown on Home and Inventory. Push notifications aren't available yet."
            value={trackStock && lowStockAlerts}
            disabled={!trackStock}
            onValueChange={setLowStockAlerts}
          />
          {trackStock && lowStockAlerts && (
            <TextField
              label="Default low-stock level"
              value={threshold}
              onChangeText={(v) => setThreshold(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              hint="Products can override this on their edit screen."
              error={t == null ? 'Enter a whole number.' : undefined}
            />
          )}
        </View>
      </ScrollScreen>
    </Page>
  );
}
