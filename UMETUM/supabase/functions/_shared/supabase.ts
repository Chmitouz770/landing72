import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

import { HttpError, requireEnv } from './http.ts';

const SUPABASE_URL = requireEnv('SUPABASE_URL');

function publicKey(): string {
  return Deno.env.get('SUPABASE_ANON_KEY') ?? requireEnv('SUPABASE_PUBLISHABLE_KEY');
}

function secretKey(): string {
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? requireEnv('SUPABASE_SECRET_KEY');
}

/** Client « service role » : contourne la RLS. À n'utiliser que côté serveur. */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Vérifie le JWT de l'appelant et renvoie l'utilisateur + un client qui agit
 * en son nom (la RLS s'applique).
 */
export async function requireUser(req: Request): Promise<{ user: User; db: SupabaseClient }> {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new HttpError(401, 'not_authenticated');

  const db = createClient(SUPABASE_URL, publicKey(), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authorization.slice('Bearer '.length);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'not_authenticated');

  return { user: data.user, db };
}
