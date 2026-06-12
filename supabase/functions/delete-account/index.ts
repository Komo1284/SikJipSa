// Edge Function: delete-account
//
// Permanently deletes the calling user's account. The client must be signed
// in — we read the user from the Authorization JWT, wipe their storage files,
// then delete the auth user. All DB rows (profiles / locations / plants /
// plant_logs) cascade via `references auth.users(id) on delete cascade`.
//
// Deploy with:
//   npx supabase functions deploy delete-account
//
// (JWT verification stays ON — unlike kakao-auth, this endpoint must only be
// callable by an authenticated user, and only ever deletes that same user.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const BUCKET = 'plant-photos';

/** Storage list() is per-folder; photos live at userId/plantId/file. */
async function deleteUserPhotos(userId: string) {
  const { data: folders, error } = await supabaseAdmin.storage.from(BUCKET).list(userId);
  if (error || !folders) return; // best-effort — never block account deletion
  const paths: string[] = [];
  for (const folder of folders) {
    if (folder.id) {
      // A file directly under userId/ (unexpected but possible)
      paths.push(`${userId}/${folder.name}`);
      continue;
    }
    const { data: files } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(`${userId}/${folder.name}`);
    for (const f of files ?? []) paths.push(`${userId}/${folder.name}/${f.name}`);
  }
  if (paths.length > 0) {
    await supabaseAdmin.storage.from(BUCKET).remove(paths).catch(() => {});
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Missing Authorization header' }, 401);

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !userData.user) return json({ error: 'Invalid session' }, 401);
    const userId = userData.user.id;

    await deleteUserPhotos(userId);

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    return json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 500);
  }
});
