import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomBar, Button, KeyValue, Notice, Page, ScrollScreen } from '@/components';
import { useActions, useDb } from '@/data/DataProvider';
import { getCurrency } from '@/domain/money';
import { businessTypeLabel, getCountry, WEEKDAYS } from '@/domain/reference';
import { firstInvalidStep, SETUP_STEPS } from '@/domain/setup';
import { ValidationError } from '@/domain/validation';
import { useSetupDraft } from '@/features/setup/SetupDraftContext';
import { SetupProgress } from '@/features/setup/SetupProgress';
import { colors, radius, spacing, type } from '@/theme';
import { goBack } from '@/utils/navigation';

const yesNo = (v: boolean) => (v ? 'Yes' : 'No');

export default function SetupReview() {
  const db = useDb();
  const router = useRouter();
  const actions = useActions();
  const { draft, update, clear, setReturnToReview } = useSetupDraft();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (db.setupCompletedAt) return <Redirect href="/setup/success" />;

  const edit = (step: number) => {
    setReturnToReview(true);
    update({ step });
    if (router.canGoBack()) goBack(router);
    else router.replace('/setup');
  };

  const confirm = async () => {
    const bad = firstInvalidStep(draft);
    if (bad !== -1) {
      setError(`Some details in “${SETUP_STEPS[bad].title}” are missing or invalid.`);
      edit(bad);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await actions.completeSetup(draft);
      await clear();
      router.replace('/setup/success');
    } catch (e) {
      setError(
        e instanceof ValidationError
          ? e.message
          : "We couldn't save your business details on this device. Check that your phone has free storage, then try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const country = getCountry(draft.countryCode);
  const currency = getCurrency(draft.currencyCode);
  const hours = draft.hoursEnabled
    ? `${WEEKDAYS.filter((d) => draft.hoursDays.includes(d.value)).map((d) => d.short).join(', ')} · ${draft.hoursOpens}–${draft.hoursCloses}`
    : 'Not set';

  return (
    <Page>
      <SetupProgress step={null} title="Review your details" subtitle="Check everything before we set up your business." />
      <ScrollScreen
        footer={
          <BottomBar>
            {error && <Notice tone="danger" title="Not saved" message={error} />}
            <Button label={error ? 'Try again' : 'Confirm and finish'} onPress={confirm} loading={saving} />
          </BottomBar>
        }
      >
        <Section title="Business" onEdit={() => edit(0)}>
          <KeyValue label="Name" value={draft.name} />
          <KeyValue label="Type" value={draft.type ? businessTypeLabel(draft.type, draft.typeOther) : '—'} />
          <KeyValue label="Location" value={draft.address} />
          <KeyValue label="Country" value={country?.name ?? '—'} />
          <KeyValue label="Currency" value={`${currency.name} (${currency.symbol})`} />
          {!!draft.description.trim() && <KeyValue label="Description" value={draft.description.trim()} />}
        </Section>

        <Section title="Contact and logo" onEdit={() => edit(1)}>
          <KeyValue label="Phone" value={draft.phone} />
          <KeyValue label="Email" value={draft.email.trim() || 'Not provided'} muted={!draft.email.trim()} />
          <View style={styles.logoRow}>
            <Text style={type.secondary}>Logo</Text>
            {draft.logoUri ? (
              <Image source={{ uri: draft.logoUri }} style={styles.logo} contentFit="cover" accessibilityLabel="Business logo" />
            ) : (
              <Text style={[type.body, { color: colors.inkMuted }]}>Not added</Text>
            )}
          </View>
        </Section>

        <Section title="Inventory and sales" onEdit={() => edit(2)}>
          <KeyValue label="Track stock" value={yesNo(draft.trackStock)} />
          <KeyValue
            label="Low-stock alerts"
            value={draft.trackStock && draft.lowStockAlerts ? `At ${draft.lowStockThreshold} units or below` : 'Off'}
          />
          <KeyValue label="SKUs / barcodes" value={yesNo(draft.useSkus)} />
          <KeyValue label="Prices include tax" value={yesNo(draft.pricesIncludeTax)} />
        </Section>

        <Section title="Owner and operations" onEdit={() => edit(3)}>
          <KeyValue label="Owner" value={draft.ownerName} />
          <KeyValue label="Start with" value={draft.openingInventory === 'add_now' ? 'Adding products now' : 'Empty inventory'} />
          <KeyValue label="Opening hours" value={hours} muted={!draft.hoursEnabled} />
          <KeyValue
            label="Receipt shows"
            value={
              [draft.logoUri && draft.receiptShowLogo && 'Logo', draft.receiptShowAddress && 'Address', draft.receiptShowPhone && 'Phone']
                .filter(Boolean)
                .join(', ') || 'Business name only'
            }
          />
        </Section>

        <Text style={type.caption}>
          Your data is stored on this device only. See More → Privacy for what that means.
        </Text>
      </ScrollScreen>
    </Page>
  );
}

function Section({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={type.heading}>{title}</Text>
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Edit ${title}`} hitSlop={12} style={styles.edit}>
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.lg },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  edit: { minHeight: 40, minWidth: 48, alignItems: 'flex-end', justifyContent: 'center' },
  editText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  logoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  logo: { width: 44, height: 44, borderRadius: radius.sm },
});
