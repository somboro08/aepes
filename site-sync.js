/**
 * AEPeS — Synchronisation des paramètres publics du site.
 * Les valeurs sont administrées dans public.parametres_site.
 */
(function () {
  const SUPABASE_URL = 'https://essfawtyyvhozmdotyqh.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzc2Zhd3R5eXZob3ptZG90eXFoIiwiaWF0IjoxNzg5MjQwNzg3LCJleHAiOjIxMDQ4MTY3ODd9.xO3vhDCDkfuRIFnVbKG1Xl8-bg1F8rNQLFgIuWYvp3Q';

  const safeUrl = value => {
    try {
      const url = new URL(String(value || ''), window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };

  const shortSiteName = value => String(value || '').split('—')[0].trim() || String(value || 'AEPeS');

  const replaceBrandText = (element, value) => {
    if (!element || !value) return;
    const image = element.querySelector('img');
    element.textContent = '';
    if (image) element.appendChild(image);
    element.appendChild(document.createTextNode(` ${shortSiteName(value)}`));
  };

  const applySettings = settings => {
    if (!settings) return;
    const s = settings;

    // API générique pour les futurs champs CMS.
    document.querySelectorAll('[data-site-setting]').forEach(element => {
      const value = s[element.dataset.siteSetting];
      if (value === undefined || value === null) return;
      if (element.matches('img')) element.src = safeUrl(value) || element.src;
      else element.textContent = String(value);
    });

    // Accueil : hero, statistiques et mot du président.
    const heroTitle = document.querySelector('.hero h1');
    if (heroTitle && s.site_slogan) heroTitle.textContent = s.site_slogan;
    const heroDescription = document.querySelector('.hero p');
    if (heroDescription && s.site_description) heroDescription.textContent = s.site_description;

    const statValues = document.querySelectorAll('.stats-grid .stat-num');
    [s.stat_membres, s.stat_projets, s.stat_universites, s.stat_annees].forEach((value, index) => {
      if (value !== undefined && statValues[index]) statValues[index].textContent = value;
    });

    const presidentQuote = document.querySelector('.president blockquote');
    if (presidentQuote && s.president_citation) presidentQuote.textContent = s.president_citation;
    const presidentName = document.querySelector('.president cite');
    if (presidentName && s.president_nom) presidentName.textContent = s.president_nom;

    const heroImage = safeUrl(s.hero_image_url);
    const heroVisual = document.querySelector('.hero-visual');
    if (heroVisual && heroImage) {
      heroVisual.style.backgroundImage = `linear-gradient(rgba(15,42,82,.2), rgba(15,42,82,.6)), url("${heroImage}")`;
      heroVisual.style.backgroundSize = 'cover';
      heroVisual.style.backgroundPosition = 'center';
    }

    const presidentImage = safeUrl(s.president_photo_url);
    const presidentPhoto = document.querySelector('.president-photo');
    if (presidentPhoto && presidentImage) {
      presidentPhoto.style.backgroundImage = `url("${presidentImage}")`;
      presidentPhoto.style.backgroundSize = 'cover';
      presidentPhoto.style.backgroundPosition = 'top center';
    }

    // Nom de l'association dans la navigation et les pieds de page.
    if (s.site_nom) {
      document.querySelectorAll('.logo').forEach(element => replaceBrandText(element, s.site_nom));
      document.querySelectorAll('.footer-logo').forEach(element => replaceBrandText(element, s.site_nom));
      if (document.title.includes('AEPeS') || document.title.includes('Association')) {
        document.title = shortSiteName(s.site_nom);
      }
    }

    // Footer commun à toutes les pages : les coordonnées étaient auparavant
    // des textes HTML statiques, donc les liens mailto/tel ne suffisaient pas.
    document.querySelectorAll('footer').forEach(footer => {
      const logo = footer.querySelector('.footer-logo');
      const intro = logo?.parentElement?.querySelector('p');
      if (intro && s.site_description) intro.textContent = s.site_description;

      const contactHeading = [...footer.querySelectorAll('h4')]
        .find(element => element.textContent.trim().toLowerCase() === 'contact');
      const contactList = contactHeading?.parentElement?.querySelector('ul');
      const items = contactList ? [...contactList.children] : [];
      if (items[1] && s.contact_email) {
        items[1].textContent = s.contact_email;
        items[1].style.cursor = 'pointer';
        items[1].onclick = () => { window.location.href = `mailto:${s.contact_email}`; };
      }
      if (items[2] && s.contact_telephone) {
        items[2].textContent = s.contact_telephone;
        items[2].style.cursor = 'pointer';
        items[2].onclick = () => { window.location.href = `tel:${s.contact_telephone}`; };
      }
      if (items[3] && s.contact_adresse) items[3].textContent = s.contact_adresse;
    });

    // Bloc de coordonnées spécifique à contact.html.
    document.querySelectorAll('.contact-info-item').forEach(item => {
      const heading = item.querySelector('h4')?.textContent.toLowerCase() || '';
      const value = heading.includes('email') ? s.contact_email
        : (heading.includes('téléphone') || heading.includes('telephone')) ? s.contact_telephone
          : (heading.includes('siège') || heading.includes('siege')) ? s.contact_adresse : null;
      const paragraph = item.querySelector('p');
      if (value && paragraph) paragraph.textContent = value;
    });

    const mapPlaceholder = document.querySelector('.map-placeholder');
    if (mapPlaceholder && s.contact_adresse) {
      const icon = mapPlaceholder.querySelector('svg');
      mapPlaceholder.textContent = '';
      if (icon) mapPlaceholder.appendChild(icon);
      mapPlaceholder.appendChild(document.createTextNode(` ${s.contact_adresse}`));
    }
  };

  const fetchSettings = () => {
    const client = window.supabaseClient ||
      (window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null);
    if (!client) return false;

    client.from('parametres_site').select('cle, valeur').then(({ data, error }) => {
      if (error || !data?.length) return;
      const settings = {};
      data.forEach(row => { settings[row.cle] = row.valeur; });
      localStorage.setItem('aepes_site_settings', JSON.stringify(settings));
      applySettings(settings);
    }).catch(error => console.warn('[AEPeS] Paramètres publics indisponibles', error));
    return true;
  };

  try {
    const cached = localStorage.getItem('aepes_site_settings');
    if (cached) applySettings(JSON.parse(cached));
  } catch {
    // Le cache peut être désactivé par le navigateur ou corrompu.
  }

  const start = () => {
    if (!fetchSettings()) setTimeout(fetchSettings, 1200);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
