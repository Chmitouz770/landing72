/**
 * Faux backend du mode démo : un `fetch` qui imite l'API Supabase
 * (PostgREST, Auth, Edge Functions) sur les données en mémoire de ./data.ts,
 * en reproduisant les règles d'accès (RLS) essentielles.
 */
import type { Connection, Profile } from '@/types/database';

import { AUTO_REPLY, db, DEMO_USER_ID, newId, type DemoTable } from './data';

type Row = Record<string, unknown>;

const ME = DEMO_USER_ID;
const AUTO_ACCEPT_AFTER_MS = 6_000;
const nowIso = () => new Date().toISOString();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
const noContent = () => new Response(null, { status: 204 });
const pgError = (message: string, status = 400) => json({ code: 'P0001', message, details: null, hint: null }, status);

// ---------------------------------------------------------------------------
// Règles d'accès
// ---------------------------------------------------------------------------
function isBlockedWith(other: unknown): boolean {
  return db.blocks.some(
    (b) => (b.blocker_id === ME && b.blocked_id === other) || (b.blocker_id === other && b.blocked_id === ME),
  );
}

function myConnections(): Connection[] {
  return db.connections.filter((c) => c.teacher_id === ME || c.student_id === ME);
}

/** Simule la réponse de l'autre membre à une demande envoyée pendant la démo. */
function simulateReplies() {
  for (const c of db.connections) {
    const age = Date.now() - new Date(c.created_at).getTime();
    if (c.status === 'pending' && c.requested_by === ME && age > AUTO_ACCEPT_AFTER_MS) {
      c.status = 'accepted';
      c.responded_at = nowIso();
      c.updated_at = nowIso();
      const other = c.teacher_id === ME ? c.student_id : c.teacher_id;
      db.messages.push({ id: newId(), connection_id: c.id, sender_id: other, body: AUTO_REPLY, created_at: nowIso() });
    }
  }
}

function visible(table: DemoTable): Row[] {
  const connectionIds = new Set(myConnections().map((c) => c.id));
  switch (table) {
    case 'listings':
      return db.listings.filter((l) => l.owner_id === ME || (l.status === 'active' && !isBlockedWith(l.owner_id)));
    case 'connections':
      return myConnections();
    case 'messages':
      return db.messages.filter((m) => connectionIds.has(m.connection_id));
    case 'study_sessions':
      return db.study_sessions.filter((s) => connectionIds.has(s.connection_id));
    case 'donations':
    case 'subscriptions':
      return (db[table] as Row[]).filter((r) => r.user_id === ME);
    case 'blocks':
      return db.blocks.filter((b) => b.blocker_id === ME);
    case 'reports':
      return db.reports.filter((r) => r.reporter_id === ME);
    default:
      return db[table] as Row[];
  }
}

// ---------------------------------------------------------------------------
// Jointures (équivalent des `select` imbriqués de PostgREST)
// ---------------------------------------------------------------------------
const lite = (id: unknown) => {
  const p = db.profiles.find((x) => x.id === id);
  return p ? { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url, city: p.city } : null;
};

function embed(table: DemoTable, row: Row): Row {
  if (table === 'listings') {
    return { ...row, owner: lite(row.owner_id), topic: db.topics.find((t) => t.id === row.topic_id) ?? null };
  }
  if (table === 'connections') {
    const l = visible('listings').find((x) => x.id === row.listing_id);
    return {
      ...row,
      teacher: lite(row.teacher_id),
      student: lite(row.student_id),
      listing: l ? { id: l.id, title: l.title, topic_id: l.topic_id, kind: l.kind } : null,
    };
  }
  if (table === 'study_sessions') {
    const c = db.connections.find((x) => x.id === row.connection_id);
    return {
      ...row,
      connection: c
        ? { id: c.id, teacher_id: c.teacher_id, student_id: c.student_id, teacher: lite(c.teacher_id), student: lite(c.student_id) }
        : null,
    };
  }
  return row;
}

// ---------------------------------------------------------------------------
// Filtres PostgREST (eq, neq, in, gte, lte, gt, lt, is, ilike, or)
// ---------------------------------------------------------------------------
function matches(value: unknown, op: string, arg: string): boolean {
  const v = value == null ? null : String(value);
  switch (op) {
    case 'eq':
      return v === arg;
    case 'neq':
      return v !== arg;
    case 'in':
      return arg.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/^"|"$/g, '')).includes(v ?? '');
    case 'gte':
      return v !== null && v >= arg;
    case 'lte':
      return v !== null && v <= arg;
    case 'gt':
      return v !== null && v > arg;
    case 'lt':
      return v !== null && v < arg;
    case 'is':
      return arg === 'null' ? v === null : v !== null;
    case 'ilike':
      return v !== null && v.toLowerCase().includes(arg.replace(/[*%]/g, '').toLowerCase());
    default:
      return true;
  }
}

