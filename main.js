/**
 * AEPeS — Moteur Frontend Global, Routage & Expérience Tactile Mobile (Native App UI)
 */

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const page = path.split('/').pop().replace('.html', '') || 'index';
  const isAdmin = page.includes('admin');

  // ── 1. INJECTION DE LA BOTTOM NAVIGATION BAR (Application Mobile) ────────────
  if (!isAdmin && !document.querySelector('.mobile-bottom-bar')) {
    const bottomNav = document.createElement('nav');
    bottomNav.className = 'mobile-bottom-bar';
    bottomNav.setAttribute('aria-label', 'Navigation Mobile');
    bottomNav.innerHTML = `
      <a href="index.html" class="mobile-nav-item ${page === 'index' ? 'active' : ''}">
        <svg class="icon" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Accueil</span>
      </a>
      <a href="activites.html" class="mobile-nav-item ${page === 'activites' ? 'active' : ''}">
        <svg class="icon" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        <span>Activités</span>
      </a>
      <a href="evenements.html" class="mobile-nav-item ${page === 'evenements' || page === 'inscription-evenement' ? 'active' : ''}">
        <svg class="icon" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
        <span>Événements</span>
      </a>
      <a href="adhesion.html" class="mobile-nav-item ${page === 'adhesion' ? 'active' : ''}">
        <svg class="icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
        <span>Adhésion</span>
      </a>
      <a href="connexion.html" class="mobile-nav-item ${page === 'connexion' || page === 'profil-membre' ? 'active' : ''}">
        <svg class="icon" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Membres</span>
      </a>
    `;
    document.body.appendChild(bottomNav);
  }

  // ── 2. MENU MOBILE TOGGLE AVEC ICON VECTORIEL ──────────────────────────────
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const navCta = document.querySelector('.nav-cta');

  if (menuToggle && navLinks) {
    const iconMenu = `<svg class="icon" viewBox="0 0 24 24"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`;
    const iconClose = `<svg class="icon" viewBox="0 0 24 24"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>`;
    
    menuToggle.innerHTML = iconMenu;

    menuToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('mobile-active');
      if (navCta) navCta.classList.toggle('mobile-active');
      menuToggle.innerHTML = isOpen ? iconClose : iconMenu;
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Fermer au clic sur un lien interne
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('mobile-active');
        if (navCta) navCta.classList.remove('mobile-active');
        menuToggle.innerHTML = iconMenu;
        document.body.style.overflow = '';
      });
    });
  }

  // ── 3. GESTION DES ONGLETS (TABS FILTER) ────────────────────────────────────
  const tabs = document.querySelectorAll('.tab');
  if (tabs.length > 0) {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  }

  // ── 4. TUILES DE DONS & MONTANTS ───────────────────────────────────────────
  const amountTiles = document.querySelectorAll('.amount-tile');
  const customAmountInput = document.getElementById('montant-custom');
  if (amountTiles.length > 0) {
    amountTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        amountTiles.forEach(t => t.classList.remove('active'));
        tile.classList.add('active');
        if (customAmountInput) {
          customAmountInput.value = tile.dataset.amount || tile.textContent.replace(/[^0-9]/g, '');
        }
      });
    });

    if (customAmountInput) {
      customAmountInput.addEventListener('input', () => {
        const val = customAmountInput.value.replace(/[^0-9]/g, '');
        amountTiles.forEach(t => {
          const amt = t.dataset.amount || t.textContent.replace(/[^0-9]/g, '');
          if (amt === val && val !== '') {
            t.classList.add('active');
          } else {
            t.classList.remove('active');
          }
        });
      });
    }
  }

  const payTiles = document.querySelectorAll('.pay-tile');
  if (payTiles.length > 0) {
    payTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        payTiles.forEach(t => t.classList.remove('active'));
        tile.classList.add('active');
      });
    });
  }

});
