-- AEPeS — Rôles système requis par les profils Auth
-- Exécutable plusieurs fois sans créer de doublons.

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

SELECT setval(
  pg_get_serial_sequence('public.roles', 'id_role'),
  GREATEST((SELECT COALESCE(MAX(id_role), 1) FROM public.roles), 1),
  true
);

NOTIFY pgrst, 'reload schema';
