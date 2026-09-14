-- ==============================================================================
-- AEPeS x SUPABASE - SCRIPT D'INITIALISATION COMPLET & IDEMPOTENT
-- Ce script peut être exécuté plusieurs fois sans aucune erreur.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. NETTOYAGE PRÉALABLE DES TABLES (Ordre respectant les clés étrangères)
DROP TABLE IF EXISTS public.messages_contact CASCADE;
DROP TABLE IF EXISTS public.conventions_partenariats CASCADE;
DROP TABLE IF EXISTS public.partenaires CASCADE;
DROP TABLE IF EXISTS public.dons CASCADE;
DROP TABLE IF EXISTS public.donateurs CASCADE;
DROP TABLE IF EXISTS public.medias_galerie CASCADE;
DROP TABLE IF EXISTS public.projets CASCADE;
DROP TABLE IF EXISTS public.articles CASCADE;
DROP TABLE IF EXISTS public.categories_articles CASCADE;
DROP TABLE IF EXISTS public.ressources_library CASCADE;
DROP TABLE IF EXISTS public.categories_ressources CASCADE;
DROP TABLE IF EXISTS public.inscriptions_evenements CASCADE;
DROP TABLE IF EXISTS public.evenements CASCADE;
DROP TABLE IF EXISTS public.documents_membres CASCADE;
DROP TABLE IF EXISTS public.cotisations CASCADE;
DROP TABLE IF EXISTS public.membres CASCADE;
DROP TABLE IF EXISTS public.universites CASCADE;
DROP TABLE IF EXISTS public.profils CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.parametres_site CASCADE;

