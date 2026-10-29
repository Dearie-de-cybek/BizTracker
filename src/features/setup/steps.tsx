import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Chip,
  ChoiceCard,
  Divider,
  FieldError,
  ImageField,
  OptionSheet,
  SelectField,
  SwitchRow,
  TextField,
} from '@/components';
import { CURRENCIES, getCurrency } from '@/domain/money';
import { BUSINESS_TYPES, COUNTRIES, getCountry, WEEKDAYS } from '@/domain/reference';
import type { SetupDraft } from '@/domain/setup';
import type { FieldErrors } from '@/domain/validation';
import { colors, spacing, type } from '@/theme';

export interface StepProps {
  draft: SetupDraft;
  update: (patch: Partial<SetupDraft>) => void;
  errors: FieldErrors<keyof SetupDraft>;
}

export function BusinessStep({ draft, update, errors }: StepProps) {
  const [sheet, setSheet] = useState<'type' | 'country' | 'currency' | null>(null);
  const country = getCountry(draft.countryCode);
  const currency = getCurrency(draft.currencyCode);
  return (
    <>
      <TextField
        label="Business name"
        value={draft.name}
        onChangeText={(name) => update({ name })}
        placeholder="e.g. Ada Fashion House"
        autoCapitalize="words"
        error={errors.name}
        returnKeyType="next"
      />
      <SelectField
        label="Type of business"
        value={BUSINESS_TYPES.find((b) => b.value === draft.type)?.label}
        placeholder="Choose a category"
        onPress={() => setSheet('type')}
        error={errors.type}
      />
      {draft.type === 'other' && (
        <TextField
          label="Describe your business"
          value={draft.typeOther}
          onChangeText={(typeOther) => update({ typeOther })}
          placeholder="e.g. Building materials"
          error={errors.typeOther}
        />
      )}
      <TextField
        label="Address or operating location"
        value={draft.address}
        onChangeText={(address) => update({ address })}
        placeholder="Street, area, city"
        autoCapitalize="words"
        error={errors.address}
      />
      <View style={styles.pair}>
        <View style={{ flex: 1.3 }}>
          <SelectField label="Country" value={country?.name} onPress={() => setSheet('country')} error={errors.countryCode} />
        </View>
        <View style={{ flex: 1 }}>
          <SelectField
            label="Currency"
            value={`${currency.code} (${currency.symbol})`}
            onPress={() => setSheet('currency')}
            error={errors.currencyCode}
          />
        </View>
      </View>
      <TextField
        label="Short description"
        optional
        value={draft.description}
        onChangeText={(description) => update({ description })}
        placeholder="What do you sell?"
        multiline
        maxLength={240}
      />

      <OptionSheet
        visible={sheet === 'type'}
        onClose={() => setSheet(null)}
        title="Type of business"
        options={BUSINESS_TYPES}
        value={draft.type}
        onSelect={(t) => update({ type: t })}
      />
      <OptionSheet
        visible={sheet === 'country'}
        onClose={() => setSheet(null)}
        title="Country"
        searchable
        options={COUNTRIES.map((c) => ({ value: c.code, label: c.name, description: c.dialCode }))}
        value={draft.countryCode}
        onSelect={(code) => update({ countryCode: code, currencyCode: getCountry(code)?.currencyCode ?? draft.currencyCode })}
      />
      <OptionSheet
        visible={sheet === 'currency'}
        onClose={() => setSheet(null)}
        title="Currency"
        searchable
        options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.name} (${c.symbol})`, description: c.code }))}
        value={draft.currencyCode}
        onSelect={(currencyCode) => update({ currencyCode })}
      />
    </>
  );
}

export function ContactStep({ draft, update, errors }: StepProps) {
  const country = getCountry(draft.countryCode);
  return (
    <>
      <TextField
        label="Business phone number"
        value={draft.phone}
        onChangeText={(phone) => update({ phone })}
        placeholder={country?.code === 'NG' ? '0803 123 4567' : `${country?.dialCode ?? '+'} …`}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        error={errors.phone}
        hint={`Local format or with country code${country ? ` (${country.dialCode})` : ''}.`}
      />
      <TextField
        label="Business email"
        optional
        value={draft.email}
        onChangeText={(email) => update({ email })}
        placeholder="hello@yourbusiness.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
      />
      <ImageField
        label="Business logo"
        hint="Shown on your receipts and dashboard. Square images work best."
        value={draft.logoUri}
        onChange={(logoUri) => update({ logoUri, receiptShowLogo: logoUri ? draft.receiptShowLogo : false })}
      />
    </>
  );
}

export function PreferencesStep({ draft, update, errors }: StepProps) {
  return (
    <>
      <View>
        <SwitchRow
          label="Track stock quantities"
          description="Stock goes down automatically with every sale."
          value={draft.trackStock}
          onValueChange={(trackStock) => update({ trackStock })}
        />
        <Divider />
        <SwitchRow
          label="Low-stock alerts"
          description="Highlight products in the app when stock runs low."
          value={draft.trackStock && draft.lowStockAlerts}
          disabled={!draft.trackStock}
          onValueChange={(lowStockAlerts) => update({ lowStockAlerts })}
        />
        {draft.trackStock && draft.lowStockAlerts && (
          <View style={styles.inlineField}>
            <TextField
              label="Alert when stock is at or below"
              value={draft.lowStockThreshold}
              onChangeText={(lowStockThreshold) => update({ lowStockThreshold: lowStockThreshold.replace(/\D/g, '') })}
              keyboardType="number-pad"
              suffix={<Text style={type.secondary}>units</Text>}
              error={errors.lowStockThreshold}
              hint="You can set a different level for each product."
              maxLength={6}
            />
          </View>
        )}
        <Divider />
        <SwitchRow
          label="Use SKUs or barcodes"
          description="Adds SKU and barcode fields to products for search. Camera scanning isn't available yet."
          value={draft.useSkus}
          onValueChange={(useSkus) => update({ useSkus })}
        />
        <Divider />
        <SwitchRow
          label="My prices already include tax"
          description="Noted on receipts. BizTracker doesn't calculate tax yet."
          value={draft.pricesIncludeTax}
          onValueChange={(pricesIncludeTax) => update({ pricesIncludeTax })}
        />
      </View>
    </>
  );
}

export function OperationsStep({ draft, update, errors }: StepProps) {
  const toggleDay = (d: SetupDraft['hoursDays'][number]) =>
    update({ hoursDays: draft.hoursDays.includes(d) ? draft.hoursDays.filter((x) => x !== d) : [...draft.hoursDays, d] });
  return (
    <>
      <TextField
        label="Owner or administrator name"
        value={draft.ownerName}
        onChangeText={(ownerName) => update({ ownerName })}
        placeholder="Your full name"
        autoCapitalize="words"
        autoComplete="name"
        error={errors.ownerName}
      />

      <View style={{ gap: spacing.md }}>
        <Text style={type.label}>How do you want to start?</Text>
        <ChoiceCard
          title="Add products now"
          description="Enter your stock right after setup."
          selected={draft.openingInventory === 'add_now'}
          onPress={() => update({ openingInventory: 'add_now' })}
        />
        <ChoiceCard
          title="Start with an empty inventory"
          description="You can add products any time from the Inventory tab."
          selected={draft.openingInventory === 'empty'}
          onPress={() => update({ openingInventory: 'empty' })}
        />
        {errors.openingInventory && <FieldError message={errors.openingInventory} />}
      </View>

      <View>
        <Text style={[type.label, { marginBottom: spacing.xs }]}>Receipts</Text>
        <SwitchRow
          label="Show business logo"
          description={draft.logoUri ? undefined : 'Add a logo in step 2 to use this.'}
          value={!!draft.logoUri && draft.receiptShowLogo}
          disabled={!draft.logoUri}
          onValueChange={(receiptShowLogo) => update({ receiptShowLogo })}
        />
        <SwitchRow label="Show address" value={draft.receiptShowAddress} onValueChange={(receiptShowAddress) => update({ receiptShowAddress })} />
        <SwitchRow label="Show phone number" value={draft.receiptShowPhone} onValueChange={(receiptShowPhone) => update({ receiptShowPhone })} />
        <View style={{ marginTop: spacing.sm }}>
          <TextField
            label="Receipt footer"
            optional
            value={draft.receiptFooter}
            onChangeText={(receiptFooter) => update({ receiptFooter })}
            placeholder="e.g. Goods bought in good condition are not returnable."
            maxLength={120}
          />
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        <SwitchRow
          label="Opening hours"
          description="Optional. Shown on receipts."
          value={draft.hoursEnabled}
          onValueChange={(hoursEnabled) => update({ hoursEnabled })}
        />
        {draft.hoursEnabled && (
          <>
            <View style={styles.days}>
              {WEEKDAYS.map((d) => (
                <Chip key={d.value} label={d.short} selected={draft.hoursDays.includes(d.value)} onPress={() => toggleDay(d.value)} />
              ))}
            </View>
            {errors.hoursDays && <FieldError message={errors.hoursDays} />}
            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Opens"
                  value={draft.hoursOpens}
                  onChangeText={(hoursOpens) => update({ hoursOpens })}
                  placeholder="08:00"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  error={errors.hoursOpens}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Closes"
                  value={draft.hoursCloses}
                  onChangeText={(hoursCloses) => update({ hoursCloses })}
                  placeholder="19:00"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  error={errors.hoursCloses}
                />
              </View>
            </View>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  inlineField: { paddingBottom: spacing.md, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.primaryTint, marginBottom: spacing.sm },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
