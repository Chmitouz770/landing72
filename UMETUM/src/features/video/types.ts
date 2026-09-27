import type { CallCredentials } from './api';

export type VideoCallProps = {
  credentials: CallCredentials;
  peerName?: string;
  onLeave: () => void;
};
