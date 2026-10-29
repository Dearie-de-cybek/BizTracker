import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BottomBar, Button, Header, ImageField, Notice, OptionSheet, Page, ScrollScreen, SelectField, TextField } from '@/components';
import { useActions, useBusiness } from '@/data/DataProvider';
import { BUSINESS_TYPES } from '@/domain/reference';
import type { BusinessType } from '@/domain/types';
import { cleanOptional, isValidEmail, isValidPhone } from '@/domain/validation';
import { spacing } from '@/theme';
import { goBack } from '@/utils/navigation';

/** Edit the business profile. Country and currency are fixed after setup because past sales are recorded in that currency. */
export default function BusinessProfile() {
  const { business } = useBusiness();
  const actions = useActions();
  const router = useRouter();
  const [name, setName] = useState(business.name);
  const [type, setType] = useState<BusinessType>(business.type);
  const [typeOther, setTypeOther] = useState(business.typeOther ?? '');
  const [address, setAddress] = useState(business.address);
  const [phone, setPhone] = useState(business.phone);
  const [email, setEmail] = useState(business.email ?? '');
  const [ownerName, setOwnerName] = useState(business.ownerName);
  const [description, setDescription] = useState(business.description ?? '');
  const [logoUri, setLogoUri] = useState<string | null>(business.logoUri ?? null);
  const [sheet, setSheet] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const save = async () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Enter your business name.';
    if (!address.trim()) e.address = 'Enter your location.';
    if (!isValidPhone(phone)) e.phone = 'Enter a valid phone number.';
    if (email.trim() && !isValidEmail(email)) e.email = 'Enter a valid email.';
    if (ownerName.trim().length < 2) e.ownerName = 'Enter the owner name.';
    if (type === 'other' && !typeOther.trim()) e.typeOther = 'Describe your business.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await actions.updateBusiness({
        name: name.trim(),
        type,
        typeOther: type === 'other' ? typeOther.trim() : undefined,
        address: address.trim(),
        phone: phone.trim(),
        email: cleanOptional(email),
        ownerName: ownerName.trim(),
        description: cleanOptional(description),
        logoUri: logoUri ?? undefined,
      });
      goBack(router);
    } catch {
      setFormError("Changes couldn't be saved. Try again.");
      setSaving(false);
    }
  };

  return (
    <Page>
      <Header title="Business profile" back />
      <ScrollScreen
        footer={
          <BottomBar>
            {formError && <Notice tone="danger" message={formError} />}
            <Button label="Save changes" onPress={save} loading={saving} />
          </BottomBar>
        }
      >
        <ImageField label="Business logo" value={logoUri} onChange={setLogoUri} />
        <TextField label="Business name" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" />
        <SelectField label="Type of business" value={BUSINESS_TYPES.find((b) => b.value === type)?.label} onPress={() => setSheet(true)} />
        {type === 'other' && <TextField label="Describe your business" value={typeOther} onChangeText={setTypeOther} error={errors.typeOther} />}
        <TextField label="Address or location" value={address} onChangeText={setAddress} error={errors.address} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
          </View>
        </View>
        <TextField label="Email" optional value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
        <TextField label="Owner or administrator" value={ownerName} onChangeText={setOwnerName} error={errors.ownerName} />
        <TextField label="Description" optional value={description} onChangeText={setDescription} multiline maxLength={240} />
        <Notice message={`Country and currency (${business.currencyCode}) can't be changed after setup, because existing sales were recorded in this currency.`} />
      </ScrollScreen>
      <OptionSheet visible={sheet} onClose={() => setSheet(false)} title="Type of business" options={BUSINESS_TYPES} value={type} onSelect={setType} />
    </Page>
  );
}
