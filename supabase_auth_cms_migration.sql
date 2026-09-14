-- AEPeS - Migration de sécurité Auth + CMS
-- À exécuter après supabase_setup.sql dans Supabase SQL Editor.
-- Les mots de passe ne doivent jamais être stockés dans public.profils.

-- Pré-requis idempotents : ils évitent l'erreur "relation ... does not exist"
-- lorsque le premier script a été exécuté partiellement ou que les tables CMS
-- ont été ajoutées après le reste du schéma.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS public.roles (
  id_role SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  libelle VARCHAR(100) NOT NULL,
  description TEXT
);
CREATE TABLE IF NOT EXISTS public.profils (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_role INT REFERENCES public.roles(id_role) DEFAULT 7,
  email VARCHAR(255) UNIQUE NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(255),
  statut VARCHAR(30) DEFAULT 'actif',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS public.contenu_apropos (
  id_contenu SERIAL PRIMARY KEY,
  section VARCHAR(50) NOT NULL,
  titre VARCHAR(200) NOT NULL,
  contenu TEXT NOT NULL,
  ordre INT DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS public.equipe_dirigeante (
  id_membre_equipe SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  poste VARCHAR(150) NOT NULL,
  description TEXT,
  photo_url VARCHAR(500),
  linkedin_url VARCHAR(255),
  twitter_url VARCHAR(255),
  ordre INT DEFAULT 1,
  est_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS public.parametres_site (
  cle VARCHAR(100) PRIMARY KEY,
  valeur TEXT NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Rôles nécessaires à l'authentification Auth et à la création des membres.
INSERT INTO public.roles (id_role, code, libelle, description) VALUES
  (1, 'SUPER_ADMIN', 'Super Administrateur', 'Accès total, gestion des rôles et configuration du CMS'),
  (2, 'ADMIN', 'Secrétaire Général / Admin', 'Gestion administrative générale et validation des membres'),
  (3, 'TRESORIER', 'Trésorier Général', 'Gestion financière, dons et cotisations'),
  (4, 'EDITEUR', 'Responsable Communication & Médias', 'Gestion des contenus éditoriaux, galerie et partenaires'),
  (5, 'RESP_PROJET', 'Responsable Projets & Activités', 'Suivi des programmes et projets associatifs'),
  (6, 'RESP_EDUCATION', 'Responsable Éducation & Bibliothèque', 'Gestion de la bibliothèque numérique et des cours'),
  (7, 'MEMBRE', 'Membre Adhérent', 'Accès à l’espace membre')
ON CONFLICT (id_role) DO UPDATE SET
  code = EXCLUDED.code,
  libelle = EXCLUDED.libelle,
  description = EXCLUDED.description;

ALTER TABLE public.profils ADD COLUMN IF NOT EXISTS role_code VARCHAR(50);
ALTER TABLE public.profils DROP COLUMN IF EXISTS mot_de_passe;
-- Retire les anciens profils de démonstration qui ne correspondent à aucun compte Auth.
DELETE FROM public.profils p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profils_auth_user_fk') THEN
    ALTER TABLE public.profils ADD CONSTRAINT profils_auth_user_fk FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS profils_role_code_idx ON public.profils(role_code);
CREATE UNIQUE INDEX IF NOT EXISTS membres_user_id_unique_idx ON public.membres(user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_profile_role_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT code INTO NEW.role_code FROM public.roles WHERE id_role = NEW.id_role;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profils_sync_role_code ON public.profils;
CREATE TRIGGER profils_sync_role_code
  BEFORE INSERT OR UPDATE OF id_role ON public.profils
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_code();

UPDATE public.profils p
SET role_code = r.code
FROM public.roles r
WHERE r.id_role = p.id_role AND p.role_code IS DISTINCT FROM r.code;

CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profils p
    LEFT JOIN public.roles r ON r.id_role = p.id_role
    WHERE p.id = auth.uid()
      AND p.statut = 'actif'
      AND COALESCE(p.role_code, r.code) = required_role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_admin_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profils p
    LEFT JOIN public.roles r ON r.id_role = p.id_role
    WHERE p.id = auth.uid()
      AND p.statut = 'actif'
      AND COALESCE(p.role_code, r.code) <> 'MEMBRE'
  );
$$;

-- Supprime les anciennes politiques permissives de supabase_setup.sql.
DO $$
DECLARE policy_row record;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  END LOOP;
END $$;

-- Storage : lecture publique des médias, écriture réservée aux admins.
DO $$
DECLARE policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_row.policyname);
  END LOOP;
END $$;
CREATE POLICY storage_public_read ON storage.objects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY storage_admin_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (public.has_any_admin_role());
CREATE POLICY storage_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING (public.has_any_admin_role()) WITH CHECK (public.has_any_admin_role());
CREATE POLICY storage_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (public.has_any_admin_role());
-- Le dépôt d'une photo d'adhésion est la seule écriture anonyme permise.
CREATE POLICY storage_member_photo_insert ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'photos_membres' AND name LIKE 'AEPeS-%');

-- Toutes les mutations d'administration exigent une session Auth active et un rôle.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'universites','membres','cotisations','documents_membres','evenements',
    'inscriptions_evenements','categories_ressources','ressources_library',
    'categories_articles','articles','projets','medias_galerie','donateurs',
    'dons','partenaires','conventions_partenariats','messages_contact'
  ] LOOP
    EXECUTE format('CREATE POLICY admin_full_%s ON public.%I FOR ALL TO authenticated USING (public.has_any_admin_role()) WITH CHECK (public.has_any_admin_role())', table_name, table_name);
  END LOOP;
END $$;

CREATE POLICY super_admin_settings ON public.parametres_site FOR ALL TO authenticated
  USING (public.has_role('SUPER_ADMIN')) WITH CHECK (public.has_role('SUPER_ADMIN'));
CREATE POLICY super_admin_roles ON public.roles FOR ALL TO authenticated
  USING (public.has_role('SUPER_ADMIN')) WITH CHECK (public.has_role('SUPER_ADMIN'));
CREATE POLICY super_admin_profiles ON public.profils FOR ALL TO authenticated
  USING (public.has_role('SUPER_ADMIN'))
  WITH CHECK (public.has_role('SUPER_ADMIN'));

-- Lecture publique des contenus destinés au site.
CREATE POLICY public_read_settings ON public.parametres_site FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_apropos ON public.contenu_apropos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_equipe ON public.equipe_dirigeante FOR SELECT TO anon, authenticated USING (est_visible = true OR public.has_any_admin_role());
CREATE POLICY public_read_roles ON public.roles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_articles ON public.articles FOR SELECT TO anon, authenticated USING (est_publie = true OR public.has_any_admin_role());
CREATE POLICY public_read_categories_articles ON public.categories_articles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_events ON public.evenements FOR SELECT TO anon, authenticated USING (est_publie = true OR public.has_any_admin_role());
CREATE POLICY public_read_projects ON public.projets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_gallery ON public.medias_galerie FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_partners ON public.partenaires FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_conventions ON public.conventions_partenariats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_library_categories ON public.categories_ressources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_library ON public.ressources_library FOR SELECT TO authenticated USING (true);

-- Un membre ne lit que son profil et ses données personnelles.
CREATE POLICY profile_self_read ON public.profils FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_any_admin_role());
CREATE POLICY profile_self_insert ON public.profils FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY member_self_read ON public.membres FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_any_admin_role());
CREATE POLICY cotisation_self_read ON public.cotisations FOR SELECT TO authenticated USING (
  public.has_any_admin_role() OR id_membre IN (SELECT id_membre FROM public.membres WHERE user_id = auth.uid())
);
CREATE POLICY document_self_read ON public.documents_membres FOR SELECT TO authenticated USING (
  public.has_any_admin_role() OR id_membre IN (SELECT id_membre FROM public.membres WHERE user_id = auth.uid())
);

