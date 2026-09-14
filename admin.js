/**
 * AEPeS — Moteur d'Administration Centralisé & CMS Complet
 * CRUD universel : Articles, Événements, Inscriptions & Billetterie, Projets, Bibliothèque, Galerie, Membres, Dons, Partenaires, Messages
 * Gestion complète du téléversement de fichiers / images (Supabase Storage) & Logs JSON structurés.
 */

const SUPABASE_URL = 'https://essfawtyyvhozmdotyqh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzc2Zhd3R5eXZob3ptZG90eXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNDA3ODcsImV4cCI6MjEwNDgxNjc4N30.xO3vhDCDkfuRIFnVbKG1Xl8-bg1F8rNQLFgIuWYvp3Q';

let sb = null;
const initSB = () => {
  if (!sb && window.supabase) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.supabaseClient = sb;
  }
  return sb;
};

// ─── Logs JSON structurés dans la console ─────────────────────────────────────
function logSB(operation, payload, result, error) {
  const isErr = !!error;
  console.groupCollapsed(
    `%c🚀 [AEPeS Supabase Admin] ${operation} ${isErr ? '❌ ERREUR' : '✅ SUCCÈS'}`,
    `color:${isErr ? '#ef4444' : '#10b981'};font-weight:bold;`
  );
  if (payload !== undefined && payload !== null) {
    console.log('📌 Payload envoyé (JSON):', JSON.parse(JSON.stringify(payload)));
  }
  if (result !== undefined && result !== null) {
    console.log('📦 Données reçues (JSON):', JSON.parse(JSON.stringify(result)));
  }
  if (error) {
    console.error('❌ Détail de l\'erreur (JSON):', JSON.parse(JSON.stringify(error)));
  }
  console.groupEnd();
}

// ─── CMS À PROPOS & ÉQUIPE ───────────────────────────────────────────────────
// Ces deux formulaires sont volontairement séparés du modal universel afin de
// conserver les champs éditoriaux et l'ordre d'affichage de chaque page.
function escapeAdminHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
}

async function loadAproposAdmin() {
  const tbody = document.getElementById('tbody-apropos');
  if (!tbody || !initSB()) return;
  const { data, error } = await sb.from('contenu_apropos').select('*').order('ordre', { ascending: true }).order('id_contenu', { ascending: true });
  if (error) { tbody.innerHTML = `<tr><td colspan="5" style="color:#DC2626;padding:16px;">${escapeAdminHtml(error.message)}</td></tr>`; return; }
  tbody.innerHTML = (data || []).length ? data.map(item => `<tr>
    <td><span class="badge blue">${escapeAdminHtml(item.section)}</span></td>
    <td><strong>${escapeAdminHtml(item.titre)}</strong></td>
    <td style="max-width:360px;white-space:normal;">${escapeAdminHtml(item.contenu)}</td>
    <td>${item.ordre ?? 1}</td>
    <td><a href="#" class="card-link" data-apropos-edit="${item.id_contenu}">Modifier</a> · <a href="#" class="card-link" style="color:#DC2626" data-apropos-delete="${item.id_contenu}">Supprimer</a></td>
  </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;padding:16px;">Aucun contenu enregistré.</td></tr>';
  tbody.querySelectorAll('[data-apropos-edit]').forEach(btn => btn.addEventListener('click', e => {
    e.preventDefault(); const item = data.find(row => String(row.id_contenu) === btn.dataset.aproposEdit); if (!item) return;
    document.getElementById('apropos-id').value = item.id_contenu;
    document.getElementById('apropos-section').value = item.section;
    document.getElementById('apropos-titre').value = item.titre;
    document.getElementById('apropos-contenu').value = item.contenu;
    document.getElementById('apropos-ordre').value = item.ordre || 1;
    document.getElementById('btn-cancel-apropos').style.display = 'inline-flex';
  }));
  tbody.querySelectorAll('[data-apropos-delete]').forEach(btn => btn.addEventListener('click', async e => {
    e.preventDefault(); if (!confirm('Supprimer cet élément de la page À propos ?')) return;
    const { error: deleteError } = await sb.from('contenu_apropos').delete().eq('id_contenu', btn.dataset.aproposDelete);
    if (deleteError) return toast(`Erreur suppression : ${deleteError.message}`, 'error');
    toast('Élément supprimé.'); loadAproposAdmin();
  }));
}

function initAproposForm() {
  const form = document.getElementById('form-add-apropos');
  if (!form || form.dataset.ready) return;
  form.dataset.ready = '1';
  const reset = () => { form.reset(); document.getElementById('apropos-id').value = ''; document.getElementById('apropos-ordre').value = 1; document.getElementById('btn-cancel-apropos').style.display = 'none'; };
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (!initSB()) return;
    const id = document.getElementById('apropos-id').value;
    const payload = { section: document.getElementById('apropos-section').value, titre: document.getElementById('apropos-titre').value.trim(), contenu: document.getElementById('apropos-contenu').value.trim(), ordre: Number(document.getElementById('apropos-ordre').value) || 1 };
    if (!payload.titre || !payload.contenu) return toast('Le titre et le contenu sont obligatoires.', 'error');
    const query = id ? sb.from('contenu_apropos').update(payload).eq('id_contenu', id) : sb.from('contenu_apropos').insert(payload);
    const { error } = await query;
    if (error) return toast(`Erreur enregistrement : ${error.message}`, 'error');
    toast(id ? 'Contenu mis à jour.' : 'Contenu ajouté.'); reset(); loadAproposAdmin();
  });
  document.getElementById('btn-cancel-apropos')?.addEventListener('click', reset);
  document.getElementById('btn-refresh-apropos')?.addEventListener('click', loadAproposAdmin);
  loadAproposAdmin();
}

async function loadEquipeAdmin() {
  const tbody = document.getElementById('tbody-equipe');
  if (!tbody || !initSB()) return;
  const { data, error } = await sb.from('equipe_dirigeante').select('*').order('ordre', { ascending: true }).order('id_membre_equipe', { ascending: true });
  if (error) { tbody.innerHTML = `<tr><td colspan="6" style="color:#DC2626;padding:16px;">${escapeAdminHtml(error.message)}</td></tr>`; return; }
  tbody.innerHTML = (data || []).length ? data.map(item => `<tr>
    <td>${item.photo_url ? `<img src="${escapeAdminHtml(item.photo_url)}" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">` : '—'}</td>
    <td><strong>${escapeAdminHtml(item.prenom)} ${escapeAdminHtml(item.nom)}</strong></td>
    <td>${escapeAdminHtml(item.poste)}</td><td>${item.ordre ?? 1}</td>
    <td><span class="badge ${item.est_visible ? 'green' : 'amber'}">${item.est_visible ? 'Visible' : 'Masqué'}</span></td>
    <td><a href="#" class="card-link" data-equipe-edit="${item.id_membre_equipe}">Modifier</a> · <a href="#" class="card-link" style="color:#DC2626" data-equipe-delete="${item.id_membre_equipe}">Supprimer</a></td>
  </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;padding:16px;">Aucun membre enregistré.</td></tr>';
  tbody.querySelectorAll('[data-equipe-edit]').forEach(btn => btn.addEventListener('click', e => {
    e.preventDefault(); const item = data.find(row => String(row.id_membre_equipe) === btn.dataset.equipeEdit); if (!item) return;
    for (const [id, value] of [['equipe-id', item.id_membre_equipe], ['equipe-prenom', item.prenom], ['equipe-nom', item.nom], ['equipe-poste', item.poste], ['equipe-description', item.description || ''], ['equipe-linkedin', item.linkedin_url || ''], ['equipe-twitter', item.twitter_url || ''], ['equipe-ordre', item.ordre || 1], ['equipe-photo-url', item.photo_url || '']]) document.getElementById(id).value = value;
    document.getElementById('equipe-visible').checked = item.est_visible !== false;
    document.getElementById('btn-cancel-equipe').style.display = 'inline-flex';
  }));
  tbody.querySelectorAll('[data-equipe-delete]').forEach(btn => btn.addEventListener('click', async e => {
    e.preventDefault(); if (!confirm('Supprimer ce membre de l’équipe dirigeante ?')) return;
    const { error: deleteError } = await sb.from('equipe_dirigeante').delete().eq('id_membre_equipe', btn.dataset.equipeDelete);
    if (deleteError) return toast(`Erreur suppression : ${deleteError.message}`, 'error');
    toast('Membre supprimé.'); loadEquipeAdmin();
  }));
}

function initEquipeForm() {
  const form = document.getElementById('form-add-equipe');
  if (!form || form.dataset.ready) return;
  form.dataset.ready = '1';
  const reset = () => { form.reset(); document.getElementById('equipe-id').value = ''; document.getElementById('equipe-ordre').value = 1; document.getElementById('btn-cancel-equipe').style.display = 'none'; };
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (!initSB()) return;
    const id = document.getElementById('equipe-id').value;
    const file = document.getElementById('equipe-file').files[0];
    let photoUrl = document.getElementById('equipe-photo-url').value.trim() || null;
    try {
      if (file) photoUrl = await uploadFileToBucket('photos_membres', file, 'equipe');
      const payload = { prenom: document.getElementById('equipe-prenom').value.trim(), nom: document.getElementById('equipe-nom').value.trim(), poste: document.getElementById('equipe-poste').value.trim(), description: document.getElementById('equipe-description').value.trim() || null, linkedin_url: document.getElementById('equipe-linkedin').value.trim() || null, twitter_url: document.getElementById('equipe-twitter').value.trim() || null, ordre: Number(document.getElementById('equipe-ordre').value) || 1, est_visible: document.getElementById('equipe-visible').checked, ...(photoUrl ? { photo_url: photoUrl } : {}) };
      if (!payload.prenom || !payload.nom || !payload.poste) return toast('Prénom, nom et poste sont obligatoires.', 'error');
      const query = id ? sb.from('equipe_dirigeante').update(payload).eq('id_membre_equipe', id) : sb.from('equipe_dirigeante').insert(payload);
      const { error } = await query; if (error) throw error;
      toast(id ? 'Membre mis à jour.' : 'Membre ajouté.'); reset(); loadEquipeAdmin();
    } catch (err) { toast(`Erreur enregistrement : ${err.message}`, 'error'); }
  });
  document.getElementById('btn-cancel-equipe')?.addEventListener('click', reset);
  document.getElementById('btn-refresh-equipe')?.addEventListener('click', loadEquipeAdmin);
  loadEquipeAdmin();
}

// Authentification admin réelle. Le listener en capture neutralise l'ancien
// handler de compatibilité afin qu'aucun mot de passe local ne puisse ouvrir le panneau.
document.addEventListener('submit', async event => {
  if (event.target?.id !== 'form-admin-login') return;
  event.preventDefault(); event.stopImmediatePropagation();
  const form = event.target, email = document.getElementById('admin-email-input')?.value.trim(), password = document.getElementById('admin-pass-input')?.value || '';
  const overlay = document.getElementById('admin-auth-overlay'), button = document.getElementById('admin-login-btn');
  if (!initSB()) return toast('Supabase est indisponible.', 'error');
  if (button) { button.disabled = true; button.textContent = 'Vérification en cours…'; }
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error;
    const { data: profile, error: profileError } = await sb.from('profils').select('*,roles(code,libelle)').eq('id', data.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile) throw new Error('Ce compte Auth ne possède pas encore de profil administratif.');
    const roleCode = profile.role_code || profile.roles?.code || ROLE_META_MAP[profile.id_role]?.code || 'MEMBRE';
    if (profile.statut !== 'actif' || roleCode === 'MEMBRE') { await sb.auth.signOut(); throw new Error('Compte suspendu ou droits administratifs insuffisants.'); }
    const user = { ...profile, role_code: roleCode, role_libelle: profile.roles?.libelle || ROLE_META_MAP[profile.id_role]?.label || 'Administrateur' };
    setAdminUserSession(user); overlay.style.display = 'none'; document.body.style.overflow = 'auto';
    toast(`Bienvenue ${user.prenom || ''} !`); location.reload();
  } catch (err) { await sb.auth.signOut(); toast(/invalid login credentials/i.test(err.message || '') ? 'Email ou mot de passe incorrect.' : err.message, 'error'); }
  finally { if (button) { button.disabled = false; button.textContent = 'Se connecter au tableau de bord'; } }
}, true);

