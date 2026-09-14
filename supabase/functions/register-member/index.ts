import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Méthode non autorisée.' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const body = await req.json();
  const required = ['nom', 'prenom', 'email', 'password', 'telephone_whatsapp', 'universite_nom', 'filiere_departement'];
  if (required.some(key => !body[key]) || String(body.password).length < 8) return reply({ error: 'Tous les champs obligatoires doivent être renseignés.' }, 400);

  const { data: memberRole, error: roleError } = await admin
    .from('roles')
    .select('id_role')
    .eq('code', 'MEMBRE')
    .maybeSingle();
  if (roleError) return reply({ error: `Impossible de vérifier le rôle MEMBRE : ${roleError.message}` }, 500);
  if (!memberRole) return reply({ error: 'Le rôle MEMBRE est absent de la table public.roles. Exécutez supabase_roles_seed.sql.' }, 500);

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: String(body.email).trim().toLowerCase(), password: body.password, email_confirm: true,
    user_metadata: { nom: body.nom, prenom: body.prenom }
  });
  if (authError || !created.user) return reply({ error: authError?.message || 'Création du compte impossible.' }, 400);

  const profile = { id: created.user.id, id_role: memberRole.id_role, role_code: 'MEMBRE', email: created.user.email, nom: body.nom, prenom: body.prenom, statut: 'actif' };
  const { error: profileError } = await admin.from('profils').insert(profile);
  if (profileError) { await admin.auth.admin.deleteUser(created.user.id); return reply({ error: profileError.message }, 400); }

  const { error: memberError } = await admin.from('membres').insert({
    user_id: created.user.id, matricule_adhesion: body.matricule_adhesion, nom: body.nom, prenom: body.prenom,
    email: created.user.email, sexe: body.sexe, telephone_whatsapp: body.telephone_whatsapp,
    universite_nom: body.universite_nom, filiere_departement: body.filiere_departement,
    niveau_etude: body.niveau_etude, photo_url: body.photo_url || null, statut_adhesion: body.statut_adhesion || 'en_attente'
  });
  if (memberError) { await admin.from('profils').delete().eq('id', created.user.id); await admin.auth.admin.deleteUser(created.user.id); return reply({ error: memberError.message }, 400); }
  return reply({ ok: true, matricule: body.matricule_adhesion });
});
