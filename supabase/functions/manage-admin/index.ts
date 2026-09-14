import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' }
});

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return response({ error: 'Méthode non autorisée.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return response({ error: 'Session requise.' }, 401);

  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return response({ error: 'Session invalide.' }, 401);

  const { data: callerProfile } = await admin.from('profils').select('id_role,role_code,statut,roles(code)').eq('id', user.id).maybeSingle();
  const callerRole = callerProfile?.role_code || callerProfile?.roles?.code;
  if (callerProfile?.statut !== 'actif' || callerRole !== 'SUPER_ADMIN') return response({ error: 'Droits Super Administrateur requis.' }, 403);

  const body = await req.json();
  if (body.action === 'delete') {
    if (!body.user_id || body.user_id === user.id) return response({ error: 'Suppression impossible pour ce compte.' }, 400);
    const { error: deleteError } = await admin.auth.admin.deleteUser(body.user_id);
    if (deleteError) return response({ error: deleteError.message }, 400);
    const { error: profileDeleteError } = await admin.from('profils').delete().eq('id', body.user_id);
    if (profileDeleteError) return response({ error: profileDeleteError.message }, 400);
    return response({ ok: true });
  }
  if (body.action !== 'create') return response({ error: 'Action inconnue.' }, 400);
  if (!body.email || !body.password || body.password.length < 8 || !body.nom || !body.prenom) return response({ error: 'Email, mot de passe (8 caractères minimum), nom et prénom sont obligatoires.' }, 400);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: String(body.email).trim().toLowerCase(), password: body.password, email_confirm: true,
    user_metadata: { nom: body.nom, prenom: body.prenom }
  });
  if (createError || !created.user) return response({ error: createError?.message || 'Création Auth impossible.' }, 400);

  const { data: role } = await admin.from('roles').select('code').eq('id_role', body.id_role || 2).single();
  const { error: profileError } = await admin.from('profils').insert({
    id: created.user.id, id_role: body.id_role || 2, role_code: role?.code || 'ADMIN',
    email: created.user.email, nom: body.nom, prenom: body.prenom,
    avatar_url: body.avatar_url || null, statut: body.statut || 'actif'
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return response({ error: profileError.message }, 400);
  }
  return response({ ok: true, user_id: created.user.id });
});
