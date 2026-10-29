import { useState } from 'react';
import { Platform, Share } from 'react-native';

import { Header, ListRow, Notice, Page, ScrollScreen } from '@/components';
import { useDb } from '@/data/DataProvider';
import { customersCsv, productsCsv, salesCsv } from '@/domain/exportCsv';
import type { DbState } from '@/domain/types';
import { plural } from '@/utils/format';

async function shareCsv(filename: string, csv: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: filename, message: csv });
}

export default function ExportData() {
  const state = useDb();
  const [message, setMessage] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);
  const date = new Date().toISOString().slice(0, 10);

  const run = async (name: string, build: (s: DbState) => string) => {
    setMessage(null);
    try {
      await shareCsv(`biztracker-${name}-${date}.csv`, build(state));
    } catch {
      setMessage({ tone: 'danger', text: "Export couldn't be shared from this device." });
    }
  };

  return (
    <Page>
      <Header title="Export data" back />
      <ScrollScreen contentStyle={{ paddingHorizontal: 0 }}>
        <ListRow icon="shopping-cart" title="Sales" subtitle={`${plural(state.sales.length, 'sale')} · one row per item`} onPress={() => run('sales', salesCsv)} disabled={!state.sales.length} />
        <ListRow icon="package" title="Products" subtitle={plural(state.products.length, 'product')} onPress={() => run('products', productsCsv)} disabled={!state.products.length} />
        <ListRow icon="users" title="Customers" subtitle={plural(state.customers.length, 'customer')} onPress={() => run('customers', customersCsv)} disabled={!state.customers.length} />
        <Notice
          tone={message?.tone ?? 'info'}
          message={
            message?.text ??
            'Exports are CSV files you can open in Excel or Google Sheets. On a phone they open the share menu so you can send them to yourself. This is not an automatic backup.'
          }
        />
      </ScrollScreen>
    </Page>
  );
}
