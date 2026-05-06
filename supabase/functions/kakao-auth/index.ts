// Edge Function: kakao-auth
//
// Receives a Kakao access_token from the client (obtained via the native Kakao
// SDK), verifies it against Kakao's API, and produces a one-time Supabase
// magic-link token the client can exchange for a real session via verifyOtp.
//
// We bypass Supabase's built-in Kakao OAuth provider because GoTrue hardcodes
// `account_email` into the requested scopes, and our Kakao app doesn't have
// the email consent item enabled (requires biz-app registration). By doing
// the OAuth dance ourselves we control the scopes exactly.
//
// Deploy with:
//   npx supabase functions deploy kakao-auth --no-verify-jwt
//
// `--no-verify-jwt` is required because the client calls this anonymously
// (the user has no Supabase session yet — that's what we're about to mint).

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

interface KakaoMeResponse {
  id: number;
  kakao_account?: {
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
  properties?: {
    nickname?: string;
    profile_image?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { kakaoAccessToken } = await req.json();
    if (!kakaoAccessToken || typeof kakaoAccessToken !== 'string') {
      return json({ error: 'Missing kakaoAccessToken' }, 400);
    }

    const meResp = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${kakaoAccessToken}` },
    });
    if (!meResp.ok) {
      const text = await meResp.text();
      return json({ error: 'Invalid Kakao token', detail: text }, 401);
    }
    const me = (await meResp.json()) as KakaoMeResponse;
    const kakaoId = String(me.id);
    const nickname =
      me.kakao_account?.profile?.nickname ?? me.properties?.nickname ?? null;
    const picture =
      me.kakao_account?.profile?.profile_image_url ??
      me.properties?.profile_image ??
      null;

    const phantomEmail = `kakao_${kakaoId}@sikjipsa.local`;

    // Look up existing user by email; if missing, create.
    let userId: string | null = null;
    {
      let page = 1;
      const perPage = 1000;
      while (!userId) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });
        if (error) throw error;
        const found = data.users.find((u) => u.email === phantomEmail);
        if (found) {
          userId = found.id;
          break;
        }
        if (data.users.length < perPage) break;
        page += 1;
      }
    }

    if (!userId) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: phantomEmail,
        email_confirm: true,
        user_metadata: {
          provider: 'kakao',
          kakao_id: kakaoId,
          name: nickname,
          full_name: nickname,
          avatar_url: picture,
        },
        app_metadata: { provider: 'kakao', providers: ['kakao'] },
      });
      if (error) throw error;
      userId = data.user?.id ?? null;
      if (!userId) throw new Error('Failed to create user');
    } else {
      // Refresh metadata in case the user updated their Kakao profile.
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          provider: 'kakao',
          kakao_id: kakaoId,
          name: nickname,
          full_name: nickname,
          avatar_url: picture,
        },
      });
    }

    const { data: linkData, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: phantomEmail,
      });
    if (linkErr) throw linkErr;

    const tokenHash = linkData.properties?.hashed_token ?? null;
    if (!tokenHash) throw new Error('Failed to generate magic link token');

    return json({
      email: phantomEmail,
      tokenHash,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 500);
  }
});
