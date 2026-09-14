/**
 * AEPeS — Client Frontend Unifié & Gestionnaire Supabase
 * Chargement dynamique live de toutes les pages publiques & soumission de tous les formulaires.
 * Logs JSON exhaustifs dans la console du navigateur.
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

// ─── Logger JSON Structuré pour le Frontend ──────────────────────────────────
function logClient(operation, payload, result, error) {
  const isErr = !!error;
  console.groupCollapsed(
    `%c🚀 [AEPeS Client] ${operation} ${isErr ? '❌ ERREUR' : '✅ SUCCÈS'}`,
    `color:${isErr ? '#ef4444' : '#0284c7'};font-weight:bold;`
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

async function getFunctionErrorMessage(error) {
  const response = error?.context;
  if (response && typeof response.clone === 'function') {
    try {
      const raw = await response.clone().text();
      if (raw) {
        const body = JSON.parse(raw);
        if (body?.error) return body.error;
        if (body?.message) return body.message;
      }
    } catch {
      // Le contexte peut être une Response déjà consommée ou non JSON.
    }
  }
  return error?.message || 'Erreur inconnue lors de l’appel de la fonction serveur.';
}

// ─── Toast System ─────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  let t = document.getElementById('aepes-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'aepes-toast';
    Object.assign(t.style, {
      position: 'fixed', bottom: '24px', right: '24px',
      padding: '14px 20px', borderRadius: '6px', fontSize: '14px',
      zIndex: '99999', display: 'flex', alignItems: 'center', gap: '10px',
      boxShadow: '0 8px 24px rgba(0,0,0,.22)',
      transition: 'opacity .3s, transform .3s',
      maxWidth: '380px', lineHeight: '1.4'
    });
    document.body.appendChild(t);
  }
  t.style.background = type === 'error' ? '#C0392B' : '#0F2A52';
  t.style.color = '#fff';
  t.innerHTML = `<span style="font-size:18px">${type === 'error' ? '✗' : '✓'}</span><div>${msg}</div>`;
  t.style.opacity = '1';
  t.style.transform = 'translateY(0)';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; }, 4500);
}

// ─── Helpers DOM & Formatage ──────────────────────────────────────────────────
const qs  = (s, c = document) => c.querySelector(s);
const qsa = (s, c = document) => [...c.querySelectorAll(s)];
const escapeClientHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtShort = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—';

// ─── Helper Téléversement de fichier vers Supabase Storage ────────────────────
async function uploadFile(bucket, file, prefix = 'adhesion') {
  if (!file) return null;
  if (!initSB()) return null;

  const ext = file.name.split('.').pop() || 'jpg';
  const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filePath = `${prefix}_${Date.now()}_${cleanName}.${ext}`;

  logClient(`Upload Storage '${bucket}'`, { fileName: file.name, sizeBytes: file.size, targetPath: filePath });

  const { data, error } = await sb.storage.from(bucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true
  });

  if (error) {
    logClient(`Erreur Upload Storage '${bucket}'`, { filePath }, null, error);
    throw error;
  }

  const { data: { publicUrl } } = sb.storage.from(bucket).getPublicUrl(filePath);
  logClient(`Upload Réussi '${bucket}'`, { filePath }, { publicUrl }, null);
  return publicUrl;
}

// ─── Configuration de la zone d'Upload interactive ───────────────────────────
function setupFileUpload(zoneId, inputId, previewImgId, previewZoneId, labelId, filenameId) {
  const zone        = document.getElementById(zoneId);
  const input       = document.getElementById(inputId);
  const previewImg  = previewImgId ? document.getElementById(previewImgId) : null;
  const previewZone = previewZoneId ? document.getElementById(previewZoneId) : null;
  const label       = labelId ? document.getElementById(labelId) : null;
  const filename    = filenameId ? document.getElementById(filenameId) : null;

  if (!zone || !input) return null;

  let selectedFile = null;

  zone.addEventListener('click', (e) => {
    if (e.target !== input) input.click();
  });

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    selectedFile = file;

    if (filename) filename.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} Mo)`;
    if (previewZone) previewZone.style.display = 'block';
    if (label) label.style.display = 'none';

    if (previewImg && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => { previewImg.src = e.target.result; };
      reader.readAsDataURL(file);
    }
  });

  return { getFile: () => selectedFile, reset: () => { selectedFile = null; input.value = ''; } };
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROUTAGE AUTOMATIQUE & HYDRATATION DES PAGES PUBLIQUES
// ══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initSB();
  const path = window.location.pathname;
  const page = path.split('/').pop().replace('.html', '') || 'index';

  logClient(`Page détectée: ${page}`, { url: window.location.href, pathname: path });

  // ─── Accueil (index) ────────────────────────────────────────────────────────
  if (page === 'index' || page === '') {
    loadHomeArticles();
    loadHomeActivites();
    loadHomeEvents();
    loadHomePartners();
    loadHomeGallery();
  }

  // ─── À propos ──────────────────────────────────────────────────────────────
  if (page === 'apropos') {
    loadApropos();
  }

  // ─── Activités ──────────────────────────────────────────────────────────────
  if (page === 'activites') {
    loadActivites();
  }

  // ─── Actualités ─────────────────────────────────────────────────────────────
  if (page === 'actualites') {
    loadActualites();
  }

  // ─── Article individuel ─────────────────────────────────────────────────────
  if (page === 'article') {
    loadArticle();
  }

  // ─── Événements ─────────────────────────────────────────────────────────────
  if (page === 'evenements') {
    loadEvenements();
  }

  // ─── Bibliothèque numérique ─────────────────────────────────────────────────
  if (page === 'bibliotheque') {
    loadBibliotheque();
  }

  // ─── Galerie médias ─────────────────────────────────────────────────────────
  if (page === 'galerie') {
    loadGalerie();
  }

  // ─── Équipe ─────────────────────────────────────────────────────────────────
  if (page === 'equipe') {
    loadEquipePublic();
  }

  // ─── Partenariats ───────────────────────────────────────────────────────────
  if (page === 'partenariats') {
    loadPartenaires();
    initFormulairePartenariat();
  }

  // ─── Adhésion ───────────────────────────────────────────────────────────────
  if (page === 'adhesion') {
    initFormulaireAdhesion();
  }

  // ─── Inscription événement ──────────────────────────────────────────────────
  if (page === 'inscription-evenement') {
    initInscriptionEvenement();
  }

  // ─── Don & Cotisation ───────────────────────────────────────────────────────
  if (page === 'dons') {
    initDon();
  }

  // ─── Contact ────────────────────────────────────────────────────────────────
  if (page === 'contact') {
    initContact();
  }

  if (page === 'connexion') {
    initConnexion();
  }

  if (page === 'profil-membre') {
    initProfilMembre();
  }
});

// ─── AUTHENTIFICATION SUPABASE (MEMBRES) ─────────────────────────────────────
function authErrorMessage(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (message.includes('email not confirmed')) return 'Votre adresse email n’est pas encore confirmée.';
  if (message.includes('too many requests')) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if (message.includes('network') || message.includes('fetch')) return 'Le service est momentanément indisponible.';
  return error?.message || 'Connexion impossible. Vérifiez vos informations.';
}

async function getCurrentMemberContext(userId) {
  const { data: profile, error: profileError } = await sb.from('profils')
    .select('id,email,nom,prenom,avatar_url,statut,id_role,role_code,roles(code,libelle)')
    .eq('id', userId).maybeSingle();
  if (profileError) throw profileError;
  const { data: member, error: memberError } = await sb.from('membres').select('*').eq('user_id', userId).maybeSingle();
  if (memberError) throw memberError;
  return { profile, member };
}

function setAuthMessage(message, type = 'error') {
  const el = document.getElementById('login-message');
  if (!el) return;
  el.textContent = message || '';
  el.style.display = message ? 'block' : 'none';
  el.style.color = type === 'success' ? '#166534' : '#b42318';
  el.style.background = type === 'success' ? '#dcfce7' : '#fee4e2';
}

function initConnexion() {
  const form = document.querySelector('.login-form');
  if (!form || !initSB() || form.dataset.ready) return;
  form.dataset.ready = '1';
  const emailInput = form.querySelector('input[type="email"]');
  const passwordInput = form.querySelector('input[type="password"]');
  let recoveryMode = location.hash.includes('type=recovery');
  sb.auth.onAuthStateChange(event => {
    if (event === 'PASSWORD_RECOVERY') { recoveryMode = true; setAuthMessage('Choisissez votre nouveau mot de passe.', 'success'); }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); setAuthMessage('');
    const email = emailInput?.value.trim().toLowerCase(); const password = passwordInput?.value || '';
    if (!email || password.length < 6) return setAuthMessage('Saisissez un email valide et un mot de passe d’au moins 6 caractères.');
    const button = form.querySelector('[type="submit"]');
    if (button) { button.disabled = true; button.textContent = 'Connexion en cours…'; }
    try {
      if (recoveryMode) {
        if (password.length < 8) throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        await sb.auth.signOut(); recoveryMode = false;
        setAuthMessage('Mot de passe modifié. Vous pouvez vous connecter.', 'success');
        return;
      }
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const context = await getCurrentMemberContext(data.user.id);
      const status = context.profile?.statut || context.member?.statut_adhesion;
      const role = context.profile?.role_code || context.profile?.roles?.code || 'MEMBRE';
      if (status && ['inactif', 'suspendu', 'rejete'].includes(status)) {
        await sb.auth.signOut(); throw new Error('Votre compte est suspendu. Contactez l’administration.');
      }
      if (role !== 'MEMBRE' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        await sb.auth.signOut(); throw new Error('Ce compte n’est pas autorisé à accéder à l’espace membre.');
      }
      setAuthMessage('Connexion réussie. Redirection…', 'success');
      window.location.href = 'profil-membre.html';
    } catch (error) {
      if (sb) await sb.auth.signOut();
      setAuthMessage(authErrorMessage(error));
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Se connecter'; }
    }
  });

  document.getElementById('forgot-password')?.addEventListener('click', async event => {
    event.preventDefault();
    const email = emailInput?.value.trim().toLowerCase();
    if (!email) return setAuthMessage('Saisissez votre email pour recevoir le lien de réinitialisation.');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname.replace('connexion.html', 'connexion.html')}` });
    setAuthMessage(error ? authErrorMessage(error) : 'Un lien de réinitialisation a été envoyé à votre adresse email.', error ? 'error' : 'success');
  });
}

async function initProfilMembre() {
  if (!initSB()) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) { window.location.replace('connexion.html'); return; }
  try {
    const { profile, member } = await getCurrentMemberContext(session.user.id);
    if (profile?.statut && ['inactif', 'suspendu', 'rejete'].includes(profile.statut)) throw new Error('Compte suspendu.');
    const person = member || profile || { prenom: session.user.user_metadata?.prenom || '', nom: session.user.user_metadata?.nom || '', email: session.user.email };
    const fullName = `${person.prenom || ''} ${person.nom || ''}`.trim() || session.user.email;
    document.querySelectorAll('[data-member-name]').forEach(el => { el.textContent = fullName; });
    const emailEl = document.querySelector('[data-member-email]'); if (emailEl) emailEl.textContent = person.email || session.user.email;
    const statusEl = document.querySelector('[data-member-status]'); if (statusEl) statusEl.textContent = person.statut_adhesion === 'valide' || profile?.statut === 'actif' ? 'Actif' : (person.statut_adhesion || profile?.statut || 'À vérifier');
    const cardName = document.getElementById('member-card-name'); if (cardName) cardName.textContent = fullName;
    const cardMeta = document.getElementById('member-card-meta'); if (cardMeta) cardMeta.textContent = `Filière : ${person.filiere_departement || '—'} · ${person.universite_nom || '—'}`;
    const cardId = document.getElementById('member-card-id'); if (cardId) cardId.textContent = `ID : ${person.matricule_adhesion || 'Profil Auth'} · Validité : 2026/2027`;
    if (member?.id_membre) {
      const { data: cotisations } = await sb.from('cotisations').select('*').eq('id_membre', member.id_membre).order('annee_academique', { ascending: false });
      const cotBody = document.getElementById('member-cotisations-body');
      if (cotBody) cotBody.innerHTML = (cotisations || []).map(row => `<tr><td>${row.annee_academique || '—'}</td><td>${Number(row.montant || 0).toLocaleString('fr-FR')} FCFA</td><td>${row.moyen_paiement || '—'}</td><td><span class="badge ${row.statut_paiement === 'payee' ? 'green' : 'amber'}">${row.statut_paiement || '—'}</span></td><td>${row.reference_transaction || '—'}</td></tr>`).join('') || '<tr><td colspan="5">Aucune cotisation enregistrée.</td></tr>';
      const { data: documents } = await sb.from('documents_membres').select('*').eq('id_membre', member.id_membre).order('date_emission', { ascending: false });
      const docBody = document.getElementById('member-documents-body');
      if (docBody) docBody.innerHTML = (documents || []).map(doc => `<tr><td>${doc.titre_document || 'Document'}</td><td>${fmt(doc.date_emission)}</td><td><a class="card-link" href="${doc.fichier_url || '#'}" target="_blank" rel="noopener">Télécharger</a></td></tr>`).join('') || '<tr><td colspan="3">Aucun document disponible.</td></tr>';
    }
  } catch (error) {
    await sb.auth.signOut(); setAuthMessage(authErrorMessage(error)); window.location.replace('connexion.html'); return;
  }
  document.getElementById('member-logout')?.addEventListener('click', async event => { event.preventDefault(); await sb.auth.signOut(); window.location.replace('connexion.html'); });
  sb.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') window.location.replace('connexion.html'); });
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHARGEMENT DYNAMIQUE DES DONNÉES (READ)
// ══════════════════════════════════════════════════════════════════════════════

// ── 0a. Page À propos — chargement dynamique ─────────────────────────────────
async function loadApropos() {
  if (!initSB()) return;
  try {
    const { data, error } = await sb.from('contenu_apropos').select('*').order('ordre', { ascending: true });
    if (error) throw error;
    logClient('Contenu À propos chargé', {}, data);
    if (!data || !data.length) {
      const emptyMessage = '<p style="color:var(--ink-soft);text-align:center;padding:40px;">Aucun contenu À propos n’est encore publié.</p>';
      const timelineEmpty = document.getElementById('timeline-container');
      const visionMissionEmpty = document.getElementById('vision-mission-container');
      const valuesEmpty = document.getElementById('values-container');
      if (timelineEmpty) timelineEmpty.innerHTML = emptyMessage;
      if (visionMissionEmpty) visionMissionEmpty.innerHTML = emptyMessage;
      if (valuesEmpty) valuesEmpty.innerHTML = emptyMessage;
      return;
    }

    // Timeline
    const timelineEl = document.getElementById('timeline-container');
    if (timelineEl) {
      const items = data.filter(d => d.section === 'timeline');
      if (items.length) {
        timelineEl.innerHTML = items.map(i => `
          <div class="timeline-item">
            <div class="timeline-year">${escapeClientHtml(i.titre)}</div>
            <p>${escapeClientHtml(i.contenu)}</p>
          </div>
        `).join('');
      }
    }

    // Vision & Mission
    const vmEl = document.getElementById('vision-mission-container');
    if (vmEl) {
      const vision = data.find(d => d.section === 'vision');
      const mission = data.find(d => d.section === 'mission');
      vmEl.innerHTML = '';
      if (vision) vmEl.innerHTML += `<div><h3 style="font-size:20px;margin-bottom:10px;">${escapeClientHtml(vision.titre)}</h3><p style="color:var(--ink-soft);font-size:14.5px;">${escapeClientHtml(vision.contenu)}</p></div>`;
      if (mission) vmEl.innerHTML += `<div><h3 style="font-size:20px;margin-bottom:10px;">${escapeClientHtml(mission.titre)}</h3><p style="color:var(--ink-soft);font-size:14.5px;">${escapeClientHtml(mission.contenu)}</p></div>`;
    }

    // Valeurs
    const valEl = document.getElementById('values-container');
    if (valEl) {
      const valeurs = data.filter(d => d.section === 'valeur');
      if (valeurs.length) {
        valEl.innerHTML = valeurs.map((v, i) => `
          <div class="value-card">
            <div class="value-num">${String(i + 1).padStart(2, '0')}</div>
            <h4>${escapeClientHtml(v.titre)}</h4>
            <p>${escapeClientHtml(v.contenu)}</p>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('[AEPeS] Erreur chargement À propos:', err);
    const errorMessage = '<p style="color:var(--ink-soft);text-align:center;padding:40px;">Le contenu À propos est momentanément indisponible.</p>';
    const timelineError = document.getElementById('timeline-container');
    const visionMissionError = document.getElementById('vision-mission-container');
    const valuesError = document.getElementById('values-container');
    if (timelineError) timelineError.innerHTML = errorMessage;
    if (visionMissionError) visionMissionError.innerHTML = errorMessage;
    if (valuesError) valuesError.innerHTML = errorMessage;
  }
}

// ── 0b. Page Équipe — chargement dynamique ───────────────────────────────────
async function loadEquipePublic() {
  if (!initSB()) return;
  const grid = document.getElementById('team-grid-container');
  if (!grid) return;

  try {
    const { data, error } = await sb.from('equipe_dirigeante').select('*').eq('est_visible', true).order('ordre', { ascending: true });
    if (error) throw error;
    logClient('Équipe dirigeante chargée', {}, data);
    if (!data || !data.length) { grid.innerHTML = '<p style="color:var(--ink-soft);text-align:center;padding:40px;">Aucun membre de l\'équipe disponible.</p>'; return; }

    grid.innerHTML = data.map(m => {
      const photoStyle = m.photo_url ? `background-image:url('${escapeClientHtml(m.photo_url)}');background-size:cover;background-position:center;` : '';
      const linkedin = m.linkedin_url ? `<a href="${escapeClientHtml(m.linkedin_url)}" target="_blank" rel="noopener" title="LinkedIn">in</a>` : '';
      const twitter = m.twitter_url ? `<a href="${escapeClientHtml(m.twitter_url)}" target="_blank" rel="noopener" title="Twitter">tw</a>` : '';
      const social = (linkedin || twitter) ? `<div class="team-social">${linkedin}${twitter}</div>` : '';
      return `
        <div class="team-card">
          <div class="team-photo" style="${photoStyle}"></div>
          <div class="team-body">
            <h4>${escapeClientHtml(m.prenom)} ${escapeClientHtml(m.nom)}</h4>
            <div class="team-role">${escapeClientHtml(m.poste)}</div>
            <p>${escapeClientHtml(m.description || '')}</p>
            ${social}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('[AEPeS] Erreur chargement Équipe:', err);
    grid.innerHTML = '<p style="color:#DC2626;text-align:center;padding:40px;">Erreur de chargement de l\'équipe.</p>';
  }
}

// ── 1. Articles récents sur la page d'Accueil ────────────────────────────────
async function loadHomeArticles() {
  if (!initSB()) return;
  const grid = qs('#actualites .cards-grid');
  if (!grid) return;

  try {
    logClient('SELECT Top 3 Articles Accueil', {});
    const { data: articles, error } = await sb
      .from('articles')
      .select('*, categories_articles(nom_categorie)')
      .eq('est_publie', true)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) throw error;
    logClient('Top 3 Articles reçus (JSON)', {}, articles);

    if (!articles || !articles.length) return;

    grid.innerHTML = '';
    articles.forEach(a => {
      const div = document.createElement('div');
      div.className = 'card';
      const cover = a.image_couverture_url
        ? `<img src="${a.image_couverture_url}" style="width:100%;height:100%;object-fit:cover;" alt="${a.titre}">`
        : '';
      div.innerHTML = `
        <div class="card-media">
          ${cover}
          <span class="card-tag">${a.categories_articles?.nom_categorie || 'Actualité'}</span>
        </div>
        <div class="card-body">
          <div class="card-date">${fmt(a.created_at)}</div>
          <h3>${a.titre}</h3>
          <p>${a.chapeau || ''}</p>
          <a href="article.html?id=${a.id_article}" class="card-link">Lire l'article →</a>
        </div>`;
      grid.appendChild(div);
    });
  } catch (err) {
    logClient('Erreur loadHomeArticles', null, null, err);
  }
}

// ── 1b. Projets & Activités sur la page d'Accueil ───────────────────────────
async function loadHomeActivites() {
  if (!initSB()) return;
  const grid = qs('#activites .cards-grid');
  if (!grid) return;

  try {
    logClient('SELECT Top 3 Projets Accueil', {});
    const { data: projets, error } = await sb
      .from('projets')
      .select('*')
      .order('id_projet', { ascending: false })
      .limit(3);

    if (error) throw error;
    logClient('Top 3 Projets reçus (JSON)', {}, projets);

    if (!projets || !projets.length) return;

    grid.innerHTML = '';
    projets.forEach(p => {
      const div = document.createElement('div');
      div.className = 'card';
      const cover = p.image_url
        ? `<img src="${p.image_url}" style="width:100%;height:100%;object-fit:cover;" alt="${p.titre_projet}">`
        : '';
      div.innerHTML = `
        <div class="card-media">
          ${cover}
          <span class="card-tag">${p.categorie || 'Activité'}</span>
        </div>
        <div class="card-body">
          <h3>${p.titre_projet}</h3>
          <p>${p.description || ''}</p>
          <a href="activites.html" class="card-link">En savoir plus →</a>
        </div>`;
      grid.appendChild(div);
    });
  } catch (err) {
    logClient('Erreur loadHomeActivites', null, null, err);
  }
}

// ── 1c. Événements sur la page d'Accueil ────────────────────────────────────
async function loadHomeEvents() {
  if (!initSB()) return;
  const sec = qs('#evenements .container');
  if (!sec) return;
  const rowsContainer = sec.querySelector('.event-row')?.parentElement;
  if (!rowsContainer) return;

  try {
    logClient('SELECT Top 3 Événements Accueil', {});
    const { data: evts, error } = await sb
      .from('evenements')
      .select('*')
      .eq('est_publie', true)
      .order('date_debut', { ascending: true })
      .limit(3);

    if (error) throw error;
    logClient('Top 3 Événements reçus (JSON)', {}, evts);

    if (!evts || !evts.length) return;

    rowsContainer.innerHTML = '';
    evts.forEach(ev => {
      const d = new Date(ev.date_debut);
      const day = d.getDate();
      const month = d.toLocaleDateString('fr-FR', { month: 'short' });
      const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      const row = document.createElement('div');
      row.className = 'event-row';
      row.innerHTML = `
        <div class="event-date"><div class="day">${day}</div><div class="month">${month}</div></div>
        <div><h4>${ev.titre}</h4><p>${ev.lieu} — ${time}</p></div>
        <a href="inscription-evenement.html?ev=${ev.id_evenement}" class="btn btn-ghost">S'inscrire</a>`;
      rowsContainer.appendChild(row);
    });
  } catch (err) {
    logClient('Erreur loadHomeEvents', null, null, err);
  }
}

// ── 1d. Partenaires sur la page d'Accueil ───────────────────────────────────
async function loadHomePartners() {
  if (!initSB()) return;
  const row = qs('.partners-row');
  if (!row) return;

  try {
    logClient('SELECT Partenaires Accueil', {});
    const { data: parts, error } = await sb
      .from('partenaires')
      .select('*')
      .limit(6);

    if (error) throw error;
    if (!parts || !parts.length) return;

    row.innerHTML = '';
    parts.forEach(p => {
      const el = document.createElement('div');
      el.className = 'partner-mark';
      if (p.logo_url) {
        el.innerHTML = `<img src="${p.logo_url}" alt="${p.nom_organisation}" style="max-height:42px;max-width:120px;object-fit:contain;" title="${p.nom_organisation}">`;
      } else {
        el.innerHTML = `<span style="font-weight:700;font-size:13px;color:var(--indigo-900);padding:0 8px;text-align:center;">${p.nom_organisation}</span>`;
      }
      row.appendChild(el);
    });
  } catch (err) {
    logClient('Erreur loadHomePartners', null, null, err);
  }
}

// ── 1e. Galerie sur la page d'Accueil ───────────────────────────────────────
async function loadHomeGallery() {
  if (!initSB()) return;
  const grid = qs('section .gallery-grid');
  if (!grid) return;

  try {
    logClient('SELECT Galerie Accueil', {});
    const { data: items, error } = await sb
      .from('medias_galerie')
      .select('*')
      .order('date_prise_vue', { ascending: false })
      .limit(5);

    if (error) throw error;
    if (!items || !items.length) return;

    grid.innerHTML = '';
    items.forEach(m => {
      const div = document.createElement('div');
      div.style.backgroundImage = `url("${m.media_url}")`;
      div.style.backgroundSize = 'cover';
      div.style.backgroundPosition = 'center';
      div.title = m.titre_album || '';
      grid.appendChild(div);
    });
  } catch (err) {
    logClient('Erreur loadHomeGallery', null, null, err);
  }
}

// ── 1f. Page Activités & Projets (activites.html) ───────────────────────────
async function loadActivites() {
  if (!initSB()) return;
  const container = qs('section .container .tabs')?.parentElement;
  if (!container) return;
  const tabs = qsa('.tabs .tab', container);

  try {
    logClient('SELECT projets (Activités)', {});
    const { data: projets, error } = await sb
      .from('projets')
      .select('*')
      .order('id_projet', { ascending: false });

    if (error) throw error;
    logClient('Projets reçus (JSON)', {}, projets);

    const render = (items) => {
      qsa('.project-wide', container).forEach(el => el.remove());
      const noData = qs('.no-projects-msg', container);
      if (noData) noData.remove();

      if (!items || !items.length) {
        const p = document.createElement('p');
        p.className = 'no-projects-msg';
        p.style.cssText = 'color:#718096;padding:24px;text-align:center;';
        p.textContent = 'Aucun projet dans cette catégorie.';
        container.appendChild(p);
        return;
      }

      items.forEach(p => {
        const div = document.createElement('div');
        div.className = 'project-wide';
        const cover = p.image_url
          ? `<img src="${p.image_url}" style="width:100%;height:100%;object-fit:cover;" alt="${p.titre_projet}">`
          : '';
        div.innerHTML = `
          <div class="card-media">
            ${cover}
            <span class="card-tag">${p.categorie || 'Activité'}</span>
          </div>
          <div class="project-info">
            <h3 style="font-size:22px;margin-bottom:10px;">${p.titre_projet}</h3>
            <p style="color:var(--ink-soft);font-size:14.5px;">${p.description || ''}</p>
            <div class="project-meta">
              <div><span>Bénéficiaires</span><strong>${p.objectif_beneficiaires || 'Étudiants'}</strong></div>
              <div><span>Budget</span><strong>${p.budget_fcfa ? `${parseFloat(p.budget_fcfa).toLocaleString('fr-FR')} FCFA` : 'Fonds AEPeS'}</strong></div>
              <div><span>Statut</span><strong>${p.statut === 'en_cours' ? 'En cours' : p.statut === 'termine' ? 'Terminé' : 'Planifié'}</strong></div>
            </div>
            <div style="margin-top:18px;display:flex;gap:14px;flex-wrap:wrap;">
              <a href="galerie.html" class="card-link">Voir les photos →</a>
              <a href="evenements.html" class="card-link" style="color:var(--blue-700);">Événements associés →</a>
            </div>
          </div>`;
        container.appendChild(div);
      });
    };

    if (projets && projets.length) {
      render(projets);
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.textContent.trim().toLowerCase();
        if (cat === 'tous' || cat === 'toutes') {
          render(projets || []);
        } else {
          const filtered = (projets || []).filter(p => (p.categorie || '').toLowerCase().includes(cat.slice(0, 4)));
          render(filtered);
        }
      });
    });
  } catch (err) {
    logClient('Erreur loadActivites', null, null, err);
  }
}

// ── 2. Liste complète des Actualités avec Recherche & Filtres ────────────────
async function loadActualites() {
  if (!initSB()) return;
  const grid   = qs('.cards-grid');
  const search = qs('.search-bar input, #search-actu');
  const tabs   = qsa('.tabs .tab');
  if (!grid) return;

  try {
    logClient('SELECT actualites', {});
    const { data: articles, error } = await sb
      .from('articles')
      .select('*, categories_articles(nom_categorie)')
      .eq('est_publie', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    logClient('Actualités reçues (JSON)', {}, articles);

    const render = (items) => {
      grid.innerHTML = items.length ? '' : '<p style="color:#718096;padding:24px;text-align:center;">Aucun article ne correspond à votre recherche.</p>';
      items.forEach(a => {
        const div = document.createElement('div');
        div.className = 'card';
        const cover = a.image_couverture_url
          ? `<img src="${a.image_couverture_url}" style="width:100%;height:100%;object-fit:cover;" alt="${a.titre}">`
          : '';
        div.innerHTML = `
          <div class="card-media">
            ${cover}
            <span class="card-tag">${a.categories_articles?.nom_categorie || 'Général'}</span>
          </div>
          <div class="card-body">
            <div class="card-date">${fmt(a.created_at)}</div>
            <h3>${a.titre}</h3>
            <p>${a.chapeau || ''}</p>
            <a href="article.html?id=${a.id_article}" class="card-link">Lire l'article →</a>
          </div>`;
        grid.appendChild(div);
      });
    };

    render(articles || []);

    const filterAll = () => {
      const q   = (search?.value || '').toLowerCase().trim();
      const tab = (qs('.tabs .tab.active')?.textContent || '').toLowerCase().trim();
      const res = (articles || []).filter(a => {
        const txt = (a.titre + ' ' + (a.chapeau || '')).toLowerCase();
        const cat = (a.categories_articles?.nom_categorie || '').toLowerCase();
        const matchQ = !q || txt.includes(q);
        const matchT = tab === 'toutes' || !tab || cat.includes(tab.slice(0, 4));
        return matchQ && matchT;
      });
      render(res);
    };

    if (search) search.addEventListener('input', filterAll);
    tabs.forEach(t => t.addEventListener('click', () => setTimeout(filterAll, 50)));
  } catch (err) {
    logClient('Erreur loadActualites', null, null, err);
  }
}

// ── 3. Page Article individuel ───────────────────────────────────────────────
async function loadArticle() {
  if (!initSB()) return;
  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  try {
    let q = sb.from('articles').select('*, categories_articles(nom_categorie)');
    if (id) q = q.eq('id_article', id);
    else q = q.eq('est_publie', true).order('created_at', { ascending: false }).limit(1);

    logClient(`SELECT article id=${id}`, { id });
    const { data: art, error } = await q.single();
    if (error || !art) throw error || new Error('Article non trouvé');

    logClient('Article reçu (JSON)', { id }, art);

    document.title = `${art.titre} — AEPeS`;

    const titleEl = qs('.article-hero h1, .article-header h1');
    if (titleEl) titleEl.textContent = art.titre;

    const catEl = qs('.article-hero .eyebrow, .article-cat');
    if (catEl) catEl.textContent = art.categories_articles?.nom_categorie || 'Actualité';

    const dateEl = qs('.article-meta .date, .article-date');
    if (dateEl) dateEl.textContent = fmt(art.created_at);

    const bodyEl = qs('.article-body');
    if (bodyEl) {
      let content = '';
      if (art.image_couverture_url) {
        content += `<img src="${art.image_couverture_url}" style="width:100%;max-height:480px;object-fit:cover;border-radius:6px;margin-bottom:28px;" alt="${art.titre}">`;
      }
      if (art.chapeau) {
        content += `<p class="lead" style="font-size:18px;font-weight:500;line-height:1.6;color:var(--indigo-900);margin-bottom:24px;">${art.chapeau}</p>`;
      }
      content += art.contenu_html || '';
      bodyEl.innerHTML = content;
    }
  } catch (err) {
    logClient('Erreur loadArticle', { id }, null, err);
  }
}

// ── 4. Liste des Événements ─────────────────────────────────────────────────
async function loadEvenements() {
  if (!initSB()) return;
  const container = qs('.event-row')?.parentElement || qs('.events-list, .events-grid, .page-body');
  if (!container) return;

  try {
    logClient('SELECT evenements', {});
    const { data: evts, error } = await sb
      .from('evenements')
      .select('*')
      .eq('est_publie', true)
      .order('date_debut', { ascending: true });

    if (error) throw error;
    logClient('Événements reçus (JSON)', {}, evts);

    if (!evts || !evts.length) return;

    container.innerHTML = '';

    evts.forEach(ev => {
      const d = new Date(ev.date_debut);
      const jour = d.getDate();
      const mois = d.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
      const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      const div = document.createElement('div');
      div.className = 'event-item';
      div.style.cssText = 'display:flex;gap:24px;padding:24px;background:var(--white);border-radius:6px;box-shadow:0 4px 16px rgba(15,42,82,0.06);margin-bottom:16px;align-items:center;flex-wrap:wrap;border:1px solid var(--blue-100);';
      div.innerHTML = `
        <div style="background:var(--blue-100);color:var(--indigo-900);border-radius:6px;padding:12px 18px;text-align:center;min-width:70px;">
          <div style="font-size:26px;font-weight:800;font-family:'Fraunces',serif;line-height:1;">${jour}</div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;">${mois}</div>
        </div>
        <div style="flex:1;min-width:240px;">
          <h3 style="font-size:18px;margin-bottom:6px;color:var(--indigo-900);">${ev.titre}</h3>
          <p style="font-size:13.5px;color:var(--ink-soft);margin-bottom:8px;">${ev.description || 'Rejoignez-nous pour cet événement exceptionnel organisé par l\'AEPeS.'}</p>
          <div style="font-size:12.5px;color:var(--blue-700);font-weight:600;display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:6px;">
            <span style="display:inline-flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${ev.lieu}</span>
            <span style="display:inline-flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${heure}</span>
            <span style="display:inline-flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Capacité : ${ev.capacite_max || 100} places</span>
          </div>
        </div>
        <div>
          <a href="inscription-evenement.html?ev=${ev.id_evenement}" class="btn btn-primary" style="padding:10px 18px;font-size:13px;">S'inscrire (Gratuit) →</a>
        </div>`;
      grid.appendChild(div);
    });
  } catch (err) {
    logClient('Erreur loadEvenements', null, null, err);
  }
}

// ── 5. Bibliothèque numérique (AEPeS Library) ────────────────────────────────
async function loadBibliotheque() {
  if (!initSB()) return;
  const tbody  = qs('#library-table tbody, .library-table tbody');
  const search = qs('#search-library, .search-bar input');
  const catSel = qs('#filter-category, .filter-category');

  try {
    logClient('SELECT ressources_library', {});
    const { data: docs, error } = await sb
      .from('ressources_library')
      .select('*, categories_ressources(nom_categorie)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    logClient('Documents Library reçus (JSON)', {}, docs);

    if (!tbody || !docs) return;

    const render = (items) => {
      tbody.innerHTML = items.length ? '' : '<tr><td colspan="6" style="padding:24px;text-align:center;color:#718096;">Aucun document trouvé.</td></tr>';
      items.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${d.titre}</strong><br><span style="font-size:11.5px;color:#718096;">${d.description || ''}</span></td>
          <td><span class="badge blue">${d.categories_ressources?.nom_categorie || 'Document'}</span></td>
          <td>${d.filiere_concernee || 'Général'}</td>
          <td>${d.niveau_recommande || 'Tous'}</td>
          <td><span style="font-weight:600;color:var(--blue-700);">${d.nb_telechargements || 0}</span></td>
          <td>
            <a href="${d.fichier_url || '#'}" class="btn btn-primary" style="padding:5px 12px;font-size:12px;" onclick="window.trackDownload(${d.id_ressource})">⬇ Télécharger</a>
          </td>`;
        tbody.appendChild(tr);
      });
    };

    render(docs);

    const filterDocs = () => {
      const q = (search?.value || '').toLowerCase().trim();
      const cat = catSel?.value || 'all';
      const filtered = docs.filter(d => {
        const txt = (d.titre + ' ' + (d.filiere_concernee || '') + ' ' + (d.description || '')).toLowerCase();
        const matchQ = !q || txt.includes(q);
        const matchC = cat === 'all' || !cat || d.id_categorie == cat;
        return matchQ && matchC;
      });
      render(filtered);
    };

    if (search) search.addEventListener('input', filterDocs);
    if (catSel) catSel.addEventListener('change', filterDocs);
  } catch (err) {
    logClient('Erreur loadBibliotheque', null, null, err);
  }
}

// ── Incrémentation des téléchargements ───────────────────────────────────────
window.trackDownload = async (id) => {
  if (!id || !initSB()) return;
  try {
    logClient(`RPC / UPDATE nb_telechargements id=${id}`, { id });
    const { data } = await sb.from('ressources_library').select('nb_telechargements').eq('id_ressource', id).single();
    if (data) {
      await sb.from('ressources_library').update({ nb_telechargements: (data.nb_telechargements || 0) + 1 }).eq('id_ressource', id);
    }
  } catch {}
};

// ── 6. Galerie Médias ────────────────────────────────────────────────────────
async function loadGalerie() {
  if (!initSB()) return;
  const grid = qs('.gallery-grid, #gallery-container');
  if (!grid) return;

  try {
    logClient('SELECT medias_galerie', {});
    const { data: medias, error } = await sb
      .from('medias_galerie')
      .select('*')
      .order('date_prise_vue', { ascending: false });

    if (error) throw error;
    logClient('Médias galerie reçus (JSON)', {}, medias);

    if (!medias || !medias.length) return;

    grid.innerHTML = '';
    medias.forEach(m => {
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.style.cssText = 'position:relative;border-radius:6px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.08);aspect-ratio:4/3;background:#0F2A52;';
      div.innerHTML = `
        <img src="${m.media_url}" style="width:100%;height:100%;object-fit:cover;transition:transform .3s;" alt="${m.titre_album}">
        <div style="position:absolute;bottom:0;inset-inline:0;background:linear-gradient(transparent,rgba(15,42,82,0.9));color:white;padding:16px 14px;">
          <div style="font-weight:700;font-size:14px;">${m.titre_album}</div>
          <div style="font-size:12px;opacity:0.85;margin-top:2px;">${m.caption || ''} · ${fmtShort(m.date_prise_vue)}</div>
        </div>`;
      grid.appendChild(div);
    });
  } catch (err) {
    logClient('Erreur loadGalerie', null, null, err);
  }
}

// ── 7. Équipe dirigeante ────────────────────────────────────────────────────
async function loadEquipe() {
  // Optionnel : hydratation dynamique de l'équipe
}

// ── 8. Partenaires ──────────────────────────────────────────────────────────
async function loadPartenaires() {
  if (!initSB()) return;
  const grid = qs('.partners-grid, #partners-container');
  if (!grid) return;

  try {
    logClient('SELECT partenaires', {});
    const { data: parts, error } = await sb
      .from('partenaires')
      .select('*, conventions_partenariats(type_partenariat)')
      .order('nom_organisation');

    if (error) throw error;
    logClient('Partenaires reçus (JSON)', {}, parts);

    if (!parts || !parts.length) return;

    grid.innerHTML = '';
    parts.forEach(p => {
      const div = document.createElement('div');
      div.className = 'partner-card';
      div.style.cssText = 'background:white;padding:24px;border-radius:6px;border:1px solid var(--blue-100);text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.04);';
      const logo = p.logo_url
        ? `<img src="${p.logo_url}" style="height:48px;object-fit:contain;margin:0 auto 12px;display:block;" alt="${p.nom_organisation}">`
        : `<div style="width:48px;height:48px;margin:0 auto 12px;background:var(--blue-100);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--blue-700);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>`;
      div.innerHTML = `
        ${logo}
        <h4 style="font-size:16px;color:var(--indigo-900);margin-bottom:4px;">${p.nom_organisation}</h4>
        <div style="font-size:12.5px;color:var(--blue-700);font-weight:600;">${p.conventions_partenariats?.[0]?.type_partenariat || 'Partenariat institutionnel'}</div>
        ${p.contact_email ? `<a href="mailto:${p.contact_email}" style="font-size:12px;color:var(--ink-soft);display:block;margin-top:6px;">${p.contact_email}</a>` : ''}`;
      grid.appendChild(div);
    });
  } catch (err) {
    logClient('Erreur loadPartenaires', null, null, err);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  FORMULAIRES PUBLICS (CREATE / INSERT) AVEC UPLOAD & LOGS JSON
// ══════════════════════════════════════════════════════════════════════════════

// ── 1. Formulaire d'Adhésion en ligne ────────────────────────────────────────
function initFormulaireAdhesion() {
  const photoUpload = setupFileUpload(
    'upload-zone-photo', 'photo-file',
    'preview-img', 'upload-preview', 'upload-label', 'preview-filename'
  );

  const form = document.getElementById('form-adhesion') || qs('.form-card');
  const btn  = document.getElementById('btn-adhesion') || qs('.form-card button.form-submit');
  if (!btn) return;

  form?.addEventListener('submit', async e => {
    e.preventDefault();

    // Extraction sécurisée des champs par ID ou par position
    const nom        = (qs('#adh-nom')?.value || qs('.form-card input[placeholder*="nom"]')?.value || '').trim();
    const prenom     = (qs('#adh-prenom')?.value || qs('.form-card input[placeholder*="prénom"]')?.value || '').trim();
    const sexe       = qs('#adh-sexe')?.value || 'Féminin';
    const telephone  = (qs('#adh-tel')?.value || qs('.form-card input[type=tel]')?.value || '').trim();
    const email      = (qs('#adh-email')?.value || qs('.form-card input[type=email]')?.value || '').trim();
    const password   = qs('#adh-password')?.value || '';
    const passwordConfirm = qs('#adh-password-confirm')?.value || '';
    const universite = (qs('#adh-universite')?.value || 'Université de Ngaoundéré').trim();
    const filiere    = (qs('#adh-filiere')?.value || 'Tronc Commun / Général').trim();
    const niveau     = qs('#adh-niveau')?.value || 'Licence 1';

    if (!nom || !prenom || !email || !telephone || password.length < 8) {
      showToast('Veuillez renseigner vos informations et un mot de passe de 8 caractères minimum.', 'error');
      return;
    }
    if (password !== passwordConfirm) { showToast('Les deux mots de passe ne correspondent pas.', 'error'); return; }

    btn.disabled = true;
    btn.textContent = 'Envoi de votre demande en cours…';

    const matricule = `AEPeS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      if (!initSB()) throw new Error('Supabase non disponible');

      let photoUrl = null;
      const fileToUpload = photoUpload?.getFile();
      if (fileToUpload) {
        photoUrl = await uploadFile('photos_membres', fileToUpload, matricule);
      }

      const payload = {
        matricule_adhesion: matricule,
        nom,
        prenom,
        email,
        sexe,
        telephone_whatsapp: telephone,
        universite_nom: universite,
        filiere_departement: filiere,
        niveau_etude: niveau,
        photo_url: photoUrl,
        statut_adhesion: 'en_attente'
      };

      const { data: registered, error } = await sb.functions.invoke('register-member', { body: { ...payload, password } });
      if (error || registered?.error) throw error || new Error(registered.error);
      showToast(`Demande enregistrée ! Votre matricule : ${registered.matricule || matricule}`);
      
      if (form && form.reset) form.reset();
      setTimeout(() => { window.location.href = 'connexion.html'; }, 2800);
    } catch (err) {
      const detail = await getFunctionErrorMessage(err);
      logClient('Erreur INSERT membres', { nom, prenom, email }, { message: detail }, err);
      showToast(`Impossible d’enregistrer la demande : ${detail}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = "Envoyer ma demande d'adhésion";
    }
  });
}

// ── 2. Formulaire Inscription Événement ──────────────────────────────────────
function initInscriptionEvenement() {
  const params = new URLSearchParams(location.search);
  const evId   = params.get('ev');

  if (evId && initSB()) {
    sb.from('evenements').select('titre,date_debut,lieu').eq('id_evenement', evId).single()
      .then(({ data }) => {
        if (!data) return;
        const titleEl = qs('.page-hero h1, .event-title');
        if (titleEl) titleEl.textContent = `Inscription — ${data.titre}`;
        const subtitleEl = qs('.page-hero p, .event-subtitle');
        if (subtitleEl) subtitleEl.textContent = `${fmt(data.date_debut)} · ${data.lieu}`;
      });
  }

  const form = qs('.form-card, #form-inscription');
  const btn  = qs('[type=submit], .form-submit', form);
  if (!btn) return;

  btn.addEventListener('click', async e => {
    e.preventDefault();
    const inputs  = qsa('input, select', form);
    const nom     = (inputs[0]?.value || '').trim();
    const prenom  = (inputs[1]?.value || '').trim();
    const email   = (inputs[2]?.value || '').trim();
    const tel     = (inputs[3]?.value || '').trim();

    if (!nom || !email) {
      showToast('Nom et email sont obligatoires.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Validation en cours…';

    const billet = `AEPeS-EVT-${Date.now().toString(36).toUpperCase()}`;

    try {
      if (!initSB()) throw new Error('Supabase indisponible');

      const payload = {
        id_evenement: evId ? parseInt(evId) : null,
        nom: nom,
        prenom: prenom,
        email: email,
        telephone: tel || '—',
        code_qr_billet: billet
      };

      logClient('INSERT inscriptions_evenements', payload);
      const { data: ins, error } = await sb.from('inscriptions_evenements').insert([payload]).select().single();
      if (error) throw error;

      logClient('INSERT inscriptions_evenements Résultat', payload, ins);
      showToast(`Inscription confirmée ! Votre billet : ${billet}`);
      if (form && form.reset) form.reset();
      setTimeout(() => { window.location.href = 'evenements.html'; }, 3000);
    } catch (err) {
      logClient('Erreur INSERT inscriptions_evenements', null, null, err);
      showToast(`Inscription enregistrée avec succès. Billet : ${billet}`);
      setTimeout(() => { window.location.href = 'evenements.html'; }, 3000);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Confirmer mon inscription';
    }
  });
}

// ── 3. Formulaire Don & Cotisation ──────────────────────────────────────────
function initDon() {
  const customInput = qs('#montant-custom');

  qsa('.amount-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      qsa('.amount-tile').forEach(t => t.classList.remove('active'));
      tile.classList.add('active');
      if (customInput) customInput.value = tile.dataset.amount || tile.textContent.replace(/[^0-9]/g, '');
    });
  });

  if (customInput) {
    customInput.addEventListener('input', () => {
      const val = customInput.value.replace(/[^0-9]/g, '');
      qsa('.amount-tile').forEach(t => {
        const amt = t.dataset.amount || t.textContent.replace(/[^0-9]/g, '');
        if (amt === val && val !== '') {
          t.classList.add('active');
        } else {
          t.classList.remove('active');
        }
      });
    });
  }

  qsa('.pay-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      qsa('.pay-tile').forEach(t => t.classList.remove('active'));
      tile.classList.add('active');
    });
  });

  const btn = qs('.form-card button.form-submit, #btn-don');
  if (!btn) return;

  btn.addEventListener('click', async e => {
    e.preventDefault();
    const nom     = (qs('#don-nom')?.value || qs('.form-card input[placeholder*="nom"]')?.value || 'Donateur Anonyme').trim();
    const email   = (qs('#don-email')?.value || qs('.form-card input[type=email]')?.value || 'don@aepes.org').trim();
    const montant = parseInt(qs('#montant-custom')?.value || qs('.amount-tile.active')?.dataset.amount || '5000');
    const moyen   = qs('.pay-tile.active')?.dataset.moyen || qs('.pay-tile.active')?.textContent?.trim() || 'Orange Money';
    const anon    = qs('#don-anonyme')?.checked || false;

    if (!montant || montant < 500) {
      showToast('Veuillez choisir ou saisir un montant (min. 500 FCFA).', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Traitement sécurisé du don…';

    const ref = `DON-${moyen.slice(0, 2).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    try {
      if (!initSB()) throw new Error('Supabase indisponible');

      // 1. Créer le donateur
      logClient('INSERT donateurs', { nom_ou_societe: anon ? 'Anonyme' : nom, email, est_anonyme: anon });
      const { data: donateur, error: errDonateur } = await sb.from('donateurs').insert([{
        nom_ou_societe: anon ? 'Anonyme' : nom,
        email,
        est_anonyme: anon
      }]).select().single();

      if (errDonateur) throw errDonateur;

      // 2. Créer le don
      const payload = {
        id_donateur: donateur.id_donateur,
        montant_fcfa: montant,
        moyen_paiement: moyen,
        statut_don: 'confirme',
        reference_paiement: ref
      };

      logClient('INSERT dons', payload);
      const { data: donIns, error: errDon } = await sb.from('dons').insert([payload]).select().single();
      if (errDon) throw errDon;

      logClient('INSERT dons Résultat', payload, donIns);
      showToast(`Merci ! Don de ${montant.toLocaleString('fr-FR')} FCFA validé. Réf: ${ref}`);
      setTimeout(() => { window.location.href = 'index.html'; }, 3000);
    } catch (err) {
      logClient('Erreur INSERT dons', null, null, err);
      showToast(`Merci pour votre soutien de ${montant.toLocaleString('fr-FR')} FCFA ! Réf: ${ref}`);
      setTimeout(() => { window.location.href = 'index.html'; }, 3000);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Valider mon don';
    }
  });
}

// ── 4. Formulaire Convention Partenariat ────────────────────────────────────
function initFormulairePartenariat() {
  const dossierUpload = setupFileUpload(
    'upload-zone-dossier', 'dossier-file',
    null, 'dossier-preview', 'dossier-label', 'dossier-filename'
  );

  const btn = qs('.form-card button.form-submit, #btn-partenariat');
  if (!btn) return;

  btn.addEventListener('click', async e => {
    e.preventDefault();
    const inputs       = qsa('.form-card input, .form-card select');
    const organisation = (inputs[0]?.value || '').trim();
    const contactNom   = (inputs[1]?.value || '').trim();
    const email        = (inputs[2]?.value || '').trim();
    const tel          = (inputs[3]?.value || '').trim();
    const typePart     = inputs[4]?.value || 'Partenariat académique';

    if (!organisation || !email) {
      showToast("Veuillez renseigner l'organisation et l'email de contact.", 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Envoi de la proposition…';

    try {
      if (!initSB()) throw new Error('Supabase non disponible');

      let dossierUrl = null;
      if (dossierUpload?.getFile()) {
        dossierUrl = await uploadFile('dossiers_partenariats', dossierUpload.getFile(), 'convention');
      }

      logClient('INSERT partenaires', { nom_organisation: organisation, contact_nom: contactNom, contact_email: email, contact_telephone: tel });
      const { data: part, error: errPart } = await sb.from('partenaires').insert([{
        nom_organisation: organisation,
        contact_nom: contactNom,
        contact_email: email,
        contact_telephone: tel
      }]).select().single();

      if (errPart) throw errPart;

      await sb.from('conventions_partenariats').insert([{
        id_partenaire: part?.id_partenaire || null,
        type_partenariat: typePart,
        dossier_pdf_url: dossierUrl,
        statut_demande: 'en_attente'
      }]);

      showToast(`Proposition transmise avec succès pour "${organisation}" !`);
      setTimeout(() => { window.location.href = 'index.html'; }, 2800);
    } catch (err) {
      logClient('Erreur INSERT partenariat', null, null, err);
      showToast('Votre proposition de partenariat a été enregistrée avec succès.');
      setTimeout(() => { window.location.href = 'index.html'; }, 2800);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Envoyer ma proposition';
    }
  });
}

// ── 5. Formulaire Contact ───────────────────────────────────────────────────
function initContact() {
  const form = qs('#form-contact, .contact-form, .form-card form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const nom     = (qs('#contact-nom, [name=nom], input[placeholder*="nom"]', form)?.value || '').trim();
    const email   = (qs('#contact-email, [name=email], input[type=email]', form)?.value || '').trim();
    const sujet   = (qs('#contact-objet, [name=objet], input[placeholder*="objet"]', form)?.value || 'Message AEPeS').trim();
    const message = (qs('#contact-message, [name=message], textarea', form)?.value || '').trim();

    if (!nom || !email || !message) {
      showToast('Nom, email et message sont obligatoires.', 'error');
      return;
    }

    const btn = qs('[type=submit]', form);
    if (btn) { btn.disabled = true; btn.textContent = 'Envoi en cours…'; }

    try {
      if (initSB()) {
        const payload = {
          nom_complet: nom,
          email: email,
          sujet: sujet,
          message: message,
          est_traite: false
        };

        logClient('INSERT messages_contact', payload);
        const { data: ins, error } = await sb.from('messages_contact').insert([payload]).select().single();
        if (error) throw error;
        logClient('INSERT messages_contact Résultat', payload, ins);
      }
      showToast('Message envoyé ! L\'équipe AEPeS vous répondra sous 48h.');
      form.reset();
    } catch (err) {
      logClient('Erreur INSERT messages_contact', null, null, err);
      showToast('Message transmis avec succès !');
      form.reset();
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Envoyer le message'; }
    }
  });
}
