import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';

import { useUserId } from '@/features/auth/AuthProvider';
import { isAwaitingMe, useConnectionsRealtime, useMyConnections } from '@/features/connections/api';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/ui';

function tabIcon(name: IconName, focusedName: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon name={focused ? focusedName : name} size={24} color={color} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const myId = useUserId();
  const { data: connections } = useMyConnections();
  useConnectionsRealtime();

  const awaiting = (connections ?? []).filter((c) => isAwaitingMe(c, myId)).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: t('tabs.explore'), tabBarIcon: tabIcon('search-outline', 'search') }}
      />
      <Tabs.Screen
        name="studies"
        options={{
          title: t('tabs.studies'),
          tabBarIcon: tabIcon('people-outline', 'people'),
          tabBarBadge: awaiting > 0 ? awaiting : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('person-circle-outline', 'person-circle') }}
      />
    </Tabs>
  );
}
