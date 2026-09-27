import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

export const unstable_settings = { initialRouteName: 'welcome' };

export default function AuthLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        title: '',
        headerBackTitle: t('common.back'),
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