document.addEventListener('DOMContentLoaded', async () => {
  if (!initSB()) return;
  const overlay = document.getElementById('admin-auth-overlay');
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) {
    window.__aepesAdminSessionVerified = false;
    sessionStorage.removeItem('aepes_admin_auth');
    sessionStorage.removeItem('aepes_admin_user');
    if (overlay) overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    return;
  }
  const { data: profile, error } = await sb.from('profils').select('*,roles(code,libelle)').eq('id', session.user.id).maybeSingle();
  const roleCode = profile?.role_code || profile?.roles?.code || ROLE_META_MAP[profile?.id_role]?.code || 'MEMBRE';
  if (error || !profile || profile.statut !== 'actif' || roleCode === 'MEMBRE') {
    window.__aepesAdminSessionVerified = false;
    await sb.auth.signOut(); sessionStorage.clear();
    if (overlay) overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (profile) toast('Ce compte ne dispose pas de droits administratifs actifs.', 'error');
    return;
  }
  const user = { ...profile, role_code: roleCode, role_libelle: profile.roles?.libelle || ROLE_META_MAP[profile.id_role]?.label || 'Administrateur' };
  window.__aepesAdminSessionVerified = true;
  setAdminUserSession(user);
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = 'auto';
  applyAdminPermissionsSafely(user);
  loadAllSections();
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') location.href = 'admin.html';
  });
});

function applyAdminPermissionsSafely(user) {
  const allowed = ROLE_PERMISSIONS[user.role_code] || ['sec-dashboard'];
  document.querySelectorAll('.admin-nav a[data-section]').forEach(link => {
    const li = link.closest('li'); if (li) li.style.display = allowed.includes(link.dataset.section) ? 'block' : 'none';
  });
  const name = document.getElementById('current-admin-name'); if (name) name.textContent = `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Administrateur';
  const role = document.getElementById('current-admin-role'); if (role) { role.textContent = user.role_libelle; role.className = `badge ${ROLE_META_MAP[user.id_role]?.badge || 'blue'}`; }
  const avatar = document.getElementById('current-admin-avatar'); if (avatar && user.avatar_url) avatar.innerHTML = `<img src="${escapeAdminHtml(user.avatar_url)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="Avatar">`;
  const active = document.querySelector('.admin-section:not([style*="display: none"])');
  if (active && !allowed.includes(active.id)) document.querySelector(`a[data-section="${allowed[0]}"]`)?.click();
}

// ─── Toast Notifications ──────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  let t = document.getElementById('aepes-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'aepes-toast';
    Object.assign(t.style, {
      position: 'fixed', bottom: '28px', right: '28px',
      padding: '14px 22px', borderRadius: '6px', fontSize: '14px',
      zIndex: '99999', display: 'flex', alignItems: 'center', gap: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,.25)',
      transition: 'opacity .3s, transform .3s',
      maxWidth: '420px', lineHeight: '1.4'
    });
    document.body.appendChild(t);
  }
  t.style.background = type === 'error' ? '#C0392B' : '#0F2A52';
  t.style.color = '#fff';
  t.innerHTML = `<span style="font-size:18px">${type === 'error' ? '✗' : '✓'}</span><div>${msg}</div>`;
  t.style.opacity = '1';
  t.style.transform = 'translateY(0)';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; }, 5000);
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────
const qs  = (s, c = document) => c.querySelector(s);
const qsa = (s, c = document) => [...c.querySelectorAll(s)];
const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtFull = d => d ? new Date(d).toLocaleString('fr-FR') : '—';
const slugify = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const badge = (txt, cls) => `<span class="badge ${cls}">${txt}</span>`;
const tr = (cells) => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
const buildTbody = (tbody, rows) => {
  if (!tbody) return;
  tbody.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="10" style="color:#718096;padding:16px;text-align:center;">Aucune donnée enregistrée.</td></tr>';
};

// ─── Téléversement de fichier vers Supabase Storage ───────────────────────────
async function uploadFileToBucket(bucket, file, prefix = 'media') {
  if (!file) return null;
  if (!initSB()) throw new Error('Client Supabase non disponible pour upload');
  
  const ext = file.name.split('.').pop() || 'dat';
  const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filePath = `${prefix}_${Date.now()}_${cleanName}.${ext}`;

  logSB(`Upload vers Bucket '${bucket}'`, { fileName: file.name, sizeBytes: file.size, mimeType: file.type, targetPath: filePath });

  const { data, error } = await sb.storage.from(bucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true
  });

  if (error) {
    logSB(`Erreur Upload Storage '${bucket}'`, { filePath }, null, error);
    throw error;
  }

  const { data: { publicUrl } } = sb.storage.from(bucket).getPublicUrl(filePath);
  logSB(`Upload Réussi '${bucket}'`, { filePath }, { publicUrl }, null);
  return publicUrl;
}

// ─── Action Suppression Universelle ──────────────────────────────────────────
const delBtn = (table, col, id, confirmMsg = 'Confirmer la suppression définitive ?') =>
  `<a href="#" class="card-link" style="color:#DC2626;font-weight:600;" onclick="event.preventDefault();if(confirm('${confirmMsg}')){window.adminDelete('${table}','${col}',${typeof id==='string'?`'${id}'`:id},this.closest('tr'))}">Supprimer</a>`;

window.adminDelete = async (table, col, id, row) => {
  if (!initSB()) return;
  try {
    logSB(`DELETE ${table}`, { [col]: id });
    let data, error;
    if (table === 'profils' && col === 'id') {
      ({ data, error } = await sb.functions.invoke('manage-admin', { body: { action: 'delete', user_id: id } }));
      if (!error && data?.error) error = new Error(data.error);
    } else {
      ({ data, error } = await sb.from(table).delete().eq(col, id));
    }
    if (error) {
      logSB(`Erreur DELETE ${table}`, { [col]: id }, null, error);
      toast(`Erreur suppression: ${error.message}`, 'error');
      return;
    }
    logSB(`Succès DELETE ${table}`, { [col]: id }, data);
    row?.remove();
    toast(`Enregistrement supprimé de ${table}.`);
    loadKPIs();
  } catch (err) {
    toast(`Erreur: ${err.message}`, 'error');
  }
};

// ─── Action Modification Universelle ─────────────────────────────────────────
const editBtn = (table, idCol, idVal) =>
  `<a href="#" class="card-link" style="color:#1F5390;font-weight:600;margin-right:8px;" onclick="event.preventDefault();window.openEditModal('${table}','${idCol}',${typeof idVal==='string'?`'${idVal}'`:idVal})">Modifier</a>`;

// ─── Matrice des Rôles & Permissions d'Accès Administratifs ────────────────────
/* Legacy demo profiles intentionally disabled. Authentication is Supabase Auth only.
const PRESET_ADMIN_PROFILES = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    id_role: 1,
    role_code: 'SUPER_ADMIN',
    role_libelle: 'Super Administrateur',
    email: 'admin@aepes.org',
    nom: 'Diallo',
    prenom: 'Ramatoulaye',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    statut: 'actif',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: '11111111-1111-1111-1111-111111111112',
    id_role: 2,
    role_code: 'ADMIN',
    role_libelle: 'Secrétaire Général / Admin',
    email: 'secretaire@aepes.org',
    nom: 'Sow',
    prenom: 'Moussa',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    statut: 'actif',
    created_at: '2026-01-05T00:00:00Z'
  },
  {
    id: '11111111-1111-1111-1111-111111111113',
    id_role: 3,
    role_code: 'TRESORIER',
    role_libelle: 'Trésorier Général',
    email: 'tresorier@aepes.org',
    nom: 'Barry',
    prenom: 'Oumarou',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    statut: 'actif',
    created_at: '2026-01-08T00:00:00Z'
  },
  {
    id: '11111111-1111-1111-1111-111111111114',
    id_role: 4,
    role_code: 'EDITEUR',
    role_libelle: 'Responsable Communication & Médias',
    email: 'communication@aepes.org',
    nom: 'Diallo',
    prenom: 'Aïssatou',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    statut: 'actif',
    created_at: '2026-01-10T00:00:00Z'
  },
  {
    id: '11111111-1111-1111-1111-111111111115',
    id_role: 5,
    role_code: 'RESP_PROJET',
    role_libelle: 'Responsable Projets & Activités',
    email: 'projets@aepes.org',
    nom: 'Bah',
    prenom: 'Mamadou',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    statut: 'actif',
    created_at: '2026-01-12T00:00:00Z'
  },
  {
    id: '11111111-1111-1111-1111-111111111116',
    id_role: 6,
    role_code: 'RESP_EDUCATION',
    role_libelle: 'Responsable Éducation & Bibliothèque',
    email: 'education@aepes.org',
    nom: 'Bâ',
    prenom: 'Fatimata',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    statut: 'actif',
    created_at: '2026-01-15T00:00:00Z'
  }
]; */
const PRESET_ADMIN_PROFILES = [];

const ROLE_PERMISSIONS = {
  'SUPER_ADMIN': ['sec-dashboard', 'sec-roles', 'sec-settings', 'sec-apropos', 'sec-articles', 'sec-events', 'sec-projects', 'sec-library', 'sec-gallery', 'sec-members', 'sec-donations', 'sec-partners', 'sec-messages'],
  'ADMIN': ['sec-dashboard', 'sec-members', 'sec-events', 'sec-messages', 'sec-gallery', 'sec-partners'],
  'TRESORIER': ['sec-dashboard', 'sec-donations', 'sec-members'],
  'EDITEUR': ['sec-dashboard', 'sec-apropos', 'sec-articles', 'sec-gallery', 'sec-events', 'sec-partners'],
  'RESP_COMM': ['sec-dashboard', 'sec-apropos', 'sec-articles', 'sec-gallery', 'sec-events', 'sec-partners'],
  'RESP_PROJET': ['sec-dashboard', 'sec-projects', 'sec-gallery', 'sec-events'],
  'RESP_EDUCATION': ['sec-dashboard', 'sec-library', 'sec-events', 'sec-projects'],
  'MEMBRE': ['sec-dashboard']
};

const ROLE_META_MAP = {
  1: { code: 'SUPER_ADMIN', label: 'Super Administrateur', badge: 'purple' },
  2: { code: 'ADMIN', label: 'Secrétaire Général / Admin', badge: 'blue' },
  3: { code: 'TRESORIER', label: 'Trésorier Général', badge: 'green' },
  4: { code: 'EDITEUR', label: 'Responsable Communication', badge: 'amber' },
  5: { code: 'RESP_PROJET', label: 'Responsable Projets', badge: 'teal' },
  6: { code: 'RESP_EDUCATION', label: 'Responsable Éducation', badge: 'indigo' },
  7: { code: 'MEMBRE', label: 'Membre Adhérent', badge: 'blue' }
};

