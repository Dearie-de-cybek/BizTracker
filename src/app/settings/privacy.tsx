import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, ConfirmDialog, Header, Notice, Page, ScrollScreen, SectionHeader } from '@/components';
import { useActions, useStorage } from '@/data/DataProvider';
import { clearSetupDraft } from '@/data/setupDraftStore';
import { spacing, type } from '@/theme';

export default function Privacy() {
  const actions = useActions();
  const storage = useStorage();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = async () => {
    setBusy(true);
    try {
      await clearSetupDraft(storage);
      await actions.resetAllData();
      setConfirm(false);
      router.replace('/');
    } catch {
      setError("Data couldn't be erased. Try again.");
      setBusy(false);
    }
  };

  return (
    <Page>
      <Header title="Privacy and app settings" back />
      <ScrollScreen>
        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Where your data lives" />
          <Text style={type.body}>
            Everything you enter — business details, products, customers, sales and payments — is stored only on this device. BizTracker has no account or
            server, and nothing is sent anywhere.
          </Text>
          <Text style={type.secondary}>That also means:</Text>
          <Text style={type.secondary}>• No automatic cloud backup. If the phone is lost or the app is deleted, the data is gone.</Text>
          <Text style={type.secondary}>• No syncing between phones, and no staff logins.</Text>
          <Text style={type.secondary}>• Anyone who can unlock this phone can open the app. Use your phone’s screen lock.</Text>
          <Text style={type.secondary}>Export your data regularly from More → Export data.</Text>
          <Text style={type.caption}>Onboarding photos are loaded from Unsplash the first time the app opens.</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <SectionHeader title="Reset" />
          <Text style={type.secondary}>Permanently erase all BizTracker data on this device and start again from setup.</Text>
          {error && <Notice tone="danger" message={error} />}
          <Button label="Erase all data" variant="danger" icon="trash-2" onPress={() => setConfirm(true)} />
        </View>
      </ScrollScreen>
      <ConfirmDialog
        visible={confirm}
        title="Erase all data?"
        message="All sales, products, customers and settings on this device will be deleted. This can't be undone. Export first if you need a copy."
        confirmLabel="Erase"
        destructive
        loading={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={reset}
      />
    </Page>
  );
}
