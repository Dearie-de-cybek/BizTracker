import { StyleSheet, Text, View } from 'react-native';

import { Header, Page, ScrollScreen } from '@/components';
import { colors, spacing, type } from '@/theme';

const FAQ = [
  {
    q: 'How is profit calculated?',
    a: 'Gross profit is sales revenue after discounts, minus the cost price of the items sold. The cost is saved with each sale, so editing a product later doesn’t change past figures. If any item sold has no cost price, BizTracker shows “Needs cost prices” instead of guessing.',
  },
  {
    q: 'What is the difference between revenue and received?',
    a: 'Revenue is the total value of sales. Received is the money customers actually paid in that period. They differ when a customer pays part now and the rest later.',
  },
  {
    q: 'Does BizTracker take card or transfer payments?',
    a: 'No. You take payment the usual way (cash, transfer, POS terminal) and BizTracker records it. Always confirm a transfer in your bank app before completing the sale.',
  },
  {
    q: 'How do I correct stock?',
    a: 'Open the product and tap “Adjust stock”. Choose Add, Remove or Set count, and a reason. Every change is kept in the stock history.',
  },
  {
    q: 'Can I undo a sale?',
    a: 'Not yet. Refunds and voided sales are planned. For now, use a stock adjustment with the reason “Returned by customer” and add a note.',
  },
  {
    q: 'Can I use BizTracker on two phones?',
    a: 'Not yet. Data is stored only on this device and is not synced or backed up automatically. Export your data regularly from More → Export data.',
  },
];

export default function Help() {
  return (
    <Page>
      <Header title="Help and support" back />
      <ScrollScreen>
        {FAQ.map((f) => (
          <View key={f.q} style={styles.item}>
            <Text style={type.bodyStrong}>{f.q}</Text>
            <Text style={type.secondary}>{f.a}</Text>
          </View>
        ))}
        <Text style={type.caption}>In-app support chat isn’t available yet.</Text>
      </ScrollScreen>
    </Page>
  );
}

const styles = StyleSheet.create({
  item: { gap: spacing.xs, paddingBottom: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
