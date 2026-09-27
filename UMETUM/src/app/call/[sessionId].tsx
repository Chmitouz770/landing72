import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Component, lazy, Suspense, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserId } from '@/features/auth/AuthProvider';
import { sessionPeer, useSession } from '@/features/sessions/api';
import { fetchCallCredentials } from '@/features/video/api';
import { AppFunctionError } from '@/lib/supabase';
import { spacing } from '@/theme';
import { Button, Icon, Text } from '@/ui';

// Chargé à la demande : le module natif LiveKit n'est évalué qu'à l'ouverture d'un appel.
const VideoCall = lazy(() => import('@/features/video/VideoCall'));

const KNOWN_ERRORS = ['too_early', 'too_late', 'session_cancelled', 'session_not_found'] as const;
type KnownError = (typeof KNOWN_ERRORS)[number];

export default function CallScreen() {
  const { t } = useTranslation();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const myId = useUserId();
  const session = useSession(sessionId);
  const credentials = useQuery({
    queryKey: ['call-credentials', sessionId],
    queryFn: () => fetchCallCredentials(sessionId),
    enabled: !!sessionId,
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
  });

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const peer = session.data ? sessionPeer(session.data, myId) : null;

  if (credentials.isPending) {
    return <CallMessage loading message={t('call.connecting')} onClose={leave} />;
  }

  if (credentials.isError) {
    const code = credentials.error instanceof AppFunctionError ? credentials.error.code : '';
    const message = (KNOWN_ERRORS as readonly string[]).includes(code)
      ? t(`call.${code as KnownError}`)
      : t('call.error');
    return <CallMessage message={message} onClose={leave} />;
  }

  return (
    <View style={styles.container}>
      <CallErrorBoundary fallback={<CallMessage message={t('call.needsDevBuild')} onClose={leave} />}>
        <Suspense fallback={<CallMessage loading message={t('call.connecting')} onClose={leave} />}>
          <VideoCall credentials={credentials.data} peerName={peer?.display_name} onLeave={leave} />
        </Suspense>
      </CallErrorBoundary>
    </View>
  );
}

function CallMessage({ message, loading, onClose }: { message: string; loading?: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={[styles.container, styles.center]}>
      {loading ? <ActivityIndicator size="large" color="#FFFFFF" /> : <Icon name="videocam-off-outline" size={48} color="#FFFFFF" />}
      <Text center style={styles.light}>
        {message}
      </Text>
      <Button title={t('common.close')} variant="secondary" onPress={onClose} />
    </SafeAreaView>
  );
}

class CallErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1020' },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  light: { color: '#FFFFFF' },
});
