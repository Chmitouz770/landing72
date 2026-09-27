import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { signOut } from '@/features/auth/api';
import { useMyProfile } from '@/features/profile/api';
import { formatShortDate } from '@/lib/format';
import { spacing } from '@/theme';
import { Avatar, Badge, ListRow, LoadingView, Screen, Text } from '@/ui';

export default function Profile() {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();

  if (!profile) return <LoadingView />;

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Avatar name={profile.display_name} uri={profile.avatar_url} size={96} />
        <Text variant="title" center>
          {profile.display_name}
        </Text>
        {profile.city ? (
          <Text tone="muted" center>
            {profile.city}
          </Text>
        ) : null}
        <View style={styles.badges}>
          {profile.wants_to_learn ? <Badge label={t('profile.wantsToLearn')} icon="book-outline" tone="accent" /> : null}
          {profile.wants_to_teach ? <Badge label={t('profile.wantsToTeach')} icon="school-outline" tone="accent" /> : null}
        </View>
        {profile.bio ? (
          <Text center tone="muted">
            {profile.bio}
          </Text>
        ) : null}
        <Text variant="caption" tone="muted">
          {t('profile.memberSince', { date: formatShortDate(profile.created_at) })}
        </Text>
      </View>

      <View style={styles.rows}>
        <ListRow icon="create-outline" label={t('profile.edit')} onPress={() => router.push('/profile/edit')} />
        <ListRow
          icon="albums-outline"
          label={t('profile.myListings')}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: profile.id } })}
        />
        <ListRow icon="heart-outline" label={t('profile.support')} onPress={() => router.push('/donate')} />
        <ListRow icon="settings-outline" label={t('profile.settings')} onPress={() => router.push('/settings')} />
        <ListRow icon="log-out-outline" label={t('profile.signOut')} onPress={signOut} danger />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' },
  rows: { gap: spacing.sm },
});
