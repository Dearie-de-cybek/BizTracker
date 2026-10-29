import Feather from '@expo/vector-icons/Feather';
import { Redirect, Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { ColorValue, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDb } from '@/data/DataProvider';
import { colors } from '@/theme';

type IconName = ComponentProps<typeof Feather>['name'];

function icon(name: IconName) {
  const TabIcon = ({ color }: { color: ColorValue }) => <Feather name={name} size={22} color={color as string} />;
  TabIcon.displayName = `TabIcon(${name})`;
  return TabIcon;
}

export default function TabsLayout() {
  const { setupCompletedAt, business } = useDb();
  const insets = useSafeAreaInsets();
  if (!setupCompletedAt || !business) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 58 + (Platform.OS === 'web' ? 0 : insets.bottom),
          paddingTop: 6,
        },
        sceneStyle: { backgroundColor: colors.white },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="sales" options={{ title: 'Sales', tabBarIcon: icon('shopping-cart') }} />
      <Tabs.Screen name="inventory" options={{ title: 'Inventory', tabBarIcon: icon('package') }} />
      <Tabs.Screen name="customers" options={{ title: 'Customers', tabBarIcon: icon('users') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('more-horizontal') }} />
    </Tabs>
  );
}
