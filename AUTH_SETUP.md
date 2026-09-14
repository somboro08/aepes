# Mise en service de l’authentification AEPeS

Important : `supabase_setup.sql` est un script d’installation complète qui recrée les tables. Ne l’exécutez pas sur une base contenant déjà des données. Sur une base existante, exécutez uniquement `supabase_auth_cms_migration.sql` ; il crée maintenant les tables CMS manquantes avant d’appliquer la sécurité.

1. Sur une base neuve, exécuter `supabase_setup.sql`, puis `supabase_auth_cms_migration.sql` dans le SQL Editor Supabase.
2. Déployer la fonction `supabase/functions/manage-admin` avec `supabase functions deploy --no-verify-jwt manage-admin`. La fonction valide ensuite elle-même le JWT et le rôle SUPER_ADMIN ; cette option est nécessaire pour laisser passer la requête CORS `OPTIONS`.
3. Déployer aussi `supabase/functions/register-member` avec `supabase functions deploy register-member`.
4. Créer le premier utilisateur dans Supabase Dashboard → Authentication → Users.
5. Créer sa ligne dans `public.profils` avec le même UUID que `auth.users.id`, `id_role = 1`, `role_code = 'SUPER_ADMIN'`, son email, son nom, son prénom et `statut = 'actif'`.
6. Se connecter via `admin.html`. Les comptes administrateurs suivants doivent être créés depuis l’onglet « Administrateurs & Rôles » ; la Edge Function crée à la fois le compte Auth et son profil.

Les mots de passe sont uniquement gérés par Supabase Auth. Ils ne doivent pas être ajoutés à `public.profils`, au JavaScript ou à un fichier SQL de données.

Le formulaire d’adhésion utilise `register-member` pour créer le compte Auth, le profil et la fiche membre avec le même UUID. Le champ `statut` du profil et `statut_adhesion` du membre sont contrôlés à chaque connexion.
