import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { useMyProfile } from '@/features/profile/api';
import { restoreLanguage } from '@/i18n';
import { isBackendConfigured } from '@/lib/env';
import { queryClient } from '@/lib/queryClient';
import { useTheme } from '@/theme';
import { EmptyState, ErrorView, LoadingView, Screen } from '@/ui';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    restoreLanguage().finally(() => setLanguageReady(true));
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator ready={languageReady} />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator({ ready }: { ready: boolean }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { session, isLoading } = useAuth();
  const profile = useMyProfile();

  const signedIn = !!session;
  const booting = !ready || isLoading || (signedIn && profile.isPending);
  const onboarded = !!profile.data?.onboarded_at;

  useEffect(() => {
    if (!booting) SplashScreen.hideAsync().catch(() => undefined);
  }, [booting]);

  // Au démarrage, l'écran de lancement natif reste affiché par-dessus.
  if (booting) return <LoadingView />;

  if (!isBackendConfigured) {
    return (
      <Screen edges={['top', 'bottom']}>
        <EmptyState icon="construct-outline" title={t('setup.title')} message={t('setup.message')} />
      </Screen>
    );
  }

  if (signedIn && profile.isError) {
    return <ErrorView onRetry={() => profile.refetch()} />;
  }

  const base = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerBackTitle: t('common.back'),
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="listing/new" options={{ title: '', presentation: 'modal' }} />
          <Stack.Screen name="listing/[id]" options={{ title: '' }} />
          <Stack.Screen name="user/[id]" options={{ title: '' }} />
          <Stack.Screen name="connection/[id]" options={{ title: '' }} />
          <Stack.Screen
            name="schedule/[connectionId]"
            options={{ title: t('session.newTitle'), presentation: 'modal' }}
          />
          <Stack.Screen
            name="call/[sessionId]"
            options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen name="donate/index" options={{ title: t('donate.title') }} />
          <Stack.Screen name="profile/edit" options={{ title: t('profile.edit') }} />
          <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
          <Stack.Screen name="report" options={{ title: t('report.title'), presentation: 'modal' }} />
        </Stack.Protected>

        {/* Page de retour Stripe : accessible dans tous les cas. */}
        <Stack.Screen name="donate/thanks" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
