import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isShabbatError, useCreateSession } from '@/features/sessions/api';
import { nextDays, relativeDayLabel } from '@/lib/dates';
import { notify } from '@/lib/dialogs';
import type { SessionMode } from '@/types/database';
import { Button, ChoiceChips, Field, Screen, SegmentedControl, Text, TextField } from '@/ui';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6h → 23h
const MINUTES = [0, 15, 30, 45];
const DURATIONS = [30, 45, 60, 90];
const pad = (n: number) => String(n).padStart(2, '0');

export default function ScheduleSession() {
  const { t } = useTranslation();
  const { connectionId } = useLocalSearchParams<{ connectionId: string }>();
  const create = useCreateSession();

  // Pas de séance le Chabbat : les samedis ne sont pas proposés.
  const days = nextDays(16).filter((d) => d.getDay() !== 6);
  const [dayIndex, setDayIndex] = useState('0');
  const [hour, setHour] = useState(String(Math.min(Math.max(new Date().getHours() + 1, 6), 23)));
  const [minute, setMinute] = useState('0');
  const [duration, setDuration] = useState('45');
  const [mode, setMode] = useState<SessionMode>('video');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const startsAt = new Date(days[Number(dayIndex)]);
    startsAt.setHours(Number(hour), Number(minute), 0, 0);
    if (startsAt.getTime() < Date.now() - 60_000) {
      setError(t('session.errorPast'));
      return;
    }
    setError(null);
    create.mutate(
      {
        connectionId,
        startsAt,
        durationMinutes: Number(duration),
        mode,
        location,
        notes,
      },
      {
        onSuccess: () => router.back(),
        onError: (e) => notify(isShabbatError(e) ? t('session.shabbat') : t('errors.generic')),
      },
    );
  };

  return (
    <Screen
      footer={
        <>
          {error ? (
            <Text tone="danger" center>
              {error}
            </Text>
          ) : null}
          <Button title={t('session.create')} size="lg" block loading={create.isPending} onPress={submit} />
        </>
      }
    >
      <Field label={t('session.dayLabel')}>
        <ChoiceChips
          scroll
          options={days.map((d, i) => ({ value: String(i), label: relativeDayLabel(d) }))}
          value={dayIndex}
          onChange={setDayIndex}
        />
      </Field>

      <Field label={t('session.timeLabel')}>
        <ChoiceChips
          options={HOURS.map((h) => ({ value: String(h), label: `${pad(h)} h` }))}
          value={hour}
          onChange={setHour}
        />
        <ChoiceChips
          options={MINUTES.map((m) => ({ value: String(m), label: `${pad(Number(hour))}:${pad(m)}` }))}
          value={minute}
          onChange={setMinute}
        />
      </Field>

      <Field label={t('session.durationLabel')}>
        <ChoiceChips
          options={DURATIONS.map((d) => ({ value: String(d), label: t('session.minutes', { count: d }) }))}
          value={duration}
          onChange={setDuration}
        />
      </Field>

      <Field label={t('session.modeLabel')}>
        <SegmentedControl
          options={[
            { value: 'video', label: t('format.video') },
            { value: 'in_person', label: t('format.in_person') },
          ]}
          value={mode}
          onChange={setMode}
        />
      </Field>

      {mode === 'in_person' ? (
        <TextField
          label={t('session.locationLabel')}
          placeholder={t('session.locationPlaceholder')}
          value={location}
          onChangeText={setLocation}
          maxLength={200}
        />
      ) : null}

      <TextField
        label={`${t('session.notesLabel')} (${t('common.optional')})`}
        placeholder={t('session.notesPlaceholder')}
        value={notes}
        onChangeText={setNotes}
        maxLength={1000}
      />
    </Screen>
  );
}