function getAdminUserSession() {
  try {
    const raw = sessionStorage.getItem('aepes_admin_user') || localStorage.getItem('aepes_admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setAdminUserSession(user) {
  sessionStorage.setItem('aepes_admin_user', JSON.stringify(user));
}

// ══════════════════════════════════════════════════════════════════════════════
//  INITIALISATION DE L'ADMINISTRATION
// ══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initSB();

  // ─── 1. VERROU D'ACCÈS & AUTHENTIFICATION MULTI-RÔLES ──────────────────────
  const overlay     = document.getElementById('admin-auth-overlay');
  const loginForm   = document.getElementById('form-admin-login');
  const emailInput  = document.getElementById('admin-email-input');
  const passInput   = document.getElementById('admin-pass-input');
  const logoutBtn   = document.getElementById('admin-logout-btn');

  // Application du contrôle d'accès basé sur les rôles (RBAC)
  function applyRolePermissions(user) {
    if (!user) return;

    // Mise à jour de l'affichage du profil dans la barre supérieure
    const nameEl   = document.getElementById('current-admin-name');
    const roleEl   = document.getElementById('current-admin-role');
    const avatarEl = document.getElementById('current-admin-avatar');

    if (nameEl) nameEl.textContent = `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Administrateur';
    if (roleEl) {
      const meta = ROLE_META_MAP[user.id_role] || { badge: 'purple', label: user.role_libelle || 'Administrateur' };
      roleEl.className = `badge ${meta.badge}`;
      roleEl.textContent = user.role_libelle || meta.label;
    }
    if (avatarEl) {
      if (user.avatar_url) {
        avatarEl.innerHTML = `<img src="${user.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="Avatar">`;
      } else {
        const initials = `${(user.prenom||'A')[0]}${(user.nom||'D')[0]}`.toUpperCase();
        avatarEl.textContent = initials;
      }
    }

    // Filtrage des éléments de navigation selon la matrice de permissions
    const allowedSections = ROLE_PERMISSIONS[user.role_code] || ROLE_PERMISSIONS['ADMIN'] || ['sec-dashboard'];
    const navLinks = qsa('.admin-nav a[data-section]');

    navLinks.forEach(link => {
      const targetSec = link.dataset.section;
      const li = link.closest('li');
      const isAllowed = allowedSections.includes(targetSec);
      if (li) li.style.display = isAllowed ? 'block' : 'none';
    });

    // Masquage des titres de sections de navigation si tous leurs enfants sont masqués
    qsa('.admin-nav .section-label').forEach(label => {
      let nextLi = label.nextElementSibling;
      let hasVisibleChild = false;
      while (nextLi && nextLi.tagName === 'LI') {
        if (nextLi.style.display !== 'none') {
          hasVisibleChild = true;
          break;
        }
        nextLi = nextLi.nextElementSibling;
      }
      label.style.display = hasVisibleChild ? 'block' : 'none';
    });

    // Redirection si l'utilisateur est sur une section non autorisée
    const activeSection = document.querySelector('.admin-section:not([style*="display: none"])');
    if (activeSection && !allowedSections.includes(activeSection.id)) {
      const firstAllowedLink = document.querySelector(`.admin-nav a[data-section="${allowedSections[0]}"]`);
      if (firstAllowedLink) firstAllowedLink.click();
    }
  }

  const checkAuth = () => {
    const isAuth = window.__aepesAdminSessionVerified === true;
    let currentUser = getAdminUserSession();

    if (isAuth && !currentUser) {
      // Fallback par défaut sur le Super Administrateur
      currentUser = PRESET_ADMIN_PROFILES[0];
      setAdminUserSession(currentUser);
    }

    if (overlay) {
      overlay.style.display = (isAuth && currentUser) ? 'none' : 'flex';
      document.body.style.overflow = (isAuth && currentUser) ? 'auto' : 'hidden';
    }

    if (isAuth && currentUser) {
      applyRolePermissions(currentUser);
      loadAllSections();
    }
  };

  // Traitement de la connexion avec vérification de rôle
  const handleLogin = async (email, pwd) => {
    logSB('Tentative connexion Admin', { email });

    let authenticatedUser = null;

    // 1. Recherche dans Supabase profils
    if (initSB()) {
      try {
        const { data, error } = await sb.from('profils')
          .select('*, roles(*)')
          .eq('email', email)
          .single();

        if (data) {
          const roleCode = data.roles?.code || (ROLE_META_MAP[data.id_role]?.code) || 'ADMIN';
          const roleLabel = data.roles?.libelle || (ROLE_META_MAP[data.id_role]?.label) || 'Administrateur';
          authenticatedUser = {
            id: data.id,
            id_role: data.id_role || 2,
            role_code: roleCode,
            role_libelle: roleLabel,
            email: data.email,
            nom: data.nom,
            prenom: data.prenom,
            avatar_url: data.avatar_url,
            statut: data.statut || 'actif'
          };
        }
      } catch (err) {
        console.warn('[AEPeS Auth] Supabase check fallback:', err.message);
      }
    }

    // 2. Recherche dans les profils prédéfinis locaux si non trouvé dans Supabase
    if (!authenticatedUser) {
      const match = PRESET_ADMIN_PROFILES.find(p => p.email.toLowerCase() === email.toLowerCase());
      if (match && false) {
        authenticatedUser = match;
      }
    }

    // 3. Fallback générique si mot de passe admin master utilisé
    if (!authenticatedUser && false) {
      authenticatedUser = {
        id: '11111111-1111-1111-1111-111111111111',
        id_role: 1,
        role_code: 'SUPER_ADMIN',
        role_libelle: 'Super Administrateur',
        email: email || 'admin@aepes.org',
        nom: 'Diallo',
        prenom: 'Ramatoulaye',
        statut: 'actif'
      };
    }

    if (authenticatedUser) {
      setAdminUserSession(authenticatedUser);
      checkAuth();
      toast(`Bienvenue ${authenticatedUser.prenom} ! Connecté en tant que ${authenticatedUser.role_libelle}.`);
    } else {
      toast('Identifiants incorrects. Vérifiez votre email et mot de passe administratif.', 'error');
    }
  };

  if (false) loginForm?.addEventListener('submit', e => {
    e.preventDefault();
    const email = emailInput?.value?.trim() || '';
    const pwd   = passInput?.value?.trim() || '';
    handleLogin(email, pwd);
  });

  // Raccourcis pour les profils démo
  qsa('#demo-role-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
      const email = btn.dataset.email;
      const pwd   = btn.dataset.pwd;
      if (emailInput) emailInput.value = email;
      if (passInput) passInput.value = pwd;
      handleLogin(email, pwd);
    });
  });

  logoutBtn?.addEventListener('click', async e => {
    e.preventDefault();
    window.__aepesAdminSessionVerified = false;
    await sb?.auth.signOut();
    sessionStorage.removeItem('aepes_admin_auth');
    sessionStorage.removeItem('aepes_admin_user');
    localStorage.removeItem('aepes_admin_auth');
    localStorage.removeItem('aepes_admin_user');
    window.location.href = 'admin.html';
  });

  // ─── 0. GESTION DU DRAWER MOBILE SIDEBAR ───────────────────────────────────
  const sidebar       = document.getElementById('admin-sidebar');
  const drawerOverlay = document.getElementById('admin-drawer-overlay');
  const drawerToggle  = document.getElementById('admin-drawer-toggle');
  const drawerClose   = document.getElementById('admin-drawer-close');

  const openDrawer = () => {
    if (sidebar) sidebar.classList.add('open');
    if (drawerOverlay) drawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    if (sidebar) sidebar.classList.remove('open');
    if (drawerOverlay) drawerOverlay.classList.remove('active');
    const isAuth = window.__aepesAdminSessionVerified === true;
    document.body.style.overflow = isAuth ? 'auto' : 'hidden';
  };

  drawerToggle?.addEventListener('click', e => {
    e.stopPropagation();
    openDrawer();
  });
  drawerClose?.addEventListener('click', closeDrawer);
  drawerOverlay?.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
  });

  checkAuth();

  // ─── 2. NAVIGATION ENTRE SECTIONS ─────────────────────────────────────────
  const navLinks = qsa('.admin-nav a[data-section]');
  const sections = qsa('.admin-section');

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const currentUser = getAdminUserSession() || PRESET_ADMIN_PROFILES[0];
      const target = link.dataset.section;
      const allowed = ROLE_PERMISSIONS[currentUser.role_code] || ROLE_PERMISSIONS['ADMIN'] || ['sec-dashboard'];

      if (!allowed.includes(target)) {
        toast(`Accès refusé : Votre rôle (${currentUser.role_libelle}) n'a pas les droits pour cette section.`, 'error');
        return;
      }

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      sections.forEach(sec => { sec.style.display = sec.id === target ? 'block' : 'none'; });

      // Fermeture automatique du drawer sur mobile après le clic
      closeDrawer();
    });
  });

  // ─── 3. FORMULAIRES DE GESTION ────────────────────────────────────────────
  initRolesForm();
  initSettingsForm();
  initAproposForm();
  initEquipeForm();
  initArticleForm();
  initEventForm();
  initProjectForm();
  initLibraryForm();
  initGalleryForm();
  initDonationForm();
  initPartnerForm();
  initUniversalEditModal();
  initEventAttendeesModal();
  initMessageModal();

  // ─── 4. FILTRES MEMBRES ──────────────────────────────────────────────────
  qsa('.member-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.member-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      loadMembresTable('#sec-members-tbody', f === 'all' ? {} : { statut_adhesion: f }, 100);
    });
  });
});

