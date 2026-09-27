import { getLocales } from 'expo-localization';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { genderOptions, languageOptions, STUDY_LANGUAGES, type StudyLanguage } from '@/features/listings/options';
import { useFormattedRate } from '@/features/earnings/api';
import { useMyProfile, useUpdateProfile } from '@/features/profile/api';
import { notify } from '@/lib/dialogs';
import { radius, spacing, useTheme } from '@/theme';
import type { Gender } from '@/types/database';
import {
  Button,
  ChoiceChips,
  Field,
  Icon,
  MultiChoiceChips,
  Screen,
  Text,
  TextField,
  type IconName,
} from '@/ui';

const TOTAL_STEPS = 3;

function defaultLanguages(): StudyLanguage[] {
  const code = getLocales()[0]?.languageCode;
  return code && (STUDY_LANGUAGES as readonly string[]).includes(code) ? [code as StudyLanguage] : ['fr'];
}

export default function Onboarding() {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  const update = useUpdateProfile();
  const rate = useFormattedRate();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);
  const [languages, setLanguages] = useState<StudyLanguage[]>(defaultLanguages);
  const [city, setCity] = useState(profile?.city ?? '');
  const [learn, setLearn] = useState(true);
  const [teach, setTeach] = useState(false);

  const canContinue =
    (step === 0 && name.trim().length > 0 && gender !== null) ||
    (step === 1 && languages.length > 0) ||
    (step === 2 && (learn || teach));

  const next = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }
    update.mutate(
      {
        display_name: name.trim(),
        gender,
        languages,
        city: city.trim() || null,
        wants_to_learn: learn,
        wants_to_teach: teach,
        onboarded_at: new Date().toISOString(),
      },
      { onError: () => notify(t('errors.generic')) },
    );
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={styles.footer}>
          {step > 0 ? (
            <Button title={t('common.back')} variant="outline" onPress={() => setStep(step - 1)} />
          ) : null}
          <Button
            title={step === TOTAL_STEPS - 1 ? t('onboarding.finish') : t('common.continue')}
            size="lg"
            style={styles.flex}
            disabled={!canContinue}
            loading={update.isPending}
            onPress={next}
          />
        </View>
      }
    >
      <Progress step={step} />
      <Text variant="caption" tone="muted">
        {t('onboarding.step', { current: step + 1, total: TOTAL_STEPS })}
      </Text>

      {step === 0 ? (
        <>
          <Text variant="title">{t('onboarding.nameTitle')}</Text>
          <TextField
            label={t('onboarding.nameLabel')}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
            maxLength={60}
          />
          <Field label={t('onboarding.genderTitle')}>
            <ChoiceChips options={genderOptions(t)} value={gender} onChange={setGender} />
            <Text variant="caption" tone="muted">
              {t('onboarding.genderHint')}
            </Text>
          </Field>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Text variant="title">{t('onboarding.languagesTitle')}</Text>
          <MultiChoiceChips options={languageOptions(t)} values={languages} onChange={setLanguages} />
          <TextField
            label={t('onboarding.cityLabel')}
            hint={t('onboarding.cityHint')}
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
            maxLength={80}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text variant="title">{t('onboarding.intentTitle')}</Text>
          <Text tone="muted">{t('onboarding.intentSubtitle')}</Text>
          <IntentOption
            icon="book-outline"
            title={t('onboarding.intentLearn')}
            description={t('onboarding.intentLearnDesc')}
            selected={learn}
            onPress={() => setLearn(!learn)}
          />
          <IntentOption
            icon="school-outline"
            title={t('onboarding.intentTeach')}
            description={t('onboarding.intentTeachDesc', { rate })}
            selected={teach}
            onPress={() => setTeach(!teach)}
          />
        </>
      ) : null}
    </Screen>
  );
}

function Progress({ step }: { step: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.progress}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <View
          key={i}
          style={[styles.progressBar, { backgroundColor: i <= step ? colors.accent : colors.border }]}
        />
      ))}
    </View>
  );
}

function IntentOption({
  icon,
  title,
  description,
  selected,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.intent,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.accentSoft : colors.surface,
        },
      ]}
    >
      <Icon name={icon} size={28} color={colors.primary} />
      <View style={styles.flex}>
        <Text variant="subheading">{title}</Text>
        <Text variant="small" tone="muted">
          {description}
        </Text>
      </View>
      <Icon
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={26}
        color={selected ? colors.primary : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  progress: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.lg },
  progressBar: { flex: 1, height: 4, borderRadius: 2 },
  intent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderRadius: radius.lg,
  },
});
