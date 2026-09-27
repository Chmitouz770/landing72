import { isAuthApiError } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { EMAIL_REGEX, sendLoginCode } from '@/features/auth/api';
import { spacing } from '@/theme';
import { Button, Screen, Text, TextField } from '@/ui';

export default function SignIn() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(value)) {
      setError(t('auth.invalidEmail'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendLoginCode(value);
      router.push({ pathname: '/verify', params: { email: value } });
    } catch (e) {
      setError(isAuthApiError(e) && e.status === 429 ? t('auth.tooManyRequests') : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      footer={<Button title={t('auth.sendCode')} size="lg" block loading={loading} onPress={submit} />}
    >
      <View style={{ gap: spacing.sm }}>
        <Text variant="title">{t('auth.emailTitle')}</Text>
        <Text tone="muted">{t('auth.emailSubtitle')}</Text>
      </View>
      <TextField
        label={t('auth.emailLabel')}
        placeholder={t('auth.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        error={error}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
    </Screen>
  );
}