// ── 1.5. Formulaire Gestion des Administrateurs & Rôles (Super Admin) ─────────
function initRolesForm() {
  const form = document.getElementById('form-add-admin-user');
  const genPwdBtn = document.getElementById('btn-gen-pwd');
  const pwdInput = document.getElementById('adm-user-pwd');
  const refreshBtn = document.getElementById('btn-refresh-admins');

  genPwdBtn?.addEventListener('click', () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let p = 'Aepes_';
    for (let i = 0; i < 6; i++) p += chars.charAt(Math.floor(Math.random() * chars.length));
    if (pwdInput) pwdInput.value = p;
    toast('Nouveau mot de passe généré.');
  });

  refreshBtn?.addEventListener('click', () => {
    loadAdminUsersTable();
    toast('Liste des administrateurs actualisée.');
  });

  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const currentUser = getAdminUserSession();
    if (currentUser?.role_code !== 'SUPER_ADMIN') {
      toast('Action non autorisée : Seul le Super Administrateur peut créer des comptes administrateurs.', 'error');
      return;
    }

    const nom       = qs('#adm-user-nom')?.value.trim();
    const prenom    = qs('#adm-user-prenom')?.value.trim();
    const email     = qs('#adm-user-email')?.value.trim().toLowerCase();
    const pwd       = qs('#adm-user-pwd')?.value.trim() || '';
    const idRole    = parseInt(qs('#adm-user-role')?.value || '2');
    const statut    = qs('#adm-user-statut')?.value || 'actif';
    const file      = qs('#adm-user-file')?.files[0];
    const urlInp    = qs('#adm-user-avatar-url')?.value.trim();

    if (!nom || !prenom || !email) {
      toast('Nom, prénom et email sont obligatoires.', 'error');
      return;
    }

    const btn = qs('[type=submit]', form);
    if (btn) { btn.disabled = true; btn.textContent = 'Création du profil en cours…'; }

    try {
      let avatarUrl = urlInp || null;
      if (file) {
        avatarUrl = await uploadFileToBucket('photos_membres', file, 'admin');
      }

      const { data, error } = await sb.functions.invoke('manage-admin', {
        body: { action: 'create', email, password: pwd, nom, prenom, id_role: idRole, avatar_url: avatarUrl, statut }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast(`Compte administrateur créé avec succès pour ${prenom} ${nom} !`);
      form.reset();
      if (pwdInput) pwdInput.value = '';
      loadAdminUsersTable();
    } catch (err) {
      logSB('Erreur INSERT profils', null, null, err);
      toast(`Erreur création profil: ${err.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '+ Enregistrer et délivrer les accès'; }
    }
  });
}

// ── Chargement de la table des administrateurs ──────────────────────────────
window.toggleAdminPwd = (btn, pwd) => {
  const span = btn.previousElementSibling;
  if (!span) return;
  if (span.textContent === '••••••••') {
    span.textContent = pwd;
    span.style.fontFamily = 'monospace';
    span.style.fontWeight = '700';
    span.style.color = '#0F2A52';
    btn.textContent = '🙈';
    btn.title = 'Masquer le mot de passe';
  } else {
    span.textContent = '••••••••';
    span.style.fontFamily = 'inherit';
    span.style.fontWeight = 'normal';
    span.style.color = 'inherit';
    btn.textContent = '👁️';
    btn.title = 'Afficher le mot de passe';
  }
};

async function loadAdminUsersTable() {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  const currentUser = getAdminUserSession();
  let adminList = [];

  if (initSB()) {
    try {
      const { data, error } = await sb.from('profils')
        .select('*, roles(*)')
        .order('created_at', { ascending: false });

      if (!error && data?.length) {
        adminList = data;
      }
    } catch (err) {
      console.warn('[AEPeS] Erreur lecture profils Supabase:', err);
    }
  }

  // Une liste vide est un état réel : aucun compte ne doit être inventé côté client.

  const rows = adminList.map(u => {
    const meta = ROLE_META_MAP[u.id_role] || { code: 'ADMIN', label: u.roles?.libelle || 'Administrateur', badge: 'blue' };
    const roleLabel = u.roles?.libelle || meta.label;
    const roleBadge = `<span class="badge ${meta.badge}">${roleLabel}</span>`;

    const avatarHtml = u.avatar_url
      ? `<img src="${u.avatar_url}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;" alt="${u.nom}">`
      : `<div style="width:34px;height:34px;border-radius:50%;background:var(--indigo-900);color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${(u.prenom||'A')[0]}${(u.nom||'D')[0]}</div>`;

    const isSelf = currentUser && (currentUser.id === u.id || currentUser.email?.toLowerCase() === u.email?.toLowerCase());

    const actionDelete = isSelf
      ? `<span style="font-size:11.5px;color:var(--ink-soft);font-style:italic;">(Session active)</span>`
      : delBtn('profils', 'id', u.id, `Supprimer définitivement l'administrateur ${u.prenom} ${u.nom} ?`);

    return tr([
      avatarHtml,
      `<strong>${u.prenom || ''} ${u.nom || ''}</strong>`,
      `<code style="background:var(--blue-100);color:var(--indigo-900);padding:2px 6px;border-radius:4px;font-size:12px;">${u.email}</code>`,
      roleBadge,
      `<span style="font-size:12px;color:var(--ink-soft);">Géré par Supabase Auth</span>`,
      badge(u.statut || 'actif', u.statut === 'actif' ? 'green' : 'amber'),
      fmt(u.created_at),
      `<div style="display:flex;align-items:center;gap:6px;">${editBtn('profils', 'id', u.id)} ${actionDelete}</div>`
    ]);
  });

  buildTbody(tbody, rows);
}

// ── 3. Paramètres du site & Visuels (CMS) ───────────────────────────────────
function initSettingsForm() {
  const form = document.getElementById('form-site-settings');
  if (!form) return;

  const defaults = {
    site_nom: 'AEPeS — Association des Étudiants Peulhs du Sud',
    site_slogan: "Unir la jeunesse peulhe autour de l'éducation et de la culture.",
    site_description: "L'AEPeS accompagne les étudiants peulhs du Sud dans leur réussite académique.",
    hero_image_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1000',
    president_photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    contact_email: 'contact@aepes.org', contact_telephone: '+237 690 12 34 56',
    contact_adresse: 'Campus universitaire, Zone Sud',
    president_nom: 'Amadou Diallo Bâ',
    president_citation: '« Notre force vient de notre unité. »',
    stat_membres: '1 200+', stat_projets: '45', stat_universites: '18', stat_annees: '12'
  };

  const loadSettings = async () => {
    let s = { ...defaults };
    const cached = localStorage.getItem('aepes_site_settings');
    if (cached) try { s = { ...s, ...JSON.parse(cached) }; } catch {}
    if (initSB()) {
      logSB('SELECT parametres_site', {});
      const { data, error } = await sb.from('parametres_site').select('*');
      if (data?.length) {
        logSB('SELECT parametres_site', {}, data);
        data.forEach(row => { s[row.cle] = row.valeur; });
        localStorage.setItem('aepes_site_settings', JSON.stringify(s));
      }
    }
    for (const [k, v] of Object.entries(s)) {
      const el = document.getElementById(`setting-${k}`);
      if (el) el.value = v;
    }
  };

  loadSettings();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = qs('[type=submit]', form);
    if (btn) { btn.disabled = true; btn.textContent = 'Téléversement & Enregistrement…'; }

    try {
      if (!initSB()) throw new Error('Supabase non disponible');

      const heroFile = qs('#setting-hero_file')?.files[0];
      const presFile = qs('#setting-president_file')?.files[0];

      if (heroFile) {
        const heroUrl = await uploadFileToBucket('articles_covers', heroFile, 'hero');
        qs('#setting-hero_image_url').value = heroUrl;
      }
      if (presFile) {
        const presUrl = await uploadFileToBucket('photos_membres', presFile, 'president');
        qs('#setting-president_photo_url').value = presUrl;
      }

      const newSettings = {};
      qsa('input:not([type=file]), textarea', form).forEach(el => {
        newSettings[el.id.replace('setting-', '')] = el.value.trim();
      });
      localStorage.setItem('aepes_site_settings', JSON.stringify(newSettings));

      const upserts = Object.entries(newSettings).map(([cle, valeur]) => ({
        cle, valeur, updated_at: new Date().toISOString()
      }));

      logSB('UPSERT parametres_site', upserts);
      const { error } = await sb.from('parametres_site').upsert(upserts, { onConflict: 'cle' });
      if (error) throw error;

      toast('Paramètres & Visuels du site enregistrés et synchronisés !');
    } catch (err) {
      logSB('Erreur UPSERT parametres_site', null, null, err);
      toast(`Erreur enregistrement: ${err.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer les modifications du site & Visuels'; }
    }
  });
}

// ── 4. Formulaire Article ───────────────────────────────────────────────────
function initArticleForm() {
  const form = document.getElementById('form-add-article');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const titre   = qs('#art-titre')?.value.trim();
    const cat     = parseInt(qs('#art-categorie')?.value || 1);
    const chapeau = qs('#art-chapeau')?.value.trim();
    const contenu = qs('#art-contenu')?.value.trim();
    const file    = qs('#art-file')?.files[0];
    const urlInp  = qs('#art-img-url')?.value.trim();

    if (!titre || !chapeau || !contenu) {
      toast('Veuillez renseigner le titre, résumé et contenu.', 'error');
      return;
    }

    const btn = qs('[type=submit]', form);
    if (btn) { btn.disabled = true; btn.textContent = 'Publication en cours…'; }

    try {
      if (!initSB()) throw new Error('Supabase non connecté');

      let coverUrl = urlInp || null;
      if (file) {
        coverUrl = await uploadFileToBucket('articles_covers', file, 'article');
      }

      const payload = {
        titre,
        id_categorie_art: cat,
        chapeau,
        contenu_html: `<p>${contenu.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`,
        slug: `${slugify(titre)}-${Date.now()}`,
        image_couverture_url: coverUrl,
        est_publie: true
      };

      logSB('INSERT articles', payload);
      const { data: inserted, error } = await sb.from('articles').insert([payload]).select().single();
      if (error) throw error;

      logSB('INSERT articles Résultat', payload, inserted);
      toast(`Article "${titre}" publié avec succès !`);
      form.reset();
      loadArticlesTable();
      loadKPIs();
    } catch (err) {
      logSB('Erreur INSERT articles', null, null, err);
      toast(`Erreur publication: ${err.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '+ Publier l\'article'; }
    }
  });
}

// ── 5. Formulaire Événement ─────────────────────────────────────────────────
function initEventForm() {
  const form = document.getElementById('form-add-event');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const titre  = qs('#ev-titre')?.value.trim();
    const lieu   = qs('#ev-lieu')?.value.trim();
    const date   = qs('#ev-date')?.value;
    const cap    = parseInt(qs('#ev-capacite')?.value || 150);
    const desc   = qs('#ev-desc')?.value.trim();
    const file   = qs('#ev-file')?.files[0];
    const urlInp = qs('#ev-img-url')?.value.trim();

    if (!titre || !lieu || !date) {
      toast('Titre, lieu et date sont obligatoires.', 'error');
      return;
    }

    const btn = qs('[type=submit]', form);
    if (btn) { btn.disabled = true; btn.textContent = 'Création…'; }

    try {
      if (!initSB()) throw new Error('Supabase non connecté');

      let flyerUrl = urlInp || null;
      if (file) {
        flyerUrl = await uploadFileToBucket('galerie_photos', file, 'event');
      }

      const payload = {
        titre,
        lieu,
        date_debut: new Date(date).toISOString(),
        capacite_max: cap,
        description: desc || null,
        image_url: flyerUrl,
        slug: `${slugify(titre)}-${Date.now()}`,
        est_publie: true
      };

      logSB('INSERT evenements', payload);
      const { data: inserted, error } = await sb.from('evenements').insert([payload]).select().single();
      if (error) throw error;

      logSB('INSERT evenements Résultat', payload, inserted);
      toast(`Événement "${titre}" créé avec succès !`);
      form.reset();
      loadEventsTable();
      loadKPIs();
    } catch (err) {
      logSB('Erreur INSERT evenements', null, null, err);
      toast(`Erreur création: ${err.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '+ Créer l\'événement'; }
    }
  });
}

// ── 6. Formulaire Projet & Activités ────────────────────────────────────────
function initProjectForm() {
  const form = document.getElementById('form-add-project');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const titre  = qs('#proj-titre')?.value.trim();
    const cat    = qs('#proj-cat')?.value;
    const budget = parseFloat(qs('#proj-budget')?.value) || 0;
    const benef  = qs('#proj-benef')?.value.trim();
    const statut = qs('#proj-statut')?.value || 'en_cours';
    const desc   = qs('#proj-desc')?.value.trim();
    const file   = qs('#proj-file')?.files[0];
    const urlInp = qs('#proj-img-url')?.value.trim();

    if (!titre) {
      toast('Le titre du projet est obligatoire.', 'error');
      return;
    }

    const btn = qs('[type=submit]', form);
    if (btn) { btn.disabled = true; btn.textContent = 'Ajout du projet…'; }

    try {
      if (!initSB()) throw new Error('Supabase non connecté');

      let coverUrl = urlInp || null;
      if (file) {
        coverUrl = await uploadFileToBucket('articles_covers', file, 'project');
      }

      const payload = {
        titre_projet: titre,
        categorie: cat,
        budget_fcfa: budget,
        objectif_beneficiaires: benef,
        description: desc,
        image_url: coverUrl,
        statut
      };

      logSB('INSERT projets', payload);
      const { data: ins, error } = await sb.from('projets').insert([payload]).select().single();
      if (error) throw error;

      logSB('INSERT projets Résultat', payload, ins);
      toast(`Projet "${titre}" ajouté !`);
      form.reset();
      loadProjectsTable();
    } catch (err) {
      logSB('Erreur INSERT projets', null, null, err);
      toast(`Erreur projet: ${err.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '+ Ajouter le projet'; }
    }
  });
}

