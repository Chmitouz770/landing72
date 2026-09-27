import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { REPORT_REASONS, useReport } from '@/features/reports/api';
import { notify } from '@/lib/dialogs';
import type { ReportReason } from '@/types/database';
import { Button, ChoiceChips, Screen, TextField } from '@/ui';

export default function Report() {
  const { t } = useTranslation();
  const { userId, listingId } = useLocalSearchParams<{ userId?: string; listingId?: string }>();
  const report = useReport();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');

  const send = () => {
    if (!reason) return;
    report.mutate(
      { reason, reportedUserId: userId, listingId, details },
      {
        onSuccess: () => {
          notify(t('report.sent'));
          router.back();
        },
        onError: () => notify(t('errors.generic')),
      },
    );
  };

  return (
    <Screen
      footer={
        <Button
          title={t('report.send')}
          size="lg"
          block
          variant="danger"
          disabled={!reason}
          loading={report.isPending}
          onPress={send}
        />
      }
    >
      <ChoiceChips
        options={REPORT_REASONS.map((r) => ({ value: r, label: t(`report.${r}`) }))}
        value={reason}
        onChange={setReason}
      />
      <TextField
        placeholder={t('report.detailsPlaceholder')}
        value={details}
        onChangeText={setDetails}
        multiline
        maxLength={1000}
      />
    </Screen>
  );
}
