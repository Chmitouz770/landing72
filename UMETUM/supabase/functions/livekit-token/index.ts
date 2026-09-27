// Délivre un jeton LiveKit pour rejoindre la visio d'une séance d'étude.
// Seuls les deux membres de la mise en relation y ont accès (garanti par la RLS).
import { AccessToken } from 'npm:livekit-server-sdk@2';

import { HttpError, json, readJson, requireEnv, serve } from '../_shared/http.ts';
import { requireUser } from '../_shared/supabase.ts';

const JOIN_EARLY_MINUTES = 60;
const JOIN_LATE_HOURS = 6;

serve(async (req) => {
  const { user, db } = await requireUser(req);
  const { sessionId } = await readJson<{ sessionId?: string }>(req);
  if (!sessionId) throw new HttpError(400, 'missing_session_id');

  const { data: session, error } = await db
    .from('study_sessions')
    .select('id, room_name, status, mode, starts_at')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!session) throw new HttpError(404, 'session_not_found');
  if (session.status === 'cancelled') throw new HttpError(409, 'session_cancelled');
  if (session.mode !== 'video') throw new HttpError(400, 'session_not_video');

  const startsAt = new Date(session.starts_at).getTime();
  const now = Date.now();
  if (now < startsAt - JOIN_EARLY_MINUTES * 60_000) throw new HttpError(409, 'too_early');
  if (now > startsAt + JOIN_LATE_HOURS * 3_600_000) throw new HttpError(409, 'too_late');

  const { data: profile } = await db
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  const token = new AccessToken(requireEnv('LIVEKIT_API_KEY'), requireEnv('LIVEKIT_API_SECRET'), {
    identity: user.id,
    name: profile?.display_name ?? 'UMETUM',
    ttl: '4h',
  });
  token.addGrant({
    roomJoin: true,
    room: session.room_name,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return json({
    token: await token.toJwt(),
    url: requireEnv('LIVEKIT_URL'),
    roomName: session.room_name,
  });
});