// ── 7. Formulaire Bibliothèque ──────────────────────────────────────────────
function initLibraryForm() {
  const form = document.getElementById('form-add-doc');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const titre   = qs('#doc-titre')?.value.trim();
    const cat     = parseInt(qs('#doc-cat')?.value || 1);
    const filiere = qs('#doc-filiere')?.value.trim();
    const niveau  = qs('#doc-niveau')?.value.trim();
    const desc    = qs('#doc-desc')?.value.trim();
    const file    = qs('#doc-file')?.files[0];
    const urlInp  = qs('#doc-url')?.value.trim();

    if (!titre) {
      toast('Le titre du document est obligatoire.', 'error');
      return;
    }

    const btn = qs('[type=submit]', form);
    if (btn) { btn.disabled = true; btn.textContent = 'Téléversement…'; }

    try {
      if (!initSB()) throw new Error('Supabase non connecté');

      let docUrl = urlInp || '#';
      let format = 'PDF';
      let taille = '—';

      if (file) {
        format = file.name.split('.').pop().toUpperCase();
        taille = `${(file.size / (1024 * 1024)).toFixed(1)} Mo`;
        docUrl = await uploadFileToBucket('documents_library', file, 'doc');
      }

      const payload = {
        titre,
        id_categorie: cat,
        filiere_concernee: filiere || 'Général',
        niveau_recommande: niveau || 'Tous niveaux',
        description: desc || null,
        fichier_url: docUrl,
        format_fichier: format,
        taille_fichier: taille,
        nb_telechargements: 0,
        est_reserve_membres: true
      };

      logSB('INSERT ressources_library', payload);
      const { data: ins, error } = await sb.from('ressources_library').insert([payload]).select().single();
      if (error) throw error;

      logSB('INSERT ressources_library Résultat', payload, ins);
      toast(`Ressource "${titre}" ajoutée à la bibliothèque !`);
      form.reset();
      loadLibraryTable();
      loadKPIs();
    } catch (err) {
      logSB('Erreur INSERT ressources_library', null, null, err);
      toast(`Erreur ressource: ${err.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '+ Ajouter à la bibliothèque'; }
    }
  });
}

// ── 8. Formulaire Galerie Médias ────────────────────────────────────────────
function initGalleryForm() {
  const form = document.getElementById('form-add-gallery');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const titre   = qs('#gal-titre')?.value.trim();
    const type    = qs('#gal-type')?.value || 'image';
    const date    = qs('#gal-date')?.value || new Date().toISOString().split('T')[0];
    const caption = qs('#gal-caption')?.value.trim();
    const file    = qs('#gal-file')?.files[0];
    const urlInp  = qs('#gal-url')?.value.trim();

    if (!titre) {
      toast('Le titre / album est obligatoire.', 'error');
      return;
    }

    const btn = qs('[type=submit]', form);
    if (btn) { btn.disabled = true; btn.textContent = 'Publication…'; }

    try {
      if (!initSB()) throw new Error('Supabase non connecté');

      let mediaUrl = urlInp || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800';
      if (file) {
        mediaUrl = await uploadFileToBucket('galerie_photos', file, 'gal');
      }

      const payload = {
        titre_album: titre,
        type_media: type,
        media_url: mediaUrl,
        caption: caption || null,
        date_prise_vue: date
      };

      logSB('INSERT medias_galerie', payload);
      const { data: ins, error } = await sb.from('medias_galerie').insert([payload]).select().single();
      if (error) throw error;

      logSB('INSERT medias_galerie Résultat', payload, ins);
      toast(`Média "${titre}" ajouté à la galerie !`);
      form.reset();
      loadGalleryTable();
    } catch (err) {
      logSB('Erreur INSERT medias_galerie', null, null, err);
      toast(`Erreur galerie: ${err.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '+ Ajouter à la galerie'; }
    }
  });
}