function applyQuery(rows: Row[], params: URLSearchParams): Row[] {
  let out = rows;
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'].includes(key)) continue;
    if (key === 'or') {
      const conditions = raw.replace(/^\(|\)$/g, '').split(',').map((c) => c.split('.'));
      out = out.filter((r) => conditions.some(([field, op, ...rest]) => matches(r[field], op, rest.join('.'))));
      continue;
    }
    const [op, ...rest] = raw.split('.');
    out = out.filter((r) => matches(r[key], op, rest.join('.')));
  }
  const order = params.get('order');
  if (order) {
    const [field, dir] = order.split(',')[0].split('.');
    out = [...out].sort((a, b) => {
      const x = String(a[field] ?? '');
      const y = String(b[field] ?? '');
      const cmp = typeof a[field] === 'number' ? (a[field] as number) - (b[field] as number) : x.localeCompare(y);
      return dir === 'desc' ? -cmp : cmp;
    });
  }
  const offset = Number(params.get('offset') ?? 0);
  const limit = params.get('limit');
  return out.slice(offset, limit ? offset + Number(limit) : undefined);
}

function respondRows(table: DemoTable, rows: Row[], headers: Headers, status = 200): Response {
  const embedded = rows.map((r) => embed(table, r));
  if ((headers.get('Accept') ?? '').includes('vnd.pgrst.object')) {
    if (embedded.length !== 1) return json({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }, 406);
    return json(embedded[0], status);
  }
  return json(embedded, status);
}

// ---------------------------------------------------------------------------
// Écritures
// ---------------------------------------------------------------------------
function withDefaults(table: DemoTable, input: Row): Row {
  const base = { id: newId(), created_at: nowIso() };
  switch (table) {
    case 'listings':
      return {
        ...base, updated_at: nowIso(), status: 'active', level: 'all', format: 'video', audience: 'all',
        languages: ['fr'], description: null, city: null, availability: null, ...input, owner_id: ME,
      };
    case 'messages':
      return { ...base, ...input, sender_id: ME };
    case 'study_sessions':
      return {
        ...base, updated_at: nowIso(), room_name: `umetum-demo-${base.id}`, status: 'scheduled', duration_minutes: 45,
        mode: 'video', location: null, notes: null, ...input, created_by: ME,
      };
    case 'reports':
      return { ...base, status: 'open', ...input, reporter_id: ME };
    default:
      return { ...base, ...input };
  }
}

function canWrite(table: DemoTable, row: Row): boolean {
  if (table === 'profiles') return row.id === ME;
  if (table === 'listings') return row.owner_id === ME;
  if (table === 'study_sessions') return myConnections().some((c) => c.id === row.connection_id);
  return false;
}

