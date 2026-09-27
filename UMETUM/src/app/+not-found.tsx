import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '@/ui';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <EmptyState
        icon="compass-outline"
        title={t('listing.notFound')}
        actionLabel={t('donate.backToApp')}
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