// ── 9. Formulaire Don & Cotisation Manuelle ─────────────────────────────────
function initDonationForm() {
  const form = document.getElementById('form-add-donation');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const nom     = qs('#don-nom')?.value.trim();
    const email   = qs('#don-email')?.value.trim() || 'anonyme@aepes.org';
    const montant = parseFloat(qs('#don-montant')?.value) || 0;
    const moyen   = qs('#don-moyen')?.value || 'Mobile Money';
    const statut  = qs('#don-statut')?.value || 'confirme';
    const ref     = qs('#don-ref')?.value.trim() || `TX-MAN-${Date.now()}`;

    if (!nom || !montant) {
      toast('Nom et montant obligatoires.', 'error');
      return;
    }

    const btn = qs('[type=submit]', form);
    if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement…'; }

    try {
      if (!initSB()) throw new Error('Supabase non connecté');

      const { data: donateur, error: errDonateur } = await sb.from('donateurs').insert([{
        nom_ou_societe: nom, email
      }]).select().single();

      if (errDonateur) throw errDonateur;

      const payload = {
        id_donateur: donateur.id_donateur,
        montant_fcfa: montant,
        moyen_paiement: moyen,
        statut_don: statut,
        reference_paiement: ref
      };

      logSB('INSERT dons', payload);
      const { data: donIns, error: errDon } = await sb.from('dons').insert([payload]).select().single();
      if (errDon) throw errDon;

      logSB('INSERT dons Résultat', payload, donIns);
      toast(`Transaction de ${montant.toLocaleString('fr-FR')} FCFA enregistrée !`);
      form.reset();
      loadDonationsTable();
      loadKPIs();
    } catch (err) {
      logSB('Erreur INSERT dons', null, null, err);
      toast(`Erreur transaction: ${err.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '+ Enregistrer la transaction'; }
    }
  });
}

// ── 10. Formulaire Partenaire ───────────────────────────────────────────────
function initPartnerForm() {
  const form = document.getElementById('form-add-partner');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const nom     = qs('#part-nom')?.value.trim();
    const contact = qs('#part-contact')?.value.trim();
    const email   = qs('#part-email')?.value.trim();
    const tel     = qs('#part-tel')?.value.trim();
    const type    = qs('#part-type')?.value.trim() || 'Partenariat institutionnel';
    const file    = qs('#part-file')?.files[0];
    const urlInp  = qs('#part-url')?.value.trim();

    if (!nom || !email) {
      toast('Nom et email obligatoires.', 'error');
      return;
    }

    const btn = qs('[type=submit]', form);
    if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement…'; }

    try {
      if (!initSB()) throw new Error('Supabase non connecté');

      let logoUrl = urlInp || null;
      if (file) {
        logoUrl = await uploadFileToBucket('articles_covers', file, 'partenaire');
      }

      const payload = {
        nom_organisation: nom,
        contact_nom: contact || null,
        contact_email: email,
        contact_telephone: tel || null,
        logo_url: logoUrl
      };

      logSB('INSERT partenaires', payload);
      const { data: partIns, error: errPart } = await sb.from('partenaires').insert([payload]).select().single();
      if (errPart) throw errPart;

      await sb.from('conventions_partenariats').insert([{
        id_partenaire: partIns.id_partenaire,
        type_partenariat: type,
        statut_demande: 'validee'
      }]);

      logSB('INSERT partenaires Résultat', payload, partIns);
      toast(`Partenaire "${nom}" enregistré avec succès !`);
      form.reset();
      loadPartnersTable();
    } catch (err) {
      logSB('Erreur INSERT partenaires', null, null, err);
      toast(`Erreur partenaire: ${err.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '+ Ajouter le partenaire'; }
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHARGEMENT ASYNCHRONE ET LIVE DE TOUTES LES TABLES (READ)
// ══════════════════════════════════════════════════════════════════════════════

async function loadAllSections() {
  if (!initSB()) return;

  loadAdminUsersTable();
  loadKPIs();
  loadDashboardMembers();
  loadDashboardDons();
  loadArticlesTable();
  loadEventsTable();
  loadProjectsTable();
  loadLibraryTable();
  loadGalleryTable();
  loadMembresTable('#sec-members-tbody', {}, 100);
  loadDonationsTable();
  loadPartnersTable();
  loadMessagesTable();
}

// ── KPIs Globaux ────────────────────────────────────────────────────────────
async function loadKPIs() {
  if (!initSB()) return;
  try {
    const [{ count: cMembres }, { count: cDons }, { count: cEvts }, { count: cDocs }] = await Promise.all([
      sb.from('membres').select('*', { count: 'exact', head: true }),
      sb.from('dons').select('*', { count: 'exact', head: true }),
      sb.from('evenements').select('*', { count: 'exact', head: true }),
      sb.from('ressources_library').select('*', { count: 'exact', head: true }),
    ]);

    const kpis = document.querySelectorAll('.kpi-value');
    if (kpis[0]) kpis[0].textContent = cMembres?.toLocaleString('fr-FR') || '—';
    if (kpis[2]) kpis[2].textContent = cEvts || '—';
    if (kpis[3]) kpis[3].textContent = cDocs || '—';

    const { data: donsData } = await sb.from('dons').select('montant_fcfa').eq('statut_don', 'confirme');
    if (kpis[1] && donsData) {
      const total = donsData.reduce((s, d) => s + (parseFloat(d.montant_fcfa) || 0), 0);
      kpis[1].textContent = total.toLocaleString('fr-FR') + ' F';
    }
  } catch (err) {
    logSB('Erreur KPIs', null, null, err);
  }
}

// ── Dashboard : Membres en attente ──────────────────────────────────────────
async function loadDashboardMembers() {
  loadMembresTable('#dash-membres-tbody', { statut_adhesion: 'en_attente' }, 5);
}

// ── Dashboard : Derniers dons ───────────────────────────────────────────────
async function loadDashboardDons() {
  const tbody = qs('#dash-dons-tbody');
  if (!tbody || !initSB()) return;
  try {
    const { data, error } = await sb.from('dons')
      .select('reference_paiement, donateurs(nom_ou_societe), montant_fcfa, moyen_paiement, created_at, statut_don')
      .order('created_at', { ascending: false }).limit(5);

    if (error) throw error;
    buildTbody(tbody, (data || []).map(d => tr([
      `<code>${d.reference_paiement || '—'}</code>`,
      `<strong>${d.donateurs?.nom_ou_societe || 'Donateur'}</strong>`,
      `${parseFloat(d.montant_fcfa || 0).toLocaleString('fr-FR')} FCFA`,
      d.moyen_paiement,
      fmt(d.created_at),
      badge(d.statut_don === 'confirme' ? 'Confirmé' : 'En attente', d.statut_don === 'confirme' ? 'green' : 'amber')
    ])));
  } catch (err) {
    logSB('Erreur loadDashboardDons', null, null, err);
  }
}

// ── Table Articles ──────────────────────────────────────────────────────────
async function loadArticlesTable() {
  const tbody = qs('#articles-table tbody');
  if (!tbody || !initSB()) return;
  try {
    logSB('SELECT articles', {});
    const { data, error } = await sb.from('articles')
      .select('id_article, titre, categories_articles(nom_categorie), image_couverture_url, est_publie, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    logSB('SELECT articles Résultat', {}, data);

    buildTbody(tbody, (data || []).map(a => {
      const cover = a.image_couverture_url
        ? `<img src="${a.image_couverture_url}" style="width:44px;height:32px;object-fit:cover;border-radius:3px;" alt="Couverture">`
        : '<span style="color:#94a3b8;font-size:11px;">Aucune</span>';
      return tr([
        cover,
        `<strong>${a.titre}</strong>`,
        a.categories_articles?.nom_categorie || 'Général',
        fmt(a.created_at),
        badge(a.est_publie ? 'Publié' : 'Brouillon', a.est_publie ? 'green' : 'amber'),
        `${editBtn('articles', 'id_article', a.id_article)} ${delBtn('articles', 'id_article', a.id_article)}`
      ]);
    }));
  } catch (err) {
    logSB('Erreur loadArticlesTable', null, null, err);
  }
}

// ── Table Événements & Billetterie ──────────────────────────────────────────
async function loadEventsTable() {
  const tbody = qs('#events-table tbody');
  if (!tbody || !initSB()) return;
  try {
    logSB('SELECT evenements', {});
    const { data, error } = await sb.from('evenements')
      .select('id_evenement, titre, lieu, date_debut, capacite_max, image_url, est_publie, inscriptions_evenements(count)')
      .order('date_debut', { ascending: true });

    if (error) throw error;
    logSB('SELECT evenements Résultat', {}, data);

    buildTbody(tbody, (data || []).map(ev => {
      const img = ev.image_url
        ? `<img src="${ev.image_url}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;" alt="Flyer">`
        : '<span style="color:#94a3b8;font-size:11px;">—</span>';

      const nbInscrits = ev.inscriptions_evenements?.[0]?.count || 0;
      const attendeesBtn = `<button class="btn btn-ghost" style="padding:4px 8px;font-size:12px;background:var(--blue-100);color:var(--indigo-900);border-color:var(--blue-300);" onclick="window.openEventAttendeesModal(${ev.id_evenement},'${ev.titre.replace(/'/g, "\\'")}')">Inscrits (${nbInscrits}) ▼</button>`;

      return tr([
        img,
        `<strong>${ev.titre}</strong>`,
        fmtFull(ev.date_debut),
        ev.lieu,
        `${ev.capacite_max || 100} places`,
        attendeesBtn,
        `${editBtn('evenements', 'id_evenement', ev.id_evenement)} ${delBtn('evenements', 'id_evenement', ev.id_evenement)}`
      ]);
    }));
  } catch (err) {
    logSB('Erreur loadEventsTable', null, null, err);
  }
}

// ── Table Projets & Activités ───────────────────────────────────────────────
async function loadProjectsTable() {
  const tbody = qs('#projects-table tbody');
  if (!tbody || !initSB()) return;
  try {
    logSB('SELECT projets', {});
    const { data, error } = await sb.from('projets').select('*').order('id_projet', { ascending: false });
    if (error) throw error;
    logSB('SELECT projets Résultat', {}, data);

    buildTbody(tbody, (data || []).map(p => {
      const st = p.statut === 'en_cours' ? badge('En cours', 'green') : p.statut === 'termine' ? badge('Terminé', 'blue') : badge(p.statut, 'amber');
      const img = p.image_url
        ? `<img src="${p.image_url}" style="width:44px;height:32px;object-fit:cover;border-radius:3px;" alt="${p.titre_projet}">`
        : '<span style="color:#94a3b8;font-size:11px;">—</span>';

      return tr([
        img,
        `<strong>${p.titre_projet}</strong>`,
        p.categorie || '—',
        p.budget_fcfa ? `${parseFloat(p.budget_fcfa).toLocaleString('fr-FR')} FCFA` : '—',
        p.objectif_beneficiaires || '—',
        st,
        `${editBtn('projets', 'id_projet', p.id_projet)} ${delBtn('projets', 'id_projet', p.id_projet)}`
      ]);
    }));
  } catch (err) {
    logSB('Erreur loadProjectsTable', null, null, err);
  }
}

// ── Table Bibliothèque ──────────────────────────────────────────────────────
async function loadLibraryTable() {
  const tbody = qs('#library-table tbody');
  if (!tbody || !initSB()) return;
  try {
    logSB('SELECT ressources_library', {});
    const { data, error } = await sb.from('ressources_library')
      .select('id_ressource, titre, categories_ressources(nom_categorie), filiere_concernee, format_fichier, taille_fichier, nb_telechargements, fichier_url')
      .order('created_at', { ascending: false });

    if (error) throw error;
    logSB('SELECT ressources_library Résultat', {}, data);

    buildTbody(tbody, (data || []).map(d => tr([
      `<strong>${d.titre}</strong>`,
      d.categories_ressources?.nom_categorie || 'Document',
      d.filiere_concernee || '—',
      `<span class="badge blue">${d.format_fichier || 'PDF'}</span>`,
      d.nb_telechargements || 0,
      `${editBtn('ressources_library', 'id_ressource', d.id_ressource)} ${delBtn('ressources_library', 'id_ressource', d.id_ressource)}`
    ])));
  } catch (err) {
    logSB('Erreur loadLibraryTable', null, null, err);
  }
}

// ── Table Galerie Médias ────────────────────────────────────────────────────
async function loadGalleryTable() {
  const tbody = qs('#gallery-table tbody');
  if (!tbody || !initSB()) return;
  try {
    logSB('SELECT medias_galerie', {});
    const { data, error } = await sb.from('medias_galerie').select('*').order('date_prise_vue', { ascending: false });
    if (error) throw error;
    logSB('SELECT medias_galerie Résultat', {}, data);

    buildTbody(tbody, (data || []).map(g => {
      const img = g.media_url
        ? `<img src="${g.media_url}" style="width:52px;height:40px;object-fit:cover;border-radius:4px;" alt="${g.titre_album}">`
        : '—';
      return tr([
        img,
        `<strong>${g.titre_album}</strong>`,
        g.caption || '—',
        fmt(g.date_prise_vue),
        `${editBtn('medias_galerie', 'id_media', g.id_media)} ${delBtn('medias_galerie', 'id_media', g.id_media)}`
      ]);
    }));
  } catch (err) {
    logSB('Erreur loadGalleryTable', null, null, err);
  }
}

// ── Table Membres & Adhésions ───────────────────────────────────────────────
async function loadMembresTable(selector, filter = {}, limit = 50) {
  const tbody = qs(selector);
  if (!tbody || !initSB()) return;
  try {
    logSB('SELECT membres', { filter, limit });
    let q = sb.from('membres')
      .select('id_membre, matricule_adhesion, nom, prenom, email, photo_url, universite_nom, filiere_departement, niveau_etude, telephone_whatsapp, statut_adhesion, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
    const { data, error } = await q;
    if (error) throw error;

    logSB('SELECT membres Résultat', { count: data?.length }, data);

    buildTbody(tbody, (data || []).map(m => {
      const isValide  = m.statut_adhesion === 'valide';
      const isAttente = m.statut_adhesion === 'en_attente';
      const isRejete  = m.statut_adhesion === 'rejete';

      const photo = m.photo_url
        ? `<img src="${m.photo_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1.5px solid var(--blue-500);" alt="${m.prenom}">`
        : `<div style="width:36px;height:36px;border-radius:50%;background:var(--blue-100);color:var(--indigo-900);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${(m.prenom||'M')[0]}</div>`;

      let actions = `${editBtn('membres', 'id_membre', m.id_membre)} `;
      if (isAttente) {
        actions += `<a href="#" class="card-link" style="color:#059669;font-weight:600;margin-right:6px;" onclick="window.setMemberStatus(event,${m.id_membre},'valide',this)">Valider</a> · <a href="#" class="card-link" style="color:#D97706;font-weight:600;margin-right:6px;" onclick="window.setMemberStatus(event,${m.id_membre},'rejete',this)">Rejeter</a> · `;
      }
      actions += delBtn('membres', 'id_membre', m.id_membre);

      return tr([
        photo,
        `<code>${m.matricule_adhesion || '—'}</code>`,
        `<strong>${m.prenom} ${m.nom}</strong>`,
        `${m.universite_nom || '—'} <span style="color:#718096;font-size:11px;">(${m.filiere_departement || 'Général'})</span>`,
        `<a href="tel:${m.telephone_whatsapp}" class="card-link">${m.telephone_whatsapp || '—'}</a>`,
        badge(isValide ? 'Validée' : isAttente ? 'En attente' : isRejete ? 'Rejetée' : m.statut_adhesion,
              isValide ? 'green' : isAttente ? 'amber' : 'red'),
        actions
      ]);
    }));
  } catch (err) {
    logSB('Erreur loadMembresTable', null, null, err);
  }
}

// ── Validation / Rejet d'un membre ──────────────────────────────────────────
window.setMemberStatus = async (e, id, newStatus, link) => {
  e.preventDefault();
  if (!initSB()) return;
  try {
    logSB(`UPDATE membres statut_adhesion=${newStatus}`, { id_membre: id });
    const { error } = await sb.from('membres').update({ statut_adhesion: newStatus }).eq('id_membre', id);
    if (error) throw error;

    const row = link.closest('tr');
    const badgeEl = row?.querySelector('.badge');
    if (badgeEl) {
      badgeEl.className = `badge ${newStatus === 'valide' ? 'green' : 'red'}`;
      badgeEl.textContent = newStatus === 'valide' ? 'Validée' : 'Rejetée';
    }
    toast(`Adhésion mise à jour : ${newStatus === 'valide' ? 'Validée' : 'Rejetée'}`);
    loadKPIs();
  } catch (err) {
    logSB('Erreur setMemberStatus', { id, newStatus }, null, err);
    toast(`Erreur mise à jour: ${err.message}`, 'error');
  }
};

// ── Table Dons & Finances ───────────────────────────────────────────────────
async function loadDonationsTable() {
  const tbody = qs('#sec-donations-tbody');
  if (!tbody || !initSB()) return;
  try {
    logSB('SELECT dons', {});
    const { data, error } = await sb.from('dons')
      .select('id_don, reference_paiement, donateurs(nom_ou_societe, email), montant_fcfa, moyen_paiement, created_at, statut_don')
      .order('created_at', { ascending: false });

    if (error) throw error;
    logSB('SELECT dons Résultat', {}, data);

    buildTbody(tbody, (data || []).map(d => {
      const isConfirme = d.statut_don === 'confirme';
      return tr([
        `<code>${d.reference_paiement || '—'}</code>`,
        `<strong>${d.donateurs?.nom_ou_societe || 'Anonyme'}</strong><br><span style="font-size:11.5px;color:#718096;">${d.donateurs?.email||''}</span>`,
        `<strong>${parseFloat(d.montant_fcfa || 0).toLocaleString('fr-FR')} FCFA</strong>`,
        d.moyen_paiement,
        fmt(d.created_at),
        badge(isConfirme ? 'Confirmé' : 'En attente', isConfirme ? 'green' : 'amber'),
        `${editBtn('dons', 'id_don', d.id_don)} ${delBtn('dons', 'id_don', d.id_don)}`
      ]);
    }));
  } catch (err) {
    logSB('Erreur loadDonationsTable', null, null, err);
  }
}

// ── Table Partenaires ───────────────────────────────────────────────────────
async function loadPartnersTable() {
  const tbody = qs('#sec-partners-tbody');
  if (!tbody || !initSB()) return;
  try {
    logSB('SELECT partenaires', {});
    const { data, error } = await sb.from('partenaires')
      .select('id_partenaire, nom_organisation, logo_url, contact_nom, contact_email, contact_telephone, conventions_partenariats(type_partenariat)')
      .order('nom_organisation');

    if (error) throw error;
    logSB('SELECT partenaires Résultat', {}, data);

    buildTbody(tbody, (data || []).map(p => {
      const logo = p.logo_url
        ? `<img src="${p.logo_url}" style="width:36px;height:36px;object-fit:contain;border-radius:4px;background:#f8fafc;padding:2px;" alt="${p.nom_organisation}">`
        : `<div style="width:36px;height:36px;background:var(--blue-100);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>`;
      return tr([
        logo,
        `<strong>${p.nom_organisation}</strong>`,
        p.contact_nom || '—',
        `<a href="mailto:${p.contact_email}" class="card-link">${p.contact_email}</a>`,
        p.conventions_partenariats?.[0]?.type_partenariat || 'Convention active',
        `${editBtn('partenaires', 'id_partenaire', p.id_partenaire)} ${delBtn('partenaires', 'id_partenaire', p.id_partenaire)}`
      ]);
    }));
  } catch (err) {
    logSB('Erreur loadPartnersTable', null, null, err);
  }
}

// ── Table Boîte de Réception Messages ───────────────────────────────────────
async function loadMessagesTable() {
  const tbody = qs('#sec-messages-tbody');
  if (!tbody || !initSB()) return;
  try {
    logSB('SELECT messages_contact', {});
    const { data, error } = await sb.from('messages_contact')
      .select('id_message, nom_complet, email, sujet, message, est_traite, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    logSB('SELECT messages_contact Résultat', {}, data);

    buildTbody(tbody, (data || []).map(m => {
      const isTraite = m.est_traite;
      return tr([
        `<strong>${m.nom_complet}</strong>`,
        `<a href="mailto:${m.email}" class="card-link">${m.email}</a>`,
        `<strong>${m.sujet || '(sans sujet)'}</strong>`,
        fmt(m.created_at),
        badge(isTraite ? 'Traité' : 'Nouveau', isTraite ? 'green' : 'amber'),
        `<a href="#" class="card-link" style="color:#1F5390;font-weight:600;margin-right:8px;" onclick="event.preventDefault();window.viewMessage(${m.id_message})">Lire</a> ${delBtn('messages_contact', 'id_message', m.id_message)}`
      ]);
    }));
  } catch (err) {
    logSB('Erreur loadMessagesTable', null, null, err);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL GESTION DES INSCRITS À UN ÉVÉNEMENT
// ══════════════════════════════════════════════════════════════════════════════

function initEventAttendeesModal() {
  const modal   = document.getElementById('admin-event-attendees-modal');
  const closeBt = document.getElementById('event-attendees-modal-close');
  const cancelBt= document.getElementById('event-attendees-modal-cancel');

  const closeModal = () => { if (modal) modal.style.display = 'none'; };
  closeBt?.addEventListener('click', closeModal);
  cancelBt?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
}

window.openEventAttendeesModal = async (idEvenement, eventTitle) => {
  const modal    = document.getElementById('admin-event-attendees-modal');
  const title    = document.getElementById('event-modal-title');
  const subtitle = document.getElementById('event-modal-subtitle');
  const tbody    = document.getElementById('event-attendees-tbody');
  const countEl  = document.getElementById('event-attendees-count');

  if (!modal || !tbody || !initSB()) return;

  if (title) title.textContent = `Inscrits : ${eventTitle}`;
  if (subtitle) subtitle.textContent = `Gestion et validation des présences pour l'événement ID #${idEvenement}`;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#718096;">Chargement des inscrits…</td></tr>';
  modal.style.display = 'flex';

  try {
    logSB(`SELECT inscriptions_evenements WHERE id_evenement=${idEvenement}`, { id_evenement: idEvenement });
    const { data: attendees, error } = await sb
      .from('inscriptions_evenements')
      .select('*')
      .eq('id_evenement', idEvenement)
      .order('created_at', { ascending: false });

    if (error) throw error;
    logSB(`Inscrits reçus pour événement ${idEvenement} (JSON)`, attendees);

    if (countEl) countEl.textContent = `Total : ${attendees?.length || 0} participant(s) inscrit(s)`;

    if (!attendees || !attendees.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#718096;">Aucun participant inscrit pour le moment.</td></tr>';
      return;
    }

    tbody.innerHTML = attendees.map(att => {
      const isPresent = att.statut_presence;
      return `
        <tr>
          <td><strong>${att.prenom || ''} ${att.nom || ''}</strong></td>
          <td><a href="mailto:${att.email}" class="card-link">${att.email}</a></td>
          <td>${att.telephone || '—'}</td>
          <td><code>${att.code_qr_billet || att.num_adhesion || '—'}</code></td>
          <td>
            <span class="badge ${isPresent ? 'green' : 'amber'}">${isPresent ? 'Présent' : 'Inscrit'}</span>
          </td>
          <td>
            <button class="btn btn-ghost" style="padding:3px 8px;font-size:11.5px;color:${isPresent ? '#D97706' : '#059669'};" onclick="window.toggleAttendeePresence(${att.id_inscription},${!isPresent},${idEvenement},'${eventTitle.replace(/'/g, "\\'")}')">
              ${isPresent ? 'Annuler présence' : 'Marquer Présent'}
            </button>
            <button class="btn btn-ghost" style="padding:3px 8px;font-size:11.5px;color:#DC2626;margin-left:4px;" onclick="window.deleteAttendee(${att.id_inscription},${idEvenement},'${eventTitle.replace(/'/g, "\\'")}')">
              Annuler inscription
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    logSB('Erreur chargement inscrits', { idEvenement }, null, err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#DC2626;padding:16px;">Erreur: ${err.message}</td></tr>`;
  }
};

window.toggleAttendeePresence = async (idInscription, newPresence, idEvenement, eventTitle) => {
  if (!initSB()) return;
  try {
    logSB(`UPDATE inscriptions_evenements statut_presence=${newPresence}`, { id_inscription: idInscription });
    const { error } = await sb.from('inscriptions_evenements').update({ statut_presence: newPresence }).eq('id_inscription', idInscription);
    if (error) throw error;

    toast(`Statut de présence mis à jour !`);
    window.openEventAttendeesModal(idEvenement, eventTitle);
  } catch (err) {
    toast(`Erreur: ${err.message}`, 'error');
  }
};

window.deleteAttendee = async (idInscription, idEvenement, eventTitle) => {
  if (!confirm('Êtes-vous sûr de vouloir annuler cette inscription ?')) return;
  if (!initSB()) return;
  try {
    logSB(`DELETE inscriptions_evenements id=${idInscription}`, { id_inscription: idInscription });
    const { error } = await sb.from('inscriptions_evenements').delete().eq('id_inscription', idInscription);
    if (error) throw error;

    toast('Inscription annulée.');
    window.openEventAttendeesModal(idEvenement, eventTitle);
    loadEventsTable();
  } catch (err) {
    toast(`Erreur: ${err.message}`, 'error');
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  MODAL UNIVERSEL DE MODIFICATION / ÉDITION (UPDATE)
// ══════════════════════════════════════════════════════════════════════════════

function initUniversalEditModal() {
  const modal   = document.getElementById('admin-edit-modal');
  const closeBt = document.getElementById('edit-modal-close');
  const cancelBt= document.getElementById('edit-modal-cancel');
  const form    = document.getElementById('form-edit-modal');

  const closeModal = () => { if (modal) modal.style.display = 'none'; };
  closeBt?.addEventListener('click', closeModal);
  cancelBt?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const table = qs('#edit-table-name').value;
    const idCol = qs('#edit-id-col').value;
    const idVal = qs('#edit-id-val').value;
    const btn   = qs('#edit-modal-submit');

    if (!table || !idCol || !idVal) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement en cours…'; }

    try {
      if (!initSB()) throw new Error('Supabase non disponible');

      const updates = {};
      const fileInputs = qsa('#edit-modal-fields input[type=file]');

      for (const fi of fileInputs) {
        if (fi.files[0]) {
          const bName = fi.dataset.bucket || 'articles_covers';
          const pubUrl = await uploadFileToBucket(bName, fi.files[0], 'edit');
          const targetCol = fi.dataset.col;
          if (targetCol) updates[targetCol] = pubUrl;
        }
      }

      qsa('#edit-modal-fields input:not([type=file]), #edit-modal-fields textarea, #edit-modal-fields select').forEach(el => {
        const col = el.dataset.col;
        if (!col) return;
        if (el.type === 'checkbox') {
          updates[col] = el.checked;
        } else if (el.type === 'number') {
          updates[col] = el.value === '' ? null : parseFloat(el.value);
        } else {
          updates[col] = el.value;
        }
      });

      logSB(`UPDATE ${table} WHERE ${idCol}=${idVal}`, updates);
      const { data, error } = await sb.from(table).update(updates).eq(idCol, idVal).select().single();
      if (error) throw error;

      logSB(`UPDATE ${table} Résultat`, updates, data);
      toast('Modifications enregistrées avec succès !');
      closeModal();
      loadAllSections();
    } catch (err) {
      logSB(`Erreur UPDATE ${table}`, null, null, err);
      toast(`Erreur enregistrement: ${err.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer les modifications'; }
    }
  });
}

window.openEditModal = async (table, idCol, idVal) => {
  const modal  = document.getElementById('admin-edit-modal');
  const title  = document.getElementById('edit-modal-title');
  const fields = document.getElementById('edit-modal-fields');
  if (!modal || !fields || !initSB()) return;

  logSB(`SELECT pour Édition ${table} WHERE ${idCol}=${idVal}`, {});

  try {
    const { data: record, error } = await sb.from(table).select('*').eq(idCol, idVal).single();
    if (error) throw error;

    logSB(`Données reçues pour Édition (JSON):`, record);

    qs('#edit-table-name').value = table;
    qs('#edit-id-col').value = idCol;
    qs('#edit-id-val').value = idVal;
    if (title) title.textContent = `Modifier : ${table.replace('_', ' ').toUpperCase()}`;

    let html = '';

    if (table === 'articles') {
      html = `
        <div class="form-field full"><label>Titre de l'article</label><input type="text" data-col="titre" value="${record.titre||''}" required></div>
        <div class="form-field"><label>Catégorie</label>
          <select data-col="id_categorie_art">
            <option value="1" ${record.id_categorie_art===1?'selected':''}>Éducation</option>
            <option value="2" ${record.id_categorie_art===2?'selected':''}>Culture</option>
            <option value="3" ${record.id_categorie_art===3?'selected':''}>Partenariats</option>
            <option value="4" ${record.id_categorie_art===4?'selected':''}>Vie associative</option>
          </select>
        </div>
        <div class="form-field"><label>Statut de publication</label>
          <select data-col="est_publie">
            <option value="true" ${record.est_publie?'selected':''}>Publié</option>
            <option value="false" ${!record.est_publie?'selected':''}>Brouillon</option>
          </select>
        </div>
        <div class="form-field full"><label>Résumé / Chapeau</label><textarea rows="2" data-col="chapeau">${record.chapeau||''}</textarea></div>
        <div class="form-field full"><label>Contenu HTML / Texte</label><textarea rows="5" data-col="contenu_html">${record.contenu_html||''}</textarea></div>
        <div class="form-field full">
          <label>Changer l'image de couverture</label>
          <input type="file" data-col="image_couverture_url" data-bucket="articles_covers" accept="image/*">
          ${record.image_couverture_url ? `<div style="margin-top:6px;font-size:12px;">Image actuelle : <a href="${record.image_couverture_url}" target="_blank" class="card-link">Voir l'image</a></div>` : ''}
        </div>
      `;
    } else if (table === 'evenements') {
      const dt = record.date_debut ? new Date(record.date_debut).toISOString().slice(0, 16) : '';
      html = `
        <div class="form-field full"><label>Titre de l'événement</label><input type="text" data-col="titre" value="${record.titre||''}" required></div>
        <div class="form-field"><label>Lieu</label><input type="text" data-col="lieu" value="${record.lieu||''}" required></div>
        <div class="form-field"><label>Date et heure</label><input type="datetime-local" data-col="date_debut" value="${dt}" required></div>
        <div class="form-field"><label>Capacité maximale</label><input type="number" data-col="capacite_max" value="${record.capacite_max||150}"></div>
        <div class="form-field full"><label>Description</label><textarea rows="3" data-col="description">${record.description||''}</textarea></div>
        <div class="form-field full">
          <label>Changer le flyer</label>
          <input type="file" data-col="image_url" data-bucket="galerie_photos" accept="image/*">
          ${record.image_url ? `<div style="margin-top:6px;font-size:12px;"><a href="${record.image_url}" target="_blank" class="card-link">Voir flyer actuel</a></div>` : ''}
        </div>
      `;
    } else if (table === 'projets') {
      html = `
        <div class="form-field full"><label>Titre du projet</label><input type="text" data-col="titre_projet" value="${record.titre_projet||''}" required></div>
        <div class="form-field"><label>Commission</label><input type="text" data-col="categorie" value="${record.categorie||''}"></div>
        <div class="form-field"><label>Budget (FCFA)</label><input type="number" data-col="budget_fcfa" value="${record.budget_fcfa||0}"></div>
        <div class="form-field"><label>Statut</label>
          <select data-col="statut">
            <option value="en_cours" ${record.statut==='en_cours'?'selected':''}>En cours</option>
            <option value="termine" ${record.statut==='termine'?'selected':''}>Terminé</option>
            <option value="planifie" ${record.statut==='planifie'?'selected':''}>Planifié</option>
          </select>
        </div>
        <div class="form-field"><label>Bénéficiaires</label><input type="text" data-col="objectif_beneficiaires" value="${record.objectif_beneficiaires||''}"></div>
        <div class="form-field full"><label>Description</label><textarea rows="3" data-col="description">${record.description||''}</textarea></div>
        <div class="form-field full">
          <label>Changer l'image de couverture</label>
          <input type="file" data-col="image_url" data-bucket="articles_covers" accept="image/*">
          ${record.image_url ? `<div style="margin-top:6px;font-size:12px;"><a href="${record.image_url}" target="_blank" class="card-link">Voir image actuelle</a></div>` : ''}
        </div>
      `;
    } else if (table === 'ressources_library') {
      html = `
        <div class="form-field full"><label>Titre du document</label><input type="text" data-col="titre" value="${record.titre||''}" required></div>
        <div class="form-field"><label>Filière concernée</label><input type="text" data-col="filiere_concernee" value="${record.filiere_concernee||''}"></div>
        <div class="form-field"><label>Niveau recommandé</label><input type="text" data-col="niveau_recommande" value="${record.niveau_recommande||''}"></div>
        <div class="form-field"><label>Format</label><input type="text" data-col="format_fichier" value="${record.format_fichier||'PDF'}"></div>
        <div class="form-field full"><label>Description</label><textarea rows="2" data-col="description">${record.description||''}</textarea></div>
        <div class="form-field full">
          <label>Remplacer le fichier (Upload)</label>
          <input type="file" data-col="fichier_url" data-bucket="documents_library" accept=".pdf,.doc,.docx,.epub">
        </div>
      `;
    } else if (table === 'medias_galerie') {
      html = `
        <div class="form-field full"><label>Titre / Album</label><input type="text" data-col="titre_album" value="${record.titre_album||''}" required></div>
        <div class="form-field"><label>Date prise de vue</label><input type="date" data-col="date_prise_vue" value="${record.date_prise_vue||''}"></div>
        <div class="form-field full"><label>Légende</label><input type="text" data-col="caption" value="${record.caption||''}"></div>
        <div class="form-field full">
          <label>Remplacer l'image</label>
          <input type="file" data-col="media_url" data-bucket="galerie_photos" accept="image/*">
          ${record.media_url ? `<div style="margin-top:6px;font-size:12px;"><a href="${record.media_url}" target="_blank" class="card-link">Voir photo actuelle</a></div>` : ''}
        </div>
      `;
    } else if (table === 'membres') {
      html = `
        <div class="form-field"><label>Nom</label><input type="text" data-col="nom" value="${record.nom||''}" required></div>
        <div class="form-field"><label>Prénom</label><input type="text" data-col="prenom" value="${record.prenom||''}" required></div>
        <div class="form-field"><label>Statut d'adhésion</label>
          <select data-col="statut_adhesion">
            <option value="valide" ${record.statut_adhesion==='valide'?'selected':''}>Validée</option>
            <option value="en_attente" ${record.statut_adhesion==='en_attente'?'selected':''}>En attente</option>
            <option value="rejete" ${record.statut_adhesion==='rejete'?'selected':''}>Rejetée</option>
          </select>
        </div>
        <div class="form-field"><label>Téléphone WhatsApp</label><input type="tel" data-col="telephone_whatsapp" value="${record.telephone_whatsapp||''}"></div>
        <div class="form-field"><label>Email</label><input type="email" data-col="email" value="${record.email||''}"></div>
        <div class="form-field"><label>Université</label><input type="text" data-col="universite_nom" value="${record.universite_nom||''}"></div>
        <div class="form-field"><label>Filière</label><input type="text" data-col="filiere_departement" value="${record.filiere_departement||''}"></div>
        <div class="form-field"><label>Niveau</label><input type="text" data-col="niveau_etude" value="${record.niveau_etude||''}"></div>
        <div class="form-field full">
          <label>Changer la photo de profil</label>
          <input type="file" data-col="photo_url" data-bucket="photos_membres" accept="image/*">
        </div>
      `;
    } else if (table === 'dons') {
      html = `
        <div class="form-field"><label>Montant (FCFA)</label><input type="number" data-col="montant_fcfa" value="${record.montant_fcfa||0}" required></div>
        <div class="form-field"><label>Statut</label>
          <select data-col="statut_don">
            <option value="confirme" ${record.statut_don==='confirme'?'selected':''}>Confirmé</option>
            <option value="en_attente" ${record.statut_don==='en_attente'?'selected':''}>En attente</option>
          </select>
        </div>
        <div class="form-field"><label>Moyen de paiement</label><input type="text" data-col="moyen_paiement" value="${record.moyen_paiement||''}"></div>
        <div class="form-field"><label>Référence transaction</label><input type="text" data-col="reference_paiement" value="${record.reference_paiement||''}"></div>
      `;
    } else if (table === 'profils') {
      html = `
        <div class="form-field"><label>Nom</label><input type="text" data-col="nom" value="${record.nom||''}" required></div>
        <div class="form-field"><label>Prénom</label><input type="text" data-col="prenom" value="${record.prenom||''}" required></div>
        <div class="form-field"><label>Email de connexion</label><input type="email" value="${record.email||''}" readonly></div>
        <div class="form-field full"><label>Authentification</label><p style="margin:0;color:var(--ink-soft);font-size:13px;">Le mot de passe est géré exclusivement par Supabase Auth. Utilisez la procédure de réinitialisation pour le modifier.</p></div>
        <div class="form-field"><label>Rôle attribué</label>
          <select data-col="id_role">
            <option value="1" ${record.id_role===1?'selected':''}>👑 1. Super Administrateur (SUPER_ADMIN)</option>
            <option value="2" ${record.id_role===2?'selected':''}>📋 2. Secrétaire Général / Admin (ADMIN)</option>
            <option value="3" ${record.id_role===3?'selected':''}>💰 3. Trésorier Général (TRESORIER)</option>
            <option value="4" ${record.id_role===4?'selected':''}>📢 4. Responsable Communication (EDITEUR)</option>
            <option value="5" ${record.id_role===5?'selected':''}>🚀 5. Responsable Projets (RESP_PROJET)</option>
            <option value="6" ${record.id_role===6?'selected':''}>📚 6. Responsable Éducation (RESP_EDUCATION)</option>
            <option value="7" ${record.id_role===7?'selected':''}>👤 7. Membre Adhérent (MEMBRE)</option>
          </select>
        </div>
        <div class="form-field"><label>Statut du compte</label>
          <select data-col="statut">
            <option value="actif" ${record.statut==='actif'?'selected':''}>Actif</option>
            <option value="inactif" ${record.statut==='inactif'?'selected':''}>Inactif / Suspendu</option>
          </select>
        </div>
        <div class="form-field full">
          <label>Changer la photo de profil / Avatar</label>
          <input type="file" data-col="avatar_url" data-bucket="photos_membres" accept="image/*">
          ${record.avatar_url ? `<div style="margin-top:6px;font-size:12px;"><a href="${record.avatar_url}" target="_blank" class="card-link">Voir photo actuelle</a></div>` : ''}
        </div>
      `;
    } else if (table === 'partenaires') {
      html = `
        <div class="form-field full"><label>Nom de l'organisation</label><input type="text" data-col="nom_organisation" value="${record.nom_organisation||''}" required></div>
        <div class="form-field"><label>Contact référent</label><input type="text" data-col="contact_nom" value="${record.contact_nom||''}"></div>
        <div class="form-field"><label>Email</label><input type="email" data-col="contact_email" value="${record.contact_email||''}"></div>
        <div class="form-field"><label>Téléphone</label><input type="tel" data-col="contact_telephone" value="${record.contact_telephone||''}"></div>
        <div class="form-field"><label>Site Web</label><input type="url" data-col="site_web" value="${record.site_web||''}"></div>
        <div class="form-field full">
          <label>Changer le logo</label>
          <input type="file" data-col="logo_url" data-bucket="articles_covers" accept="image/*">
        </div>
      `;
    }

    fields.innerHTML = html;
    modal.style.display = 'flex';
  } catch (err) {
    logSB('Erreur ouverture modal édition', { table, idCol, idVal }, null, err);
    toast(`Erreur chargement données: ${err.message}`, 'error');
  }
};

// ── Modal Détail Message Contact ────────────────────────────────────────────
function initMessageModal() {
  const modal   = document.getElementById('admin-message-modal');
  const closeBt = document.getElementById('msg-modal-close');
  const cancelBt= document.getElementById('msg-modal-cancel');
  const closeModal = () => { if (modal) modal.style.display = 'none'; };
  closeBt?.addEventListener('click', closeModal);
  cancelBt?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
}

window.viewMessage = async (id) => {
  const modal = document.getElementById('admin-message-modal');
  const body  = document.getElementById('msg-modal-body');
  const reply = document.getElementById('msg-modal-reply-btn');
  if (!modal || !body || !initSB()) return;

  try {
    const { data: msg, error } = await sb.from('messages_contact').select('*').eq('id_message', id).single();
    if (error) throw error;

    await sb.from('messages_contact').update({ est_traite: true }).eq('id_message', id);

    body.innerHTML = `
      <div style="background:var(--blue-100);padding:14px;border-radius:6px;margin-bottom:14px;">
        <div><strong>De :</strong> ${msg.nom_complet} (${msg.email})</div>
        <div><strong>Objet :</strong> ${msg.sujet || '(sans objet)'}</div>
        <div style="font-size:12px;color:var(--ink-soft);margin-top:4px;">Reçu le ${fmtFull(msg.created_at)}</div>
      </div>
      <div style="white-space:pre-wrap;background:#f8fafc;padding:16px;border-radius:6px;border:1px solid #e2e8f0;">${msg.message}</div>
    `;

    if (reply) reply.href = `mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.sujet || 'Votre message à l\'AEPeS')}`;
    modal.style.display = 'flex';
    loadMessagesTable();
  } catch (err) {
    toast(`Erreur: ${err.message}`, 'error');
  }
};
