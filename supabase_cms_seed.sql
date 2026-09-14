-- AEPeS — Données initiales du CMS À propos & Équipe
-- À exécuter après supabase_auth_cms_migration.sql.
-- Ce script est idempotent : il ne crée pas de doublons s'il est relancé.

INSERT INTO public.contenu_apropos (section, titre, contenu, ordre)
SELECT v.section, v.titre, v.contenu, v.ordre
FROM (VALUES
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
) AS v(section, titre, contenu, ordre)
WHERE NOT EXISTS (
  SELECT 1 FROM public.contenu_apropos c
  WHERE c.section = v.section AND c.titre = v.titre
);

INSERT INTO public.equipe_dirigeante (nom, prenom, poste, description, photo_url, ordre, est_visible)
SELECT v.nom, v.prenom, v.poste, v.description, NULL, v.ordre, TRUE
FROM (VALUES
  ('Bâ', 'Amadou Diallo', 'Président', 'Étudiant en sciences politiques, engagé depuis 2019.', 1),
  ('Sow', 'Fatimata', 'Vice-Présidente', 'Responsable des relations universitaires.', 2),
  ('Barry', 'Ibrahima', 'Secrétaire Général', 'En charge de la coordination administrative.', 3),
  ('Diallo', 'Aïssatou', 'Trésorière Générale', 'Gestion financière et suivi des cotisations.', 4),
  ('Sy', 'Oumar', 'Responsable Commission Éducation', 'Pilote le programme de tutorat.', 5),
  ('Bah', 'Kadiatou', 'Responsable Commission Culture', 'Organise la semaine culturelle peulhe.', 6),
  ('Sané', 'Mamadou', 'Responsable Commission Entrepreneuriat', 'Anime l''incubateur de projets.', 7),
  ('Diallo', 'Ramatoulaye', 'Responsable Communication', 'Gère les actualités et réseaux sociaux.', 8)
) AS v(nom, prenom, poste, description, ordre)
WHERE NOT EXISTS (
  SELECT 1 FROM public.equipe_dirigeante e
  WHERE e.nom = v.nom AND e.prenom = v.prenom AND e.poste = v.poste
);

-- Demande à PostgREST de recharger immédiatement les nouvelles tables.
NOTIFY pgrst, 'reload schema';
