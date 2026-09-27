import { isAuthApiError } from '@supabase/supabase-js';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { sendLoginCode, verifyLoginCode } from '@/features/auth/api';
import { spacing } from '@/theme';
import { Button, Screen, Text, TextField } from '@/ui';

const CODE_LENGTH = 6;
const RESEND_DELAY = 30;

export default function Verify() {
  const { t } = useTranslation();
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_DELAY);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const submit = async (value = code) => {
    if (value.length !== CODE_LENGTH || loading) return;
    setError(null);
    setLoading(true);
    try {
      // En cas de succès, la navigation se fait automatiquement (voir _layout).
      await verifyLoginCode(email, value);
    } catch {
      setError(t('auth.invalidCode'));
      setLoading(false);
    }
  };

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) submit(digits);
  };

  const resend = async () => {
    setError(null);
    try {
      await sendLoginCode(email);
      setCountdown(RESEND_DELAY);
    } catch (e) {
      setError(isAuthApiError(e) && e.status === 429 ? t('auth.tooManyRequests') : t('errors.generic'));
    }
  };

  return (
    <Screen
      footer={
        <>
          <Button
            title={t('auth.verify')}
            size="lg"
            block
            loading={loading}
            disabled={code.length !== CODE_LENGTH}
            onPress={() => submit()}
          />
          <Button
            title={countdown > 0 ? t('auth.resendIn', { seconds: countdown }) : t('auth.resend')}
            variant="ghost"
            disabled={countdown > 0}
            onPress={resend}
          />
        </>
      }
    >
      <View style={{ gap: spacing.sm }}>
        <Text variant="title">{t('auth.codeTitle')}</Text>
        <Text tone="muted">{t('auth.codeSubtitle', { email })}</Text>
      </View>
      <TextField
        label={t('auth.codeLabel')}
        value={code}
        onChangeText={onChange}
        error={error}
        autoFocus
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        style={{ fontSize: 28, letterSpacing: 10, textAlign: 'center', fontWeight: '700' }}
      />
      <Button title={t('auth.changeEmail')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
