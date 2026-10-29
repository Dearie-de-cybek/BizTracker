import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { BottomBar, Button, Header, Notice, Page, ScrollScreen, TextField } from '@/components';
import { useActions, useDb } from '@/data/DataProvider';
import type { CustomerField } from '@/domain/catalog';
import { FieldErrors, ValidationError } from '@/domain/validation';
import { goBack } from '@/utils/navigation';

export default function CustomerForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { customers } = useDb();
  const actions = useActions();
  const router = useRouter();
  const existing = id ? customers.find((c) => c.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [errors, setErrors] = useState<FieldErrors<CustomerField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setErrors({});
    setFormError(null);
    const input = { name, phone, email, address, note };
    try {
      if (existing) {
        await actions.updateCustomer(existing.id, input);
        goBack(router);
      } else {
        const c = await actions.createCustomer(input);
        router.replace({ pathname: '/customer/[id]', params: { id: c.id } });
      }
    } catch (e) {
      if (e instanceof ValidationError) setErrors(e.fields as FieldErrors<CustomerField>);
      else setFormError("The customer couldn't be saved. Try again.");
      setSaving(false);
    }
  };

  return (
    <Page>
      <Header title={existing ? 'Edit customer' : 'New customer'} back />
      <ScrollScreen
        footer={
          <BottomBar>
            {formError && <Notice tone="danger" message={formError} />}
            <Button label={existing ? 'Save changes' : 'Add customer'} onPress={save} loading={saving} />
          </BottomBar>
        }
      >
        <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="e.g. Chioma Okafor" error={errors.name} autoComplete="name" />
        <TextField label="Phone number" optional value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} autoComplete="tel" />
        <TextField label="Email" optional value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
        <TextField label="Address" optional value={address} onChangeText={setAddress} autoCapitalize="words" />
        <TextField label="Note" optional value={note} onChangeText={setNote} multiline placeholder="e.g. Prefers delivery on Saturdays" maxLength={240} />
      </ScrollScreen>
    </Page>
  );
}
