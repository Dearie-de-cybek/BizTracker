import { Redirect } from 'expo-router';

import { useDb } from '@/data/DataProvider';

/** Entry gate: onboarding → business setup → main app. */
export default function Index() {
  const s = useDb();
  if (s.setupCompletedAt && s.business) return <Redirect href="/(tabs)" />;
  if (!s.onboardingCompletedAt) return <Redirect href="/onboarding" />;
  return <Redirect href="/setup" />;
}
