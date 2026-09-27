import { invokeFunction } from '@/lib/supabase';

export type CallCredentials = { token: string; url: string; roomName: string };

/** Demande au serveur un jeton LiveKit pour la visio d'une séance. */
export function fetchCallCredentials(sessionId: string): Promise<CallCredentials> {
  return invokeFunction<CallCredentials>('livekit-token', { sessionId });
}
