/**
 * Visio sur le web : composant de conférence prêt à l'emploi de LiveKit.
 */
import '@livekit/components-styles';

import { LiveKitRoom, VideoConference } from '@livekit/components-react';

import type { VideoCallProps } from './types';

export default function VideoCall({ credentials, onLeave }: VideoCallProps) {
  return (
    <div data-lk-theme="default" style={{ height: '100%', width: '100%' }}>
      <LiveKitRoom
        serverUrl={credentials.url}
        token={credentials.token}
        connect
        audio
        video
        onDisconnected={onLeave}
        style={{ height: '100%' }}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
