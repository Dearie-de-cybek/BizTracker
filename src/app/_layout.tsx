import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components';
import { DataProvider } from '@/data/DataProvider';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <DataProvider
        fallback={<LoadingState label="Opening your business data…" />}
        renderError={(e, retry) => (
          <ErrorState
            title="Couldn't open your data"
            message={`BizTracker could not read the data stored on this device. ${e.message}`}
            onRetry={retry}
          />
        )}
      >
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="setup" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="sale/new" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="sale/[id]" />
          <Stack.Screen name="product/form" options={{ presentation: 'modal' }} />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="product/adjust" options={{ presentation: 'modal' }} />
          <Stack.Screen name="customer/form" options={{ presentation: 'modal' }} />
          <Stack.Screen name="customer/[id]" />
        </Stack>
      </DataProvider>
    </SafeAreaProvider>
  );
}
