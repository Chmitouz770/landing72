import Constants from 'expo-constants';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { deleteMyAccount } from '@/features/account/api';
import { LANGUAGE_NAMES, setLanguage, SUPPORTED_LANGUAGES, type AppLanguage } from '@/i18n';
import { confirm, notify } from '@/lib/dialogs';
import { env } from '@/lib/env';
import { Button, ChoiceChips, Field, ListRow, Screen, Text } from '@/ui';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [deleting, setDeleting] = useState(false);

  const changeLanguage = async (lang: AppLanguage) => {
    const needsRestart = await setLanguage(lang);
    if (needsRestart) notify(t('settings.restartForDirection'));
  };

  const deleteAccount = async () => {
    const ok = await confirm(t('settings.deleteConfirmTitle'), t('settings.deleteConfirmText'), {
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
    } catch {
      notify(t('errors.generic'));
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <Field label={t('settings.language')}>
        <ChoiceChips
          options={SUPPORTED_LANGUAGES.map((code) => ({ value: code, label: LANGUAGE_NAMES[code] }))}
          value={i18n.language as AppLanguage}
          onChange={changeLanguage}
        />
      </Field>

      {env.contactEmail ? (
        <ListRow
          icon="mail-outline"
          label={t('settings.contact')}
          onPress={() => Linking.openURL(`mailto:${env.contactEmail}`)}
        />
      ) : null}

      <Button
        title={t('settings.deleteAccount')}
        icon="trash-outline"
        variant="danger"
        loading={deleting}
        onPress={deleteAccount}
      />

      <Text variant="caption" tone="muted" center>
        UMETUM · {t('settings.version', { version: Constants.expoConfig?.version ?? '' })}
      </Text>
    </Screen>
  );
}
