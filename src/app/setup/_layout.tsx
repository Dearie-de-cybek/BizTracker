import { Stack } from 'expo-router';

import { SetupDraftProvider } from '@/features/setup/SetupDraftContext';
import { colors } from '@/theme';

export default function SetupLayout() {
  return (
    <SetupDraftProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="review" />
        <Stack.Screen name="success" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
    </SetupDraftProvider>
  );
}
