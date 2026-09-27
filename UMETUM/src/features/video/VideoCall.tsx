/**
 * Visio native (iOS / Android) avec LiveKit.
 * Ce module est chargé à la demande depuis l'écran d'appel : il n'est évalué
 * que dans une app compilée (build de développement ou de production).
 */
import {
  AudioSession,
  isTrackReference,
  LiveKitRoom,
  registerGlobals,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  VideoTrack,
} from '@livekit/react-native';
import { Track, type LocalVideoTrack } from 'livekit-client';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/theme';
import { Avatar, Icon, Text, type IconName } from '@/ui';

import type { VideoCallProps } from './types';

registerGlobals();

export default function VideoCall({ credentials, peerName, onLeave }: VideoCallProps) {
  useEffect(() => {
    AudioSession.startAudioSession();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  return (
    <LiveKitRoom
      serverUrl={credentials.url}
      token={credentials.token}
      connect
      audio
      video
      options={{ adaptiveStream: { pixelDensity: 'screen' } }}
      onDisconnected={onLeave}
    >
      <RoomView peerName={peerName} onLeave={onLeave} />
    </LiveKitRoom>
  );
}

function RoomView({ peerName, onLeave }: { peerName?: string; onLeave: () => void }) {
  const { t } = useTranslation();
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const [facing, setFacing] = useState<'user' | 'environment'>('user');

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });
  const remote = tracks.find((t) => !t.participant.isLocal);
  const local = tracks.find((t) => t.participant.isLocal);
  const remoteName = remote?.participant.name || peerName || '';

  const flipCamera = async () => {
    const next = facing === 'user' ? 'environment' : 'user';
    const track = localParticipant.getTrackPublication(Track.Source.Camera)?.track as
      | LocalVideoTrack
      | undefined;
    await track?.restartTrack({ facingMode: next });
    setFacing(next);
  };

  const leave = async () => {
    await room.disconnect();
    onLeave();
  };

  return (
    <View style={styles.container}>
      {remote && isTrackReference(remote) && !remote.publication.isMuted ? (
        <VideoTrack trackRef={remote} style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Avatar name={remoteName || '?'} size={96} />
          <Text center style={styles.light}>
            {remote ? remoteName : t('call.waiting')}
          </Text>
        </View>
      )}

      {local && isTrackReference(local) && isCameraEnabled ? (
        <View style={styles.pip}>
          <VideoTrack trackRef={local} style={styles.pipVideo} objectFit="cover" mirror={facing === 'user'} zOrder={1} />
        </View>
      ) : null}

      <SafeAreaView edges={['bottom']} style={styles.controlsArea}>
        <View style={styles.controls}>
          <ControlButton
            icon={isMicrophoneEnabled ? 'mic' : 'mic-off'}
            label={t('call.mic')}
            active={isMicrophoneEnabled}
            onPress={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          />
          <ControlButton
            icon={isCameraEnabled ? 'videocam' : 'videocam-off'}
            label={t('call.camera')}
            active={isCameraEnabled}
            onPress={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
          />
          <ControlButton icon="camera-reverse" label={t('call.flip')} active onPress={flipCamera} />
          <ControlButton icon="call" label={t('call.leave')} danger onPress={leave} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function ControlButton({
  icon,
  label,
  onPress,
  active,
  danger,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  const backgroundColor = danger ? '#D93025' : active ? 'rgba(255,255,255,0.18)' : '#FFFFFF';
  const color = danger || active ? '#FFFFFF' : '#1B2A4A';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.control, { backgroundColor }, pressed && { opacity: 0.8 }]}
    >
      <Icon name={icon} size={26} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1020' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  light: { color: '#FFFFFF' },
  pip: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    width: 110,
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  pipVideo: { flex: 1 },
  controlsArea: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  control: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
