-- ==============================================================================
-- BASE DE DONNÉES : AEPeS (Association des Étudiants Peulhs du Sud)
-- Script de création des tables relationnelles & données initiales (DDL & DML)
-- Compatible : PostgreSQL / MySQL (compatible MariaDB & SQLite avec légères adaptations)
-- ==============================================================================

-- Désactivation temporaire des contraintes pour réinitialisation propre (si besoin)
-- DROP TABLE IF EXISTS messages_contact CASCADE;
-- DROP TABLE IF EXISTS conventions_partenariats CASCADE;
-- DROP TABLE IF EXISTS partenaires CASCADE;
-- DROP TABLE IF EXISTS dons CASCADE;
-- DROP TABLE IF EXISTS donateurs CASCADE;
-- DROP TABLE IF EXISTS medias_galerie CASCADE;
-- DROP TABLE IF EXISTS projets CASCADE;
-- DROP TABLE IF EXISTS articles CASCADE;
-- DROP TABLE IF EXISTS categories_articles CASCADE;
-- DROP TABLE IF EXISTS ressources_library CASCADE;
-- DROP TABLE IF EXISTS categories_ressources CASCADE;
-- DROP TABLE IF EXISTS inscriptions_evenements CASCADE;
-- DROP TABLE IF EXISTS evenements CASCADE;
-- DROP TABLE IF EXISTS documents_membres CASCADE;
-- DROP TABLE IF EXISTS cotisations CASCADE;
-- DROP TABLE IF EXISTS membres CASCADE;
-- DROP TABLE IF EXISTS universites CASCADE;
-- DROP TABLE IF EXISTS utilisateurs CASCADE;
-- DROP TABLE IF EXISTS roles CASCADE;

-- ------------------------------------------------------------------------------
-- 1. MODULE : RÔLES & AUTHENTIFICATION
-- ------------------------------------------------------------------------------