// ---------------------------------------------------------------------------
// Fonctions SQL (rpc)
// ---------------------------------------------------------------------------
function rpc(name: string, args: Row): Response {
  if (name === 'request_connection') {
    const listing = db.listings.find((l) => l.id === args.p_listing_id && l.status === 'active');
    if (!listing || isBlockedWith(listing.owner_id)) return pgError('listing_not_found');
    if (listing.owner_id === ME) return pgError('cannot_request_own_listing');
    const open = db.connections.find(
      (c) => c.listing_id === listing.id && c.requested_by === ME && ['pending', 'accepted'].includes(c.status),
    );
    if (open) return json(open);
    const row: Connection = {
      id: newId(),
      listing_id: listing.id,
      teacher_id: listing.kind === 'offer' ? listing.owner_id : ME,
      student_id: listing.kind === 'offer' ? ME : listing.owner_id,
      requested_by: ME,
      status: 'pending',
      intro_message: String(args.p_message ?? '').trim() || null,
      responded_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    db.connections.push(row);
    return json(row);
  }

  if (name === 'respond_connection') {
    const c = myConnections().find((x) => x.id === args.p_connection_id);
    if (!c) return pgError('connection_not_found');
    if (args.p_action === 'accept' || args.p_action === 'decline') {
      if (c.requested_by === ME || c.status !== 'pending') return pgError('not_allowed');
      c.status = args.p_action === 'accept' ? 'accepted' : 'declined';
      c.responded_at = nowIso();
    } else if (args.p_action === 'cancel') {
      c.status = 'cancelled';
    }
    c.updated_at = nowIso();
    return json(c);
  }

  if (name === 'block_user') {
    if (!db.blocks.some((b) => b.blocker_id === ME && b.blocked_id === args.p_user_id)) {
      db.blocks.push({ blocker_id: ME, blocked_id: String(args.p_user_id), created_at: nowIso() });
    }
    for (const c of myConnections()) {
      if ([c.teacher_id, c.student_id].includes(String(args.p_user_id)) && ['pending', 'accepted'].includes(c.status)) {
        c.status = 'cancelled';
      }
    }
    return noContent();
  }

  return pgError('function_not_found', 404);
}

// ---------------------------------------------------------------------------
// Authentification (code à 6 chiffres : n'importe lequel est accepté)
// ---------------------------------------------------------------------------
let demoEmail = 'invite@umetum.app';

function b64url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function demoUser() {
  return {
    id: ME,
    aud: 'authenticated',
    role: 'authenticated',
    email: demoEmail,
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: nowIso(),
  };
}

function demoSession() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: ME, exp, role: 'authenticated', aud: 'authenticated' })}.demo`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    refresh_token: 'demo-refresh-token',
    user: demoUser(),
  };
}

function ensureMyProfile() {
  if (db.profiles.some((p) => p.id === ME)) return;
  const me: Profile = {
    id: ME,
    display_name: demoEmail.split('@')[0] || 'Invité',
    bio: null,
    avatar_url: null,
    gender: null,
    city: null,
    country: null,
    languages: ['fr'],
    wants_to_learn: true,
    wants_to_teach: false,
    onboarded_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  db.profiles.push(me);
}

function auth(path: string, method: string, body: Row): Response {
  if (path === 'otp') {
    demoEmail = String(body.email ?? demoEmail);
    return json({});
  }
  if (path === 'verify') {
    if (!/^\d{6}$/.test(String(body.token ?? ''))) {
      return json({ code: 'otp_expired', msg: 'Token has expired or is invalid' }, 403);
    }
    ensureMyProfile();
    return json(demoSession());
  }
  if (path === 'token') return json(demoSession());
  if (path === 'user') return json(demoUser());
  if (path === 'logout') return noContent();
  return json({});
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function demoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = typeof input === 'object' && 'url' in input ? input : null;
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
  const headers = new Headers(init?.headers ?? request?.headers);
  const text = typeof init?.body === 'string' ? init.body : '';
  const body: Row = text ? JSON.parse(text) : {};

  await delay(120 + Math.random() * 180); // latence réaliste

  const authMatch = url.pathname.match(/^\/auth\/v1\/(\w+)/);
  if (authMatch) return auth(authMatch[1], method, body);

  if (url.pathname.startsWith('/functions/v1/') || url.pathname.startsWith('/storage/v1/')) {
    return json({ error: 'demo_mode' }, 400);
  }

  const restMatch = url.pathname.match(/^\/rest\/v1\/(rpc\/)?(\w+)$/);
  if (!restMatch) return json({ message: 'not_found' }, 404);
  if (restMatch[1]) return rpc(restMatch[2], body);

  const table = restMatch[2] as DemoTable;
  if (!(table in db)) return json({ message: 'relation does not exist' }, 404);
  simulateReplies();
  const wantsRows = (headers.get('Prefer') ?? '').includes('return=representation');

  if (method === 'GET' || method === 'HEAD') {
    return respondRows(table, applyQuery(visible(table), url.searchParams), headers);
  }

  if (method === 'POST') {
    const inputs = (Array.isArray(body) ? body : [body]) as Row[];
    const created = inputs.map((input) => withDefaults(table, input));
    if (table === 'messages' || table === 'study_sessions') {
      const allowed = myConnections().some((c) => c.id === created[0]?.connection_id && c.status === 'accepted');
      if (!allowed) return pgError('new row violates row-level security policy', 403);
    }
    (db[table] as Row[]).push(...created);
    return wantsRows ? respondRows(table, created, headers, 201) : new Response(null, { status: 201 });
  }

  if (method === 'PATCH') {
    const targets = applyQuery(visible(table), url.searchParams).filter((r) => canWrite(table, r));
    for (const row of targets) Object.assign(row, body, 'updated_at' in row ? { updated_at: nowIso() } : {});
    return wantsRows ? respondRows(table, targets, headers) : noContent();
  }

  if (method === 'DELETE') {
    const targets = new Set(applyQuery(visible(table), url.searchParams).filter((r) => canWrite(table, r)));
    const list = db[table] as Row[];
    for (let i = list.length - 1; i >= 0; i--) if (targets.has(list[i])) list.splice(i, 1);
    return wantsRows ? respondRows(table, [...targets], headers) : noContent();
  }

  return json({ message: 'method_not_allowed' }, 405);
}