-- ------------------------------------------------------------------------------
-- 3. STORAGE BUCKETS (Création idempotente)
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('photos_membres', 'photos_membres', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('documents_library', 'documents_library', true, 52428800, ARRAY['application/pdf', 'application/epub+zip', 'video/mp4', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('documents_membres', 'documents_membres', true, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('galerie_photos', 'galerie_photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
  ('articles_covers', 'articles_covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('dossiers_partenariats', 'dossiers_partenariats', true, 15728640, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Politiques de sécurité Supabase Storage (Drop + Create pour idempotence)
DROP POLICY IF EXISTS "Public Read All Storage Objects" ON storage.objects;
CREATE POLICY "Public Read All Storage Objects" ON storage.objects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Upload to photos_membres" ON storage.objects;
CREATE POLICY "Public Upload to photos_membres" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos_membres');

DROP POLICY IF EXISTS "Public Upload to dossiers_partenariats" ON storage.objects;
CREATE POLICY "Public Upload to dossiers_partenariats" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'dossiers_partenariats');

DROP POLICY IF EXISTS "Public Upload to documents_library" ON storage.objects;
CREATE POLICY "Public Upload to documents_library" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents_library');

DROP POLICY IF EXISTS "Public Upload to galerie_photos" ON storage.objects;
CREATE POLICY "Public Upload to galerie_photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'galerie_photos');

DROP POLICY IF EXISTS "Public Upload to documents_membres" ON storage.objects;
CREATE POLICY "Public Upload to documents_membres" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents_membres');

DROP POLICY IF EXISTS "Public Upload to articles_covers" ON storage.objects;
CREATE POLICY "Public Upload to articles_covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'articles_covers');

DROP POLICY IF EXISTS "Public Update All Storage Objects" ON storage.objects;
CREATE POLICY "Public Update All Storage Objects" ON storage.objects FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete All Storage Objects" ON storage.objects;
CREATE POLICY "Public Delete All Storage Objects" ON storage.objects FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 4. STRUCTURE DES TABLES (SCHEMA PUBLIC)
-- ------------------------------------------------------------------------------

-- Rôles utilisateurs
CREATE TABLE public.roles (
    id_role SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    libelle VARCHAR(100) NOT NULL,
    description TEXT
);

-- Profils utilisateurs & Administrateurs
CREATE TABLE public.profils (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_role INT REFERENCES public.roles(id_role) DEFAULT 7,
    email VARCHAR(255) UNIQUE NOT NULL,
    -- Le mot de passe est géré par Supabase Auth, jamais par cette table.
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(255),
    statut VARCHAR(30) DEFAULT 'actif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Universités
CREATE TABLE public.universites (
    id_universite SERIAL PRIMARY KEY,
    nom_universite VARCHAR(200) NOT NULL,
    ville VARCHAR(100),
    pays VARCHAR(100) DEFAULT 'Cameroun',
    sigle VARCHAR(50)
);

-- Membres adhérents
CREATE TABLE public.membres (
    id_membre SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profils(id) ON DELETE SET NULL,
    id_universite INT REFERENCES public.universites(id_universite),
    matricule_adhesion VARCHAR(50) UNIQUE NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    sexe VARCHAR(20) DEFAULT 'Féminin',
    telephone_whatsapp VARCHAR(50) NOT NULL,
    universite_nom VARCHAR(150) DEFAULT 'Université de Ngaoundéré',
    niveau_etude VARCHAR(50) DEFAULT 'Licence 1',
    filiere_departement VARCHAR(150) DEFAULT 'Tronc Commun / Général',
    photo_url VARCHAR(500),
    statut_adhesion VARCHAR(30) DEFAULT 'en_attente', -- 'en_attente', 'valide', 'rejete'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cotisations annuelles
CREATE TABLE public.cotisations (
    id_cotisation SERIAL PRIMARY KEY,
    id_membre INT REFERENCES public.membres(id_membre) ON DELETE CASCADE,
    annee_academique VARCHAR(20) NOT NULL,
    montant NUMERIC(10,2) NOT NULL DEFAULT 5000.00,
    moyen_paiement VARCHAR(50) NOT NULL,
    statut_paiement VARCHAR(30) DEFAULT 'payee',
    reference_transaction VARCHAR(100),
    recu_fiscal_url VARCHAR(500),
    date_paiement TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Documents personnels membres
CREATE TABLE public.documents_membres (
    id_doc_membre SERIAL PRIMARY KEY,
    id_membre INT REFERENCES public.membres(id_membre) ON DELETE CASCADE,
    titre_document VARCHAR(200) NOT NULL,
    type_document VARCHAR(50) NOT NULL,
    fichier_url VARCHAR(500) NOT NULL,
    date_emission DATE DEFAULT CURRENT_DATE
);

-- Événements
CREATE TABLE public.evenements (
    id_evenement SERIAL PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    lieu VARCHAR(200) NOT NULL,
    date_debut TIMESTAMP WITH TIME ZONE NOT NULL,
    date_fin TIMESTAMP WITH TIME ZONE,
    capacite_max INT DEFAULT 100,
    image_url VARCHAR(500),
    est_publie BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inscriptions aux événements
CREATE TABLE public.inscriptions_evenements (
    id_inscription SERIAL PRIMARY KEY,
    id_evenement INT REFERENCES public.evenements(id_evenement) ON DELETE CASCADE,
    id_membre INT REFERENCES public.membres(id_membre) ON DELETE SET NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telephone VARCHAR(50) NOT NULL,
    num_adhesion VARCHAR(50),
    code_qr_billet VARCHAR(100),
    statut_presence BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bibliothèque numérique (AEPeS Library)
CREATE TABLE public.categories_ressources (
    id_categorie SERIAL PRIMARY KEY,
    nom_categorie VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE public.ressources_library (
    id_ressource SERIAL PRIMARY KEY,
    id_categorie INT REFERENCES public.categories_ressources(id_categorie),
    titre VARCHAR(200) NOT NULL,
    description TEXT,
    filiere_concernee VARCHAR(100) DEFAULT 'Général',
    niveau_recommande VARCHAR(50) DEFAULT 'Tous niveaux',
    format_fichier VARCHAR(20) DEFAULT 'PDF',
    taille_fichier VARCHAR(50) DEFAULT '—',
    fichier_url VARCHAR(500) NOT NULL,
    nb_telechargements INT DEFAULT 0,
    est_reserve_membres BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Articles & Actualités
CREATE TABLE public.categories_articles (
    id_categorie_art SERIAL PRIMARY KEY,
    nom_categorie VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE public.articles (
    id_article SERIAL PRIMARY KEY,
    id_categorie_art INT REFERENCES public.categories_articles(id_categorie_art),
    titre VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    chapeau TEXT,
    contenu_html TEXT NOT NULL,
    image_couverture_url VARCHAR(500),
    est_publie BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Projets
CREATE TABLE public.projets (
    id_projet SERIAL PRIMARY KEY,
    titre_projet VARCHAR(200) NOT NULL,
    categorie VARCHAR(100) NOT NULL,
    description TEXT,
    objectif_beneficiaires VARCHAR(100),
    budget_fcfa NUMERIC(12,2) DEFAULT 0,
    resultat_obtenu VARCHAR(200),
    image_url VARCHAR(500),
    statut VARCHAR(50) DEFAULT 'en_cours'
);

-- Médias Galerie
CREATE TABLE public.medias_galerie (
    id_media SERIAL PRIMARY KEY,
    id_projet INT REFERENCES public.projets(id_projet),
    id_evenement INT REFERENCES public.evenements(id_evenement),
    titre_album VARCHAR(200) NOT NULL,
    type_media VARCHAR(20) DEFAULT 'image',
    media_url VARCHAR(500) NOT NULL,
    caption TEXT,
    date_prise_vue DATE DEFAULT CURRENT_DATE
);

-- Donateurs & Dons
CREATE TABLE public.donateurs (
    id_donateur SERIAL PRIMARY KEY,
    nom_ou_societe VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telephone VARCHAR(50),
    est_anonyme BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.dons (
    id_don SERIAL PRIMARY KEY,
    id_donateur INT REFERENCES public.donateurs(id_donateur) ON DELETE CASCADE,
    id_projet INT REFERENCES public.projets(id_projet),
    montant_fcfa NUMERIC(12,2) NOT NULL,
    moyen_paiement VARCHAR(50) NOT NULL,
    statut_don VARCHAR(30) DEFAULT 'confirme',
    reference_paiement VARCHAR(100) UNIQUE,
    recu_fiscal_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Partenaires & Conventions
CREATE TABLE public.partenaires (
    id_partenaire SERIAL PRIMARY KEY,
    nom_organisation VARCHAR(200) NOT NULL,
    logo_url VARCHAR(500),
    site_web VARCHAR(255),
    contact_nom VARCHAR(150),
    contact_email VARCHAR(255),
    contact_telephone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.conventions_partenariats (
    id_convention SERIAL PRIMARY KEY,
    id_partenaire INT REFERENCES public.partenaires(id_partenaire) ON DELETE CASCADE,
    type_partenariat VARCHAR(100) NOT NULL,
    dossier_pdf_url VARCHAR(500),
    statut_demande VARCHAR(30) DEFAULT 'en_attente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Messages de contact
CREATE TABLE public.messages_contact (
    id_message SERIAL PRIMARY KEY,
    nom_complet VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    sujet VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    est_traite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Contenu éditable de la page "À propos"
CREATE TABLE public.contenu_apropos (
    id_contenu SERIAL PRIMARY KEY,
    section VARCHAR(50) NOT NULL,            -- 'timeline', 'vision', 'mission', 'valeur'
    titre VARCHAR(200) NOT NULL,
    contenu TEXT NOT NULL,
    ordre INT DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Équipe dirigeante (page publique)
CREATE TABLE public.equipe_dirigeante (
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

-- Paramètres généraux configurables du site (CMS)
CREATE TABLE public.parametres_site (
    cle VARCHAR(100) PRIMARY KEY,
    valeur TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) & POLITIQUES CRUD COMPLÈTES
-- ------------------------------------------------------------------------------

-- Activation RLS sur toutes les tables
ALTER TABLE public.parametres_site ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contenu_apropos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipe_dirigeante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profils ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_membres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscriptions_evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories_ressources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ressources_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medias_galerie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partenaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conventions_partenariats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages_contact ENABLE ROW LEVEL SECURITY;

-- Helper pour créer des politiques CRUD totales (SELECT, INSERT, UPDATE, DELETE) pour chaque table
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'parametres_site', 'contenu_apropos', 'equipe_dirigeante', 'roles', 'profils', 'universites', 'membres', 'cotisations',
        'documents_membres', 'evenements', 'inscriptions_evenements', 'categories_ressources',
        'ressources_library', 'categories_articles', 'articles', 'projets', 'medias_galerie',
        'donateurs', 'dons', 'partenaires', 'conventions_partenariats', 'messages_contact'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow All For Public %s" ON public.%I;', t, t);
        EXECUTE format('CREATE POLICY "Allow All For Public %s" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t, t);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 6. DONNÉES INITIALES (SEED DATA)
-- ------------------------------------------------------------------------------

-- 1. Rôles
INSERT INTO public.roles (id_role, code, libelle, description) VALUES
(1, 'SUPER_ADMIN', 'Super Administrateur', 'Accès total, gestion des rôles, profils administrateurs et configuration CMS'),
(2, 'ADMIN', 'Secrétaire Général / Admin', 'Gestion administrative générale, validation des membres, événements et messages'),
(3, 'TRESORIER', 'Trésorier Général', 'Gestion financière, dons, cotisations et suivi de trésorerie'),
(4, 'EDITEUR', 'Responsable Communication & Médias', 'Gestion des articles, actualités, galerie photos et partenaires'),
(5, 'RESP_PROJET', 'Responsable Projets & Activités', 'Suivi des programmes, projets associatifs et budgets'),
(6, 'RESP_EDUCATION', 'Responsable Éducation & Bibliothèque', 'Gestion de la bibliothèque numérique (AEPeS Library) et cours'),
(7, 'MEMBRE', 'Membre Adhérent', 'Accès standard espace membre et téléchargements')
ON CONFLICT (id_role) DO UPDATE SET code = EXCLUDED.code, libelle = EXCLUDED.libelle, description = EXCLUDED.description;

SELECT setval('roles_id_role_seq', (SELECT MAX(id_role) FROM public.roles));

-- 2. Universités
INSERT INTO public.universites (nom_universite, ville, sigle) VALUES
('Université de Ngaoundéré', 'Ngaoundéré', 'UN'),
('Université de Maroua', 'Maroua', 'UMa'),
('Université de Garoua', 'Garoua', 'UGa'),
('Université de Yaoundé I', 'Yaoundé', 'UY1'),
('Université de Yaoundé II - Soa', 'Yaoundé', 'UY2'),
('Université de Dschang', 'Dschang', 'UDs')
ON CONFLICT DO NOTHING;

-- 3. Profils
INSERT INTO public.profils (id, id_role, email, nom, prenom, avatar_url, statut) VALUES
('11111111-1111-1111-1111-111111111111', 1, 'admin@aepes.org', 'Diallo', 'Ramatoulaye', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'actif'),
('11111111-1111-1111-1111-111111111112', 2, 'secretaire@aepes.org', 'Sow', 'Moussa', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'actif'),
('11111111-1111-1111-1111-111111111113', 3, 'tresorier@aepes.org', 'Barry', 'Oumarou', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'actif'),
('11111111-1111-1111-1111-111111111114', 4, 'communication@aepes.org', 'Diallo', 'Aïssatou', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', 'actif'),
('11111111-1111-1111-1111-111111111115', 5, 'projets@aepes.org', 'Bah', 'Mamadou', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'actif'),
('11111111-1111-1111-1111-111111111116', 6, 'education@aepes.org', 'Bâ', 'Fatimata', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', 'actif'),
('22222222-2222-2222-2222-222222222222', 7, 'fatimata.sow@aepes.org', 'Sow', 'Fatimata', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', 'actif'),
('33333333-3333-3333-3333-333333333333', 7, 'amadou.ba@aepes.org', 'Bâ', 'Amadou Diallo', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'actif'),
('44444444-4444-4444-4444-444444444444', 7, 'ibrahima.barry@aepes.org', 'Barry', 'Ibrahima', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'actif')
ON CONFLICT (id) DO UPDATE SET id_role = EXCLUDED.id_role, email = EXCLUDED.email, nom = EXCLUDED.nom, prenom = EXCLUDED.prenom;

-- 4. Membres
INSERT INTO public.membres (id_membre, user_id, id_universite, matricule_adhesion, nom, prenom, email, sexe, telephone_whatsapp, universite_nom, niveau_etude, filiere_departement, statut_adhesion) VALUES
(1, '22222222-2222-2222-2222-222222222222', 1, 'AEPeS-2026-0342', 'Sow', 'Fatimata', 'fatimata.sow@aepes.org', 'Féminin', '+237 690 12 34 56', 'Université de Ngaoundéré', 'Licence 2', 'Sciences Économiques', 'valide'),
(2, '33333333-3333-3333-3333-333333333333', 1, 'AEPeS-2026-0001', 'Bâ', 'Amadou Diallo', 'amadou.ba@aepes.org', 'Masculin', '+237 691 23 45 67', 'Université de Ngaoundéré', 'Master 2', 'Sciences Politiques', 'valide'),
(3, '44444444-4444-4444-4444-444444444444', 2, 'AEPeS-2026-0105', 'Barry', 'Ibrahima', 'ibrahima.barry@aepes.org', 'Masculin', '+237 692 34 56 78', 'Université de Maroua', 'Master 1', 'Droit Privé', 'valide'),
(4, NULL, 1, 'AEPeS-2026-0412', 'Sow', 'Alpha', 'alpha.sow@gmail.com', 'Masculin', '+237 670 11 22 33', 'Université de Ngaoundéré', 'Licence 1', 'Mathématiques - Informatique', 'en_attente'),
(5, NULL, 2, 'AEPeS-2026-0413', 'Diallo', 'Djénabou', 'djenabou.diallo@yahoo.fr', 'Féminin', '+237 671 22 33 44', 'Université de Maroua', 'Licence 3', 'Lettres Bilingues', 'valide'),
(6, NULL, 3, 'AEPeS-2026-0414', 'Bah', 'Souleymane', 'souley.bah@outlook.com', 'Masculin', '+237 672 33 44 55', 'Université de Garoua', 'Licence 2', 'Sciences Juridiques', 'en_attente'),
(7, NULL, 1, 'AEPeS-2026-0415', 'Sy', 'Hawa', 'hawa.sy@univ-ndere.cm', 'Féminin', '+237 673 44 55 66', 'Université de Ngaoundéré', 'Master 1', 'Biochimie', 'valide'),
(8, NULL, 2, 'AEPeS-2026-0416', 'Diallo', 'Aïssatou', 'aissatou.diallo@gmail.com', 'Féminin', '+237 674 55 66 77', 'Université de Maroua', 'Master 2', 'Comptabilité & Finance', 'valide')
ON CONFLICT (matricule_adhesion) DO NOTHING;

-- Réajuster la séquence des membres
SELECT setval('membres_id_membre_seq', (SELECT MAX(id_membre) FROM public.membres));

-- 5. Cotisations
INSERT INTO public.cotisations (id_membre, annee_academique, montant, moyen_paiement, statut_paiement, reference_transaction) VALUES
(1, '2025 - 2026', 5000.00, 'Mobile Money (Orange)', 'payee', 'TXN-MM-2026-00342'),
(1, '2024 - 2025', 5000.00, 'Mobile Money (Orange)', 'payee', 'TXN-MM-2025-00189'),
(2, '2025 - 2026', 5000.00, 'Carte bancaire', 'payee', 'TXN-CB-2026-00001'),
(3, '2025 - 2026', 5000.00, 'Mobile Money (MTN)', 'payee', 'TXN-MTN-2026-00105'),
(5, '2025 - 2026', 5000.00, 'Mobile Money (Orange)', 'payee', 'TXN-MM-2026-00413'),
(7, '2025 - 2026', 5000.00, 'Virement bancaire', 'payee', 'TXN-VIR-2026-00415'),
(8, '2025 - 2026', 5000.00, 'Mobile Money (MTN)', 'payee', 'TXN-MTN-2026-00416')
ON CONFLICT DO NOTHING;

-- 6. Documents personnels membres
INSERT INTO public.documents_membres (id_membre, titre_document, type_document, fichier_url, date_emission) VALUES
(1, 'Fiche officielle dadhésion signée', 'fiche_adhesion', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '2024-09-03'),
(1, 'Attestation de membre actif 2026', 'attestation', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '2026-01-10'),
(2, 'Attestation de bureau exécutif (Président)', 'attestation', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '2026-01-10')
ON CONFLICT DO NOTHING;

-- 7. Catégories de ressources Library
INSERT INTO public.categories_ressources (id_categorie, nom_categorie) VALUES
(1, 'Cours & Polycopiés'),
(2, 'Livres & Manuels'),
(3, 'Examens & Annales'),
(4, 'Recherche & Thèses')
ON CONFLICT (id_categorie) DO UPDATE SET nom_categorie = EXCLUDED.nom_categorie;

SELECT setval('categories_ressources_id_categorie_seq', (SELECT MAX(id_categorie) FROM public.categories_ressources));

-- 8. Ressources Library (AEPeS Library)
INSERT INTO public.ressources_library (id_categorie, titre, description, filiere_concernee, niveau_recommande, format_fichier, taille_fichier, fichier_url, nb_telechargements) VALUES
(1, 'Introduction à la microéconomie', 'Support de cours synthétique, définitions clés et exercices corrigés pour Licence 1.', 'Sciences Économiques', 'Licence 1', 'PDF', '3.4 Mo', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 342),
(2, 'Histoire et traditions des peuples peulhs', 'Ouvrage d histoire de référence retraçant les origines, la culture et l expansion pastorale.', 'Histoire & Culture', 'Tous niveaux', 'EPUB', '12.0 Mo', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 520),
(3, 'Guide de rédaction de mémoire et thèse', 'Normes méthodologiques académiques, structuration du plan, bibliographie APA et soutenance.', 'Toutes filières', 'Master & Doctorat', 'PDF', '1.8 Mo', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 680),
(1, 'Droit constitutionnel et institutions politiques', 'Fiches de synthèse, arrêts commentés et cas pratiques d entraînement.', 'Droit & Sciences Politiques', 'Licence 1 & 2', 'PDF', '2.1 Mo', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 215),
(4, 'Masterclass : Monter son premier Business Plan', 'Enregistrement vidéo complet de l atelier pratique animé lors de l incubateur jeunes.', 'Entrepreneuriat', 'Tous niveaux', 'MP4', '145 Mo', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 189),
(3, 'Répertoire des bourses d études internationales 2026', 'Guide officiel des bourses d excellence pour étudiants d Afrique subsaharienne.', 'Général', 'Licence, Master, Doc', 'PDF', '950 Ko', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 840)
ON CONFLICT DO NOTHING;

-- 9. Catégories d'articles
INSERT INTO public.categories_articles (id_categorie_art, nom_categorie) VALUES
(1, 'Éducation'),
(2, 'Culture'),
(3, 'Partenariats'),
(4, 'Vie associative')
ON CONFLICT (id_categorie_art) DO UPDATE SET nom_categorie = EXCLUDED.nom_categorie;

SELECT setval('categories_articles_id_categorie_art_seq', (SELECT MAX(id_categorie_art) FROM public.categories_articles));

-- 10. Articles
INSERT INTO public.articles (id_categorie_art, titre, slug, chapeau, contenu_html, image_couverture_url) VALUES
(4, 'Lancement de la bibliothèque numérique AEPeS Library', 'lancement-aepes-library', 'Un nouvel espace pour accéder gratuitement à des cours et documents académiques.', '<p>L AEPeS annonce le lancement officiel de sa plateforme numérique AEPeS Library, une initiative pensée pour offrir à chaque membre un accès gratuit à des ressources pédagogiques de premier choix...</p>', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800'),
(1, 'Bilan de la campagne de rentrée académique', 'bilan-rentree-academique-2026', 'Plus de 300 nouveaux bacheliers accueillis et parrainés cette année.', '<p>La commission Éducation dresse un bilan très positif de sa campagne de rentrée dans les campus universitaires du Sud avec plus de 300 nouveaux étudiants parrainés...</p>', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800'),
(3, 'Signature dun partenariat avec trois universités', 'partenariat-trois-universites', 'De nouvelles opportunités de stages et de bourses pour nos étudiants.', '<p>Le bureau exécutif a scellé une convention cadre avec les Universités de Ngaoundéré, Maroua et Garoua pour faciliter l insertion et l hébergement des étudiants...</p>', 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800'),
(4, 'Clôture de la 3e promotion de l incubateur jeunes', 'cloture-incubateur-promotion-3', 'Neuf projets d entreprise innovants présentés devant un jury d experts.', '<p>Les 25 participants de la 3e cohorte de l Incubateur AEPeS ont brillamment soutenu leurs projets après 4 mois de formation intensive...</p>', 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800'),
(2, 'Retour sur la semaine culturelle peulhe 2026', 'retour-semaine-culturelle-2026', 'Plus de 600 participants ont célébré les arts, la poésie et la musique traditionnelle.', '<p>La 8e édition de la Semaine Culturelle s est clôturée sous les ovations de la communauté universitaire avec un grand défilé en tenue traditionnelle...</p>', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800'),
(4, 'Appel à candidatures : Commission Communication', 'appel-candidatures-communication', 'L AEPeS recherche des bénévoles passionnés de graphisme, rédaction et vidéo.', '<p>Envie de faire rayonner votre association ? Rejoignez notre équipe communication dès la rentrée prochaine...</p>', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800')
ON CONFLICT (slug) DO NOTHING;

-- 11. Événements
INSERT INTO public.evenements (id_evenement, titre, slug, description, lieu, date_debut, date_fin, capacite_max, image_url) VALUES
(1, 'Assemblée générale annuelle', 'ag-2026', 'Bilan moral et financier, renouvellement partiel des commissions et vote des orientations 2026/2027.', 'Campus central — Grand Amphi 500', '2026-09-14 14:00:00+00', '2026-09-14 18:00:00+00', 250, 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800'),
(2, 'Forum entrepreneuriat des jeunes', 'forum-entrepreneuriat-2026', 'Rencontres B2B, pitch devant investisseurs et ateliers sur la formalisation de projets.', 'Chambre de commerce et d industrie', '2026-10-02 09:00:00+00', '2026-10-02 17:00:00+00', 150, 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800'),
(3, 'Soirée culturelle peulhe', 'soiree-culturelle-2026', 'Célébration des arts vivants, contes pastoraux, défilé khasa et dégustation culinaire.', 'Maison des associations et de la culture', '2026-10-20 18:00:00+00', '2026-10-20 23:00:00+00', 400, 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800'),
(4, 'Atelier CV et entretien dembauche', 'atelier-cv-2026', 'Séance interactive animée par des directeurs RH pour optimiser son profil professionnel.', 'Faculté des Sciences Juridiques — Salle B2', '2026-11-08 15:00:00+00', '2026-11-08 18:00:00+00', 80, 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800')
ON CONFLICT (slug) DO NOTHING;

SELECT setval('evenements_id_evenement_seq', (SELECT MAX(id_evenement) FROM public.evenements));

-- 12. Inscriptions événements
INSERT INTO public.inscriptions_evenements (id_evenement, id_membre, nom, prenom, email, telephone, num_adhesion, code_qr_billet) VALUES
(1, 1, 'Sow', 'Fatimata', 'fatimata.sow@aepes.org', '+237 690 12 34 56', 'AEPeS-2026-0342', 'QR-AG2026-001'),
(1, 2, 'Bâ', 'Amadou Diallo', 'amadou.ba@aepes.org', '+237 691 23 45 67', 'AEPeS-2026-0001', 'QR-AG2026-002'),
(2, 8, 'Diallo', 'Aïssatou', 'aissatou.diallo@gmail.com', '+237 674 55 66 77', 'AEPeS-2026-0416', 'QR-FORUM-001'),
(3, 5, 'Diallo', 'Djénabou', 'djenabou.diallo@yahoo.fr', '+237 671 22 33 44', 'AEPeS-2026-0413', 'QR-CULT-001')
ON CONFLICT DO NOTHING;

-- 13. Projets
INSERT INTO public.projets (id_projet, titre_projet, categorie, description, objectif_beneficiaires, budget_fcfa, resultat_obtenu, image_url, statut) VALUES
(1, 'Programme de tutorat universitaire', 'Éducation', 'Des étudiants seniors bénévoles accompagnent les nouveaux bacheliers tout au long de l année universitaire.', '300 bénéficiaires', 2400000.00, '92% de taux de réussite aux examens', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800', 'en_cours'),
(2, 'Semaine culturelle peulhe', 'Culture', 'Grand festival annuel célébrant la langue fulfuldé, l artisanat du cuir, la musique et les traditions communautaires.', '600+ participants', 1800000.00, '8e édition record d affluence', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800', 'termine'),
(3, 'Incubateur de projets jeunes', 'Entrepreneuriat', 'Accompagnement méthodologique, mentorat et micro-crédits pour lancer les premières initiatives entrepreneuriales des étudiants.', '25 porteurs de projet', 5000000.00, '9 entreprises formellement créées', 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800', 'en_cours'),
(4, 'Campagne Santé & Don de Sang', 'Social', 'Journées de dépistage gratuit et sensibilisation à l hygiène en milieu étudiant.', '500 étudiants', 800000.00, '120 poches de sang collectées', 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800', 'termine')
ON CONFLICT (id_projet) DO NOTHING;

SELECT setval('projets_id_projet_seq', (SELECT MAX(id_projet) FROM public.projets));

-- 14. Médias Galerie
INSERT INTO public.medias_galerie (id_projet, id_evenement, titre_album, type_media, media_url, caption, date_prise_vue) VALUES
(2, 3, 'Semaine culturelle 2026', 'image', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800', 'Grand défilé traditionnel et danses pastorales', '2026-06-02'),
(2, 3, 'Semaine culturelle 2026', 'image', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800', 'Concert de musique traditionnelle et remise de prix', '2026-06-02'),
(1, 1, 'Assemblée générale', 'image', 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800', 'Allocution du Président devant les délégués', '2026-09-14'),
(3, 2, 'Incubateur de projets', 'image', 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800', 'Pitch des 9 finalistes devant le jury de banquiers', '2026-06-18')
ON CONFLICT DO NOTHING;

-- 15. Donateurs & Dons
INSERT INTO public.donateurs (id_donateur, nom_ou_societe, email, telephone, est_anonyme) VALUES
(1, 'Donateur Bienfaiteur Anonyme', 'contact@saheldev.org', '+237 699 88 77 66', true),
(2, 'Cheikh Ba', 'cheikh.ba@africapartner.com', '+237 690 44 55 66', false),
(3, 'Aminata Ly', 'aminata.ly@groupely.cm', '+237 691 55 66 77', false),
(4, 'Cabinet Conseil Sahel', 'contact@sahelconseil.cm', '+237 692 66 77 88', false)
ON CONFLICT (id_donateur) DO NOTHING;

SELECT setval('donateurs_id_donateur_seq', (SELECT MAX(id_donateur) FROM public.donateurs));

INSERT INTO public.dons (id_donateur, id_projet, montant_fcfa, moyen_paiement, statut_don, reference_paiement) VALUES
(1, 1, 25000.00, 'Mobile Money (Orange)', 'confirme', 'DON-MM-2026-0089'),
(2, 3, 10000.00, 'Carte bancaire (Visa)', 'confirme', 'DON-CB-2026-0142'),
(3, 1, 50000.00, 'Virement bancaire', 'en_traitement', 'DON-VIR-2026-0056'),
(4, 2, 100000.00, 'Chèque bancaire', 'confirme', 'DON-CHQ-2026-0012')
ON CONFLICT (reference_paiement) DO NOTHING;

-- 16. Partenaires & Conventions
INSERT INTO public.partenaires (id_partenaire, nom_organisation, logo_url, contact_nom, contact_email, contact_telephone) VALUES
(1, 'Université de Ngaoundéré', 'https://images.unsplash.com/photo-1562774053-701939374585?w=120', 'Rectorat', 'contact@univ-ndere.cm', '+237 222 25 40 00'),
(2, 'Université de Maroua', 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=120', 'Direction Académique', 'contact@univ-maroua.cm', '+237 222 29 11 00'),
(3, 'Université de Garoua', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=120', 'Secrétariat Général', 'contact@univ-garoua.cm', '+237 222 27 20 00'),
(4, 'Chambre de Commerce du Nord', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120', 'Délégation Régionale', 'contact@ccima-nord.cm', '+237 222 25 15 00'),
(5, 'Fondation Sahel Éducation', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=120', 'Présidence', 'fondation@sahel-education.org', '+33 1 40 00 00 00')
ON CONFLICT (id_partenaire) DO NOTHING;

SELECT setval('partenaires_id_partenaire_seq', (SELECT MAX(id_partenaire) FROM public.partenaires));

INSERT INTO public.conventions_partenariats (id_partenaire, type_partenariat, statut_demande) VALUES
(1, 'Académique (Salles & Bourses)', 'valide'),
(2, 'Académique & Culturel', 'valide'),
(3, 'Académique & Stages', 'valide'),
(4, 'Entrepreneuriat & Stages', 'valide'),
(5, 'Financement de bourses d excellence', 'valide')
ON CONFLICT DO NOTHING;

-- 17. Messages de contact
INSERT INTO public.messages_contact (nom_complet, email, sujet, message, est_traite) VALUES
('Ousmanou Mohamadou', 'ousmanou.m@gmail.com', 'Demande de renseignement tutorat', 'Bonjour, j aimerais savoir comment m inscrire comme tuteur bénévole pour la rentrée 2026.', false),
('Aïda Diallo', 'aida.diallo@outlook.fr', 'Proposition de mécénat culturel', 'Notre entreprise souhaite soutenir la prochaine semaine culturelle peulhe avec un stand.', true)
ON CONFLICT DO NOTHING;

-- 18. Paramètres du site (CMS)
INSERT INTO public.parametres_site (cle, valeur, description) VALUES
('site_nom', 'AEPeS — Association des Étudiants Peulhs du Sud', 'Nom officiel affiché dans l en-tête et le titre'),
('site_slogan', 'Unir la jeunesse peulhe autour de l éducation et de la culture.', 'Slogan principal du hero header'),
('site_description', 'L AEPeS accompagne les étudiants peulhs du Sud dans leur réussite académique, tout en préservant un héritage culturel vivant et en bâtissant des ponts vers l entrepreneuriat.', 'Description globale de la mission'),
('hero_image_url', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1000', 'Image principale affichée dans la section hero d accueil'),
('president_photo_url', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', 'Photo officielle du président'),
('contact_email', 'contact@aepes.org', 'Adresse email officielle de contact'),
('contact_telephone', '+237 690 12 34 56', 'Numéro de téléphone WhatsApp officiel'),
('contact_adresse', 'Campus universitaire, Zone Sud', 'Localisation du siège et antennes'),
('president_nom', 'Amadou Diallo Bâ', 'Nom du Président en exercice'),
('president_citation', '« Notre force vient de notre unité. L AEPeS n est pas seulement une association, c est une famille qui porte l ambition de toute une génération. »', 'Citation officielle du mot du président'),
('stat_membres', '1 200+', 'Compteur des membres actifs'),
('stat_projets', '45', 'Nombre de projets réalisés'),
('stat_universites', '18', 'Nombre d universités représentées'),
('stat_annees', '12', 'Nombre d années d engagement')
ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur;

-- 19. Contenu "À propos" (timeline, vision, mission, valeurs)
INSERT INTO public.contenu_apropos (section, titre, contenu, ordre) VALUES
('timeline', '2014 — Création', 'Fondation de l''AEPeS par un groupe d''étudiants souhaitant renforcer la solidarité entre jeunes peulhs du Sud.', 1),
('timeline', '2018 — Évolution', 'Structuration en commissions thématiques et lancement des premiers programmes de tutorat.', 2),
('timeline', '2022 — Grandes réalisations', 'Ouverture de l''incubateur de projets jeunes et premiers partenariats universitaires officiels.', 3),
('timeline', '2026 — Aujourd''hui', 'Plus de 1200 membres actifs et lancement de la plateforme numérique institutionnelle.', 4),
('vision', 'Vision', 'Une jeunesse peulhe unie, éduquée et actrice de son propre développement.', 1),
('mission', 'Mission', 'Promouvoir l''éducation, renforcer la cohésion sociale, préserver la culture peulhe, encourager l''entrepreneuriat et contribuer au développement durable.', 1),
('valeur', 'Solidarité', 'L''entraide entre membres, quelle que soit la génération.', 1),
('valeur', 'Excellence', 'L''exigence académique comme moteur de réussite collective.', 2),
('valeur', 'Identité', 'La fierté et la transmission de la culture peulhe.', 3),
('valeur', 'Engagement', 'L''action concrète au service de la communauté.', 4)
ON CONFLICT DO NOTHING;

-- 20. Équipe dirigeante
INSERT INTO public.equipe_dirigeante (nom, prenom, poste, description, photo_url, ordre) VALUES
('Bâ', 'Amadou Diallo', 'Président', 'Étudiant en sciences politiques, engagé depuis 2019.', NULL, 1),
('Sow', 'Fatimata', 'Vice-Présidente', 'Responsable des relations universitaires.', NULL, 2),
('Barry', 'Ibrahima', 'Secrétaire Général', 'En charge de la coordination administrative.', NULL, 3),
('Diallo', 'Aïssatou', 'Trésorière Générale', 'Gestion financière et suivi des cotisations.', NULL, 4),
('Sy', 'Oumar', 'Responsable Commission Éducation', 'Pilote le programme de tutorat.', NULL, 5),
('Bah', 'Kadiatou', 'Responsable Commission Culture', 'Organise la semaine culturelle peulhe.', NULL, 6),
('Sané', 'Mamadou', 'Responsable Commission Entrepreneuriat', 'Anime l''incubateur de projets.', NULL, 7),
('Diallo', 'Ramatoulaye', 'Responsable Communication', 'Gère les actualités et réseaux sociaux.', NULL, 8)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- 21. CONFIGURATION DU STORAGE SUPABASE (BUCKETS PUBLICS & POLICIES)
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) VALUES
  ('photos_membres', 'photos_membres', true),
  ('articles_covers', 'articles_covers', true),
  ('galerie_photos', 'galerie_photos', true),
  ('documents_library', 'documents_library', true),
  ('documents_membres', 'documents_membres', true),
  ('dossiers_partenariats', 'dossiers_partenariats', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Politiques de stockage permissives pour lecture et téléversement (anon)
DROP POLICY IF EXISTS "Public Storage Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Insert" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Delete" ON storage.objects;

CREATE POLICY "Public Storage Select" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Public Storage Insert" ON storage.objects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Storage Update" ON storage.objects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Storage Delete" ON storage.objects FOR DELETE USING (true);