CREATE TABLE roles (
    id_role SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    libelle VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE utilisateurs (
    id_utilisateur SERIAL PRIMARY KEY,
    id_role INT NOT NULL REFERENCES roles(id_role) ON DELETE RESTRICT,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(255),
    statut VARCHAR(30) DEFAULT 'actif', -- 'actif', 'inactif', 'suspendu'
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_connexion TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. MODULE : UNIVERSITÉS, MEMBRES & COTISATIONS
-- ------------------------------------------------------------------------------

CREATE TABLE universites (
    id_universite SERIAL PRIMARY KEY,
    nom_universite VARCHAR(200) NOT NULL,
    ville VARCHAR(100),
    pays VARCHAR(100) DEFAULT 'Cameroun',
    sigle VARCHAR(50)
);

CREATE TABLE membres (
    id_membre SERIAL PRIMARY KEY,
    id_utilisateur INT UNIQUE REFERENCES utilisateurs(id_utilisateur) ON DELETE SET NULL,
    id_universite INT NOT NULL REFERENCES universites(id_universite) ON DELETE RESTRICT,
    matricule_adhesion VARCHAR(50) UNIQUE NOT NULL, -- Ex: 'AEPeS-2026-0342'
    sexe VARCHAR(20) NOT NULL,                      -- 'Féminin', 'Masculin'
    telephone_whatsapp VARCHAR(50) NOT NULL,
    niveau_etude VARCHAR(50) NOT NULL,              -- 'Licence 1', 'Master 2', etc.
    filiere_departement VARCHAR(150) NOT NULL,
    photo_url VARCHAR(255),
    statut_adhesion VARCHAR(30) DEFAULT 'en_attente', -- 'en_attente', 'valide', 'rejete'
    date_demande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_validation TIMESTAMP
);

CREATE TABLE cotisations (
    id_cotisation SERIAL PRIMARY KEY,
    id_membre INT NOT NULL REFERENCES membres(id_membre) ON DELETE CASCADE,
    annee_academique VARCHAR(20) NOT NULL,          -- '2025 - 2026'
    montant NUMERIC(10,2) NOT NULL DEFAULT 5000.00,
    moyen_paiement VARCHAR(50) NOT NULL,           -- 'Mobile Money', 'Carte bancaire', 'Espèces'
    statut_paiement VARCHAR(30) DEFAULT 'payee',   -- 'payee', 'en_attente', 'echouee'
    reference_transaction VARCHAR(100),
    recu_fiscal_url VARCHAR(255),
    date_paiement TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents_membres (
    id_doc_membre SERIAL PRIMARY KEY,
    id_membre INT NOT NULL REFERENCES membres(id_membre) ON DELETE CASCADE,
    titre_document VARCHAR(200) NOT NULL,
    type_document VARCHAR(50) NOT NULL,            -- 'attestation', 'fiche_adhesion', 'carte_membre'
    fichier_url VARCHAR(255) NOT NULL,
    date_emission DATE NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. MODULE : ÉVÉNEMENTS & INSCRIPTIONS
-- ------------------------------------------------------------------------------

CREATE TABLE evenements (
    id_evenement SERIAL PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    lieu VARCHAR(200) NOT NULL,
    date_debut TIMESTAMP NOT NULL,
    date_fin TIMESTAMP,
    capacite_max INT,
    image_url VARCHAR(255),
    est_publie BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inscriptions_evenements (
    id_inscription SERIAL PRIMARY KEY,
    id_evenement INT NOT NULL REFERENCES evenements(id_evenement) ON DELETE CASCADE,
    id_membre INT REFERENCES membres(id_membre) ON DELETE SET NULL,
    nom_complet VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telephone VARCHAR(50) NOT NULL,
    num_adhesion VARCHAR(50),
    code_qr_billet VARCHAR(100) UNIQUE,
    statut_presence BOOLEAN DEFAULT FALSE,
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 4. MODULE : BIBLIOTHÈQUE NUMÉRIQUE (AEPeS Library)
-- ------------------------------------------------------------------------------

CREATE TABLE categories_ressources (
    id_categorie SERIAL PRIMARY KEY,
    nom_categorie VARCHAR(100) NOT NULL UNIQUE -- 'Cours', 'Livres', 'Documents', 'Vidéos'
);

CREATE TABLE ressources_library (
    id_ressource SERIAL PRIMARY KEY,
    id_categorie INT NOT NULL REFERENCES categories_ressources(id_categorie) ON DELETE RESTRICT,
    id_auteur_upload INT REFERENCES utilisateurs(id_utilisateur) ON DELETE SET NULL,
    titre VARCHAR(200) NOT NULL,
    description TEXT,
    filiere_concernee VARCHAR(100),
    niveau_recommande VARCHAR(50),
    format_fichier VARCHAR(20) NOT NULL,           -- 'PDF', 'EPUB', 'MP4', 'DOCX'
    taille_fichier VARCHAR(50),                    -- '3.4 Mo', '12 Mo'
    fichier_url VARCHAR(255) NOT NULL,
    nb_telechargements INT DEFAULT 0,
    est_reserve_membres BOOLEAN DEFAULT TRUE,
    date_publication TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 5. MODULE : ACTUALITÉS, PROJETS & MÉDIAS
-- ------------------------------------------------------------------------------

CREATE TABLE categories_articles (
    id_categorie_art SERIAL PRIMARY KEY,
    nom_categorie VARCHAR(100) NOT NULL UNIQUE -- 'Éducation', 'Culture', 'Partenariats', 'Vie associative'
);

CREATE TABLE articles (
    id_article SERIAL PRIMARY KEY,
    id_categorie_art INT NOT NULL REFERENCES categories_articles(id_categorie_art) ON DELETE RESTRICT,
    id_auteur INT REFERENCES utilisateurs(id_utilisateur) ON DELETE SET NULL,
    titre VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    chapeau TEXT,
    contenu_html TEXT NOT NULL,
    image_couverture_url VARCHAR(255),
    date_publication TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    est_publie BOOLEAN DEFAULT TRUE
);

CREATE TABLE projets (
    id_projet SERIAL PRIMARY KEY,
    titre_projet VARCHAR(200) NOT NULL,
    categorie VARCHAR(100) NOT NULL,               -- 'Éducation', 'Culture', 'Entrepreneuriat'
    description TEXT,
    objectif_beneficiaires VARCHAR(100),
    budget_fcfa NUMERIC(12,2),
    resultat_obtenu VARCHAR(200),
    statut VARCHAR(50) DEFAULT 'en_cours'          -- 'en_cours', 'termine', 'archive'
);

CREATE TABLE medias_galerie (
    id_media SERIAL PRIMARY KEY,
    id_projet INT REFERENCES projets(id_projet) ON DELETE SET NULL,
    id_evenement INT REFERENCES evenements(id_evenement) ON DELETE SET NULL,
    titre_album VARCHAR(200) NOT NULL,
    type_media VARCHAR(20) DEFAULT 'image',        -- 'image', 'video'
    media_url VARCHAR(255) NOT NULL,
    caption TEXT,
    date_prise_vue DATE
);

-- ------------------------------------------------------------------------------
-- 6. MODULE : DONS, PARTENARIATS & CONTACT
-- ------------------------------------------------------------------------------

CREATE TABLE donateurs (
    id_donateur SERIAL PRIMARY KEY,
    nom_ou_societe VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telephone VARCHAR(50),
    est_anonyme BOOLEAN DEFAULT FALSE,
    date_enregistrement TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dons (
    id_don SERIAL PRIMARY KEY,
    id_donateur INT NOT NULL REFERENCES donateurs(id_donateur) ON DELETE CASCADE,
    id_projet INT REFERENCES projets(id_projet) ON DELETE SET NULL,
    montant_fcfa NUMERIC(12,2) NOT NULL,
    moyen_paiement VARCHAR(50) NOT NULL,           -- 'Mobile Money', 'Carte bancaire', 'Virement'
    statut_don VARCHAR(30) DEFAULT 'confirme',     -- 'confirme', 'en_traitement', 'echec'
    reference_paiement VARCHAR(100) UNIQUE,
    recu_fiscal_url VARCHAR(255),
    date_don TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE partenaires (
    id_partenaire SERIAL PRIMARY KEY,
    nom_organisation VARCHAR(200) NOT NULL,
    logo_url VARCHAR(255),
    site_web VARCHAR(255),
    contact_nom VARCHAR(150),
    contact_email VARCHAR(255),
    contact_telephone VARCHAR(50),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conventions_partenariats (
    id_convention SERIAL PRIMARY KEY,
    id_partenaire INT NOT NULL REFERENCES partenaires(id_partenaire) ON DELETE CASCADE,
    type_partenariat VARCHAR(100) NOT NULL,        -- 'Académique', 'Financier', 'Matériel', 'Communication'
    dossier_pdf_url VARCHAR(255),
    statut_demande VARCHAR(30) DEFAULT 'en_attente', -- 'en_attente', 'valide', 'refuse'
    date_demande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_signature DATE
);

CREATE TABLE messages_contact (
    id_message SERIAL PRIMARY KEY,
    nom_complet VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    sujet VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    est_traite BOOLEAN DEFAULT FALSE,
    date_envoi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 7. INDEX D'OPTIMISATION DES PERFORMANCES
-- ------------------------------------------------------------------------------

CREATE INDEX idx_utilisateurs_email ON utilisateurs(email);
CREATE INDEX idx_membres_matricule ON membres(matricule_adhesion);
CREATE INDEX idx_membres_statut ON membres(statut_adhesion);
CREATE INDEX idx_cotisations_membre ON cotisations(id_membre);
CREATE INDEX idx_inscriptions_evenement ON inscriptions_evenements(id_evenement);
CREATE INDEX idx_ressources_categorie ON ressources_library(id_categorie);
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_dons_date ON dons(date_don);

-- ==============================================================================
-- 8. DONNÉES INITIALES DE DÉMARRAGE (SEED DATA DU SITE)
-- ==============================================================================

-- Rôles
INSERT INTO roles (code, libelle, description) VALUES
('SUPER_ADMIN', 'Super Administrateur', 'Accès total et gestion de la plateforme'),
('ADMIN', 'Administrateur Général', 'Gestion opérationnelle, membres et comptabilité'),
('EDITEUR', 'Éditeur de Contenu', 'Gestion des articles, événements et médias'),
('RESP_PROJET', 'Responsable de Projets', 'Suivi des programmes et documents projets'),
('RESP_COMM', 'Responsable Communication', 'Communication, réseaux sociaux et partenaires'),
('MEMBRE', 'Membre Adhérent', 'Accès carte numérique et bibliothèque');

-- Utilisateurs de démonstration
INSERT INTO utilisateurs (id_role, email, mot_de_passe_hash, nom, prenom, avatar_url, statut) VALUES
(1, 'admin@aepes.org', '$2y$10$DemoSuperAdminSecureHash2026', 'Diallo', 'Ramatoulaye', 'avatar_admin.jpg', 'actif'),
(6, 'fatimata.sow@aepes.org', '$2y$10$DemoMemberSecureHash2026', 'Sow', 'Fatimata', 'avatar_fatimata.jpg', 'actif');

-- Universités
INSERT INTO universites (nom_universite, ville, sigle) VALUES
('Université de Ngaoundéré', 'Ngaoundéré', 'UN'),
('Université de Maroua', 'Maroua', 'UMa'),
('Université de Garoua', 'Garoua', 'UGa');

-- Membres
INSERT INTO membres (id_utilisateur, id_universite, matricule_adhesion, sexe, telephone_whatsapp, niveau_etude, filiere_departement, statut_adhesion) VALUES
(2, 1, 'AEPeS-2026-0342', 'Féminin', '+237 690 00 00 00', 'Licence 2', 'Sciences Économiques', 'valide');

-- Cotisations
INSERT INTO cotisations (id_membre, annee_academique, montant, moyen_paiement, statut_paiement, reference_transaction) VALUES
(1, '2025 - 2026', 5000.00, 'Mobile Money', 'payee', 'TXN-MM-2026-00342'),
(1, '2024 - 2025', 5000.00, 'Mobile Money', 'payee', 'TXN-MM-2025-00189');

-- Catégories de ressources Library
INSERT INTO categories_ressources (nom_categorie) VALUES
('Cours'), ('Livres'), ('Documents'), ('Vidéos');

-- Ressources AEPeS Library
INSERT INTO ressources_library (id_categorie, id_auteur_upload, titre, description, filiere_concernee, niveau_recommande, format_fichier, taille_fichier, fichier_url) VALUES
(1, 1, 'Introduction à la microéconomie', 'Support de cours synthétique et exercices corrigés', 'Économie', 'Licence 1', 'PDF', '3.4 Mo', 'docs/microeconomie_l1.pdf'),
(2, 1, 'Histoire et traditions des peuples peulhs', 'Ouvrage de référence sur les origines et traditions', 'Histoire', 'Tous niveaux', 'EPUB', '12 Mo', 'docs/histoire_peulhs.epub'),
(3, 1, 'Guide de rédaction de mémoire et thèse', 'Normes méthodologiques universitaires', 'Toutes filières', 'Master & Doctorat', 'PDF', '1.8 Mo', 'docs/guide_memoire.pdf');

-- Événements
INSERT INTO evenements (titre, slug, description, lieu, date_debut, capacite_max) VALUES
('Assemblée générale annuelle', 'ag-2026', 'Bilan moral et financier annuel de l association', 'Campus central — Amphi 500', '2026-09-14 14:00:00', 250),
('Forum entrepreneuriat des jeunes', 'forum-entrepreneuriat-2026', 'Rencontres et ateliers de création dentreprise', 'Chambre de commerce', '2026-10-02 09:00:00', 150),
('Soirée culturelle peulhe', 'soiree-culturelle-2026', 'Célébration des arts et traditions peulhes', 'Maison des associations', '2026-10-20 18:00:00', 400);

-- Catégories d'articles
INSERT INTO categories_articles (nom_categorie) VALUES
('Éducation'), ('Culture'), ('Partenariats'), ('Vie associative');

-- Articles
INSERT INTO articles (id_categorie_art, id_auteur, titre, slug, chapeau, contenu_html) VALUES
(4, 1, 'Lancement de la bibliothèque numérique AEPeS Library', 'lancement-aepes-library', 'Un nouvel espace pour accéder gratuitement à des cours et documents.', '<p>L AEPeS annonce le lancement officiel de sa plateforme...</p>');

-- Projets
INSERT INTO projets (titre_projet, categorie, description, objectif_beneficiaires, budget_fcfa, resultat_obtenu) VALUES
('Programme de tutorat universitaire', 'Éducation', 'Accompagnement des nouveaux bacheliers par des seniors', '300 bénéficiaires', 2400000.00, '92% de réussite'),
('Semaine culturelle peulhe', 'Culture', 'Événement annuel célébrant la langue fulfuldé et l artisanat', '600+ participants', 1800000.00, '8e édition réussie'),
('Incubateur de projets jeunes', 'Entrepreneuriat', 'Formations et micro-financements pour les porteurs de projet', '25 porteurs de projet', 5000000.00, '9 entreprises lancées');

-- Partenaires
INSERT INTO partenaires (nom_organisation, contact_nom, contact_email) VALUES
('Université de Ngaoundéré', 'Rectorat', 'contact@univ-ndere.cm'),
('Université de Maroua', 'Direction des affaires académiques', 'contact@univ-maroua.cm'),
('Université de Garoua', 'Secrétariat Général', 'contact@univ-garoua.cm');