-- Les visiteurs peuvent envoyer les formulaires publics, sans lire les données reçues.
CREATE POLICY public_create_members ON public.membres FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY public_create_contact ON public.messages_contact FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY public_create_event_registration ON public.inscriptions_evenements FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY public_create_donors ON public.donateurs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY public_create_dons ON public.dons FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Le contenu éditorial est modifiable par le super-admin et l'éditeur communication.
CREATE POLICY cms_write_apropos ON public.contenu_apropos FOR INSERT TO authenticated
  WITH CHECK (public.has_role('SUPER_ADMIN') OR public.has_role('EDITEUR') OR public.has_role('RESP_COMM'));
CREATE POLICY cms_update_apropos ON public.contenu_apropos FOR UPDATE TO authenticated
  USING (public.has_role('SUPER_ADMIN') OR public.has_role('EDITEUR') OR public.has_role('RESP_COMM'))
  WITH CHECK (public.has_role('SUPER_ADMIN') OR public.has_role('EDITEUR') OR public.has_role('RESP_COMM'));
CREATE POLICY cms_delete_apropos ON public.contenu_apropos FOR DELETE TO authenticated
  USING (public.has_role('SUPER_ADMIN') OR public.has_role('EDITEUR') OR public.has_role('RESP_COMM'));
CREATE POLICY cms_write_team ON public.equipe_dirigeante FOR INSERT TO authenticated
  WITH CHECK (public.has_role('SUPER_ADMIN') OR public.has_role('EDITEUR') OR public.has_role('RESP_COMM'));
CREATE POLICY cms_update_team ON public.equipe_dirigeante FOR UPDATE TO authenticated
  USING (public.has_role('SUPER_ADMIN') OR public.has_role('EDITEUR') OR public.has_role('RESP_COMM'))
  WITH CHECK (public.has_role('SUPER_ADMIN') OR public.has_role('EDITEUR') OR public.has_role('RESP_COMM'));
CREATE POLICY cms_delete_team ON public.equipe_dirigeante FOR DELETE TO authenticated
  USING (public.has_role('SUPER_ADMIN') OR public.has_role('EDITEUR') OR public.has_role('RESP_COMM'));

-- Après cette migration, créer les utilisateurs dans Auth ou via la Edge Function
-- manage-admin. Leur ligne public.profils doit avoir le même UUID que auth.users.id.
