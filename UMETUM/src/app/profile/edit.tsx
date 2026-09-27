import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useUserId } from '@/features/auth/AuthProvider';
import { genderOptions, languageOptions, type StudyLanguage } from '@/features/listings/options';
import { pickAndUploadAvatar, useMyProfile, useUpdateProfile } from '@/features/profile/api';
import { notify } from '@/lib/dialogs';
import { spacing } from '@/theme';
import type { Gender } from '@/types/database';
import {
  Avatar,
  Button,
  Chip,
  ChoiceChips,
  Field,
  LoadingView,
  MultiChoiceChips,
  Screen,
  TextField,
} from '@/ui';

export default function EditProfile() {
  const { data: profile } = useMyProfile();
  if (!profile) return <LoadingView />;
  return <EditProfileForm key={profile.id} />;
}

function EditProfileForm() {
  const { t } = useTranslation();
  const userId = useUserId();
  const { data: profile } = useMyProfile();
  const update = useUpdateProfile();

  const [name, setName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);
  const [languages, setLanguages] = useState<StudyLanguage[]>((profile?.languages ?? []) as StudyLanguage[]);
  const [learn, setLearn] = useState(profile?.wants_to_learn ?? true);
  const [teach, setTeach] = useState(profile?.wants_to_teach ?? false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);

  const changePhoto = async () => {
    setUploading(true);
    try {
      const url = await pickAndUploadAvatar(userId);
      if (url) setAvatarUrl(url);
    } catch {
      notify(t('errors.generic'));
    } finally {
      setUploading(false);
    }
  };

  const save = () =>
    update.mutate(
      {
        display_name: name.trim() || profile?.display_name,
        bio: bio.trim() || null,
        city: city.trim() || null,
        gender,
        languages: languages.length > 0 ? languages : ['fr'],
        wants_to_learn: learn,
        wants_to_teach: teach,
        avatar_url: avatarUrl,
      },
      {
        onSuccess: () => router.back(),
        onError: () => notify(t('errors.generic')),
      },
    );

  return (
    <Screen
      footer={<Button title={t('common.save')} size="lg" block loading={update.isPending} onPress={save} />}
    >
      <View style={styles.avatar}>
        <Avatar name={name || '?'} uri={avatarUrl} size={96} />
        <Button
          title={t('profile.changePhoto')}
          icon="camera-outline"
          variant="ghost"
          loading={uploading}
          onPress={changePhoto}
        />
      </View>

      <TextField label={t('onboarding.nameLabel')} value={name} onChangeText={setName} maxLength={60} />
      <TextField
        label={t('profile.bioLabel')}
        placeholder={t('profile.bioPlaceholder')}
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={1000}
      />
      <TextField label={t('onboarding.cityLabel')} value={city} onChangeText={setCity} maxLength={80} />

      <Field label={t('onboarding.genderTitle')}>
        <ChoiceChips options={genderOptions(t)} value={gender} onChange={setGender} />
      </Field>

      <Field label={t('onboarding.languagesTitle')}>
        <MultiChoiceChips options={languageOptions(t)} values={languages} onChange={setLanguages} />
      </Field>

      <Field label={t('onboarding.intentTitle')}>
        <View style={styles.row}>
          <Chip label={t('onboarding.intentLearn')} icon="book-outline" selected={learn} onPress={() => setLearn(!learn)} />
          <Chip label={t('onboarding.intentTeach')} icon="school-outline" selected={teach} onPress={() => setTeach(!teach)} />
        </View>
      </Field>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', gap: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
