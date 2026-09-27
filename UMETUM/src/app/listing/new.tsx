import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useListing,
  useSaveListing,
  type ListingDraft,
  type ListingWithOwner,
} from '@/features/listings/api';
import {
  formatOptions,
  languageOptions,
  levelOptions,
  type StudyLanguage,
} from '@/features/listings/options';
import { useMyProfile } from '@/features/profile/api';
import { topicIcon, useTopicLabel, useTopics } from '@/features/topics/api';
import { notify } from '@/lib/dialogs';
import type { ListingKind, Profile, StudyFormat, StudyLevel } from '@/types/database';
import {
  Button,
  ChoiceChips,
  Field,
  LoadingView,
  MultiChoiceChips,
  Screen,
  SegmentedControl,
  TextField,
} from '@/ui';

type FormProps = {
  id?: string;
  initialKind: ListingKind;
  existing: ListingWithOwner | null | undefined;
  profile: Profile | undefined;
};

export default function ListingFormScreen() {
  const params = useLocalSearchParams<{ kind?: ListingKind; id?: string }>();
  const editing = useListing(params.id);
  const { data: profile } = useMyProfile();

  if (params.id && editing.isPending) return <LoadingView />;

  return (
    <ListingForm
      key={params.id ?? 'new'}
      id={params.id}
      initialKind={params.kind === 'request' ? 'request' : 'offer'}
      existing={editing.data}
      profile={profile}
    />
  );
}

function ListingForm({ id, initialKind, existing, profile }: FormProps) {
  const { t } = useTranslation();
  const { data: topics } = useTopics();
  const topicLabel = useTopicLabel();
  const save = useSaveListing();

  const [kind, setKind] = useState<ListingKind>(existing?.kind ?? initialKind);
  const [topicId, setTopicId] = useState<string | null>(existing?.topic_id ?? null);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [format, setFormat] = useState<StudyFormat>(existing?.format ?? 'video');
  const [level, setLevel] = useState<StudyLevel>(existing?.level ?? 'all');
  const [languages, setLanguages] = useState<StudyLanguage[]>(
    ((existing?.languages ?? profile?.languages) as StudyLanguage[] | undefined) ?? ['fr'],
  );
  const [city, setCity] = useState(existing?.city ?? profile?.city ?? '');
  const [availability, setAvailability] = useState(existing?.availability ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!topicId) return setError(t('listing.errorTopic'));
    if (title.trim().length < 3) return setError(t('listing.errorTitle'));
    setError(null);

    const draft: ListingDraft = {
      kind,
      topic_id: topicId,
      title: title.trim(),
      description: description.trim() || null,
      format,
      level,
      languages: languages.length > 0 ? languages : ['fr'],
      city: format === 'video' ? null : city.trim() || null,
      availability: availability.trim() || null,
    };

    save.mutate(
      { id, draft },
      {
        onSuccess: (listing) => {
          if (id) router.back();
          else router.replace({ pathname: '/listing/[id]', params: { id: listing.id } });
        },
        onError: () => notify(t('errors.generic')),
      },
    );
  };

  const screenTitle = id
    ? t('listing.editTitle')
    : kind === 'offer'
      ? t('listing.newOfferTitle')
      : t('listing.newRequestTitle');

  return (
    <Screen
      footer={
        <Button
          title={id ? t('common.save') : t('listing.publish')}
          size="lg"
          block
          loading={save.isPending}
          onPress={submit}
        />
      }
    >
      <Stack.Screen options={{ title: screenTitle }} />

      {!id ? (
        <Field label={t('listing.kindLabel')}>
          <SegmentedControl
            options={[
              { value: 'offer', label: t('listing.kindOffer') },
              { value: 'request', label: t('listing.kindRequest') },
            ]}
            value={kind}
            onChange={setKind}
          />
        </Field>
      ) : null}

      <Field label={t('listing.topicLabel')}>
        <ChoiceChips
          options={(topics ?? []).map((topic) => ({
            value: topic.id,
            label: topicLabel(topic),
            icon: topicIcon(topic),
          }))}
          value={topicId}
          onChange={setTopicId}
        />
      </Field>

      <TextField
        label={t('listing.titleLabel')}
        placeholder={kind === 'offer' ? t('listing.titlePlaceholderOffer') : t('listing.titlePlaceholderRequest')}
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        error={error}
      />

      <Field label={t('listing.formatLabel')}>
        <ChoiceChips options={formatOptions(t)} value={format} onChange={setFormat} />
      </Field>

      {format !== 'video' ? (
        <TextField label={t('listing.cityLabel')} value={city} onChangeText={setCity} maxLength={80} />
      ) : null}

      <TextField
        label={`${t('listing.descriptionLabel')} (${t('common.optional')})`}
        placeholder={t('listing.descriptionPlaceholder')}
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={2000}
      />

      <Field label={t('listing.levelLabel')}>
        <ChoiceChips options={levelOptions(t)} value={level} onChange={setLevel} />
      </Field>


      <Field label={t('listing.languagesLabel')}>
        <MultiChoiceChips options={languageOptions(t)} values={languages} onChange={setLanguages} />
      </Field>

      <TextField
        label={`${t('listing.availabilityLabel')} (${t('common.optional')})`}
        placeholder={t('listing.availabilityPlaceholder')}
        value={availability}
        onChangeText={setAvailability}
        maxLength={200}
      />
    </Screen>
  );
}
