import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BottomBar, Button, Divider, Header, Notice, Page, ScrollScreen, SwitchRow, TextField } from '@/components';
import { useActions, useBusiness } from '@/data/DataProvider';
import { goBack } from '@/utils/navigation';

export default function ReceiptSettings() {
  const { business, settings } = useBusiness();
  const actions = useActions();
  const router = useRouter();
  const [r, setR] = useState(settings.receipt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    try {
      await actions.updateSettings({ receipt: { ...r, footerMessage: r.footerMessage.trim() } });
      goBack(router);
    } catch {
      setError("Changes couldn't be saved. Try again.");
      setSaving(false);
    }
  };

  return (
    <Page>
      <Header title="Receipt settings" back />
      <ScrollScreen
        footer={
          <BottomBar>
            {error && <Notice tone="danger" message={error} />}
            <Button label="Save changes" onPress={save} loading={saving} />
          </BottomBar>
        }
      >
        <View>
          <SwitchRow
            label="Show business logo"
            description={business.logoUri ? undefined : 'Add a logo in Business profile first.'}
            value={!!business.logoUri && r.showLogo}
            disabled={!business.logoUri}
            onValueChange={(showLogo) => setR({ ...r, showLogo })}
          />
          <Divider />
          <SwitchRow label="Show address" value={r.showAddress} onValueChange={(showAddress) => setR({ ...r, showAddress })} />
          <Divider />
          <SwitchRow label="Show phone number" value={r.showPhone} onValueChange={(showPhone) => setR({ ...r, showPhone })} />
        </View>
        <TextField
          label="Footer message"
          optional
          value={r.footerMessage}
          onChangeText={(footerMessage) => setR({ ...r, footerMessage })}
          maxLength={120}
          placeholder="e.g. Thank you for your patronage."
        />
        <Notice message="Receipts can be viewed in the app and shared as text (WhatsApp, SMS, email). Printing isn't supported yet." />
      </ScrollScreen>
    </Page>
  );
}
