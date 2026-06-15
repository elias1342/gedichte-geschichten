/* ── Utilities ───────────────────────────────────────────────── */

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ── Content loading ─────────────────────────────────────────── */

async function loadContent() {
  try {
    const res = await fetch('/content.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    console.error('Inhalt konnte nicht geladen werden:', e);
    return { gedichte: [], kurzgeschichten: [] };
  }
}

/* ── Modal ───────────────────────────────────────────────────── */

let _modal = null;

function getModal() {
  if (_modal) return _modal;

  const overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-close" aria-label="Schließen">&times;</button>
      <div class="modal-label"></div>
      <h2 class="modal-title"></h2>
      <time class="modal-date"></time>
      <div class="modal-text"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  _modal = overlay;
  return overlay;
}

function openModal(item, type) {
  const overlay = getModal();
  overlay.querySelector('.modal-label').textContent =
    type === 'gedicht' ? 'Gedicht' : 'Kurzgeschichte';
  overlay.querySelector('.modal-title').textContent = item.title;

  const time = overlay.querySelector('.modal-date');
  time.textContent = formatDate(item.date);
  time.setAttribute('datetime', item.date);

  const textEl = overlay.querySelector('.modal-text');
  textEl.className = 'modal-text ' + (type === 'gedicht' ? 'modal-text--poem' : 'modal-text--prose');
  textEl.textContent = item.text;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  overlay.querySelector('.modal-close').focus();
}

function closeModal() {
  if (_modal) {
    _modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/* ── Card factory ────────────────────────────────────────────── */

function createCard(item, type) {
  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', item.title + ' lesen');

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-label">${type === 'gedicht' ? 'Gedicht' : 'Kurzgeschichte'}</div>
      <h3 class="card-title">${esc(item.title)}</h3>
      <time class="card-date" datetime="${item.date}">${formatDate(item.date)}</time>
      <p class="card-snippet">${esc(item.snippet)}</p>
      <span class="btn-read" aria-hidden="true">Weiterlesen</span>
    </div>
  `;

  const open = () => openModal(item, type);
  card.addEventListener('click', open);
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });

  return card;
}

/* ── Render helpers ──────────────────────────────────────────── */

function renderGrid(gridId, items, type) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  grid.innerHTML = '';

  if (!items || items.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-msg';
    p.textContent = 'Noch keine Einträge vorhanden.';
    grid.appendChild(p);
    return;
  }

  const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
  sorted.forEach(item => grid.appendChild(createCard(item, type)));
}

/* ── Page init ───────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;
  if (!page || page === 'admin') return;

  const content = await loadContent();

  if (page === 'home') {
    renderGrid('gedichte-grid', content.gedichte, 'gedicht');
    renderGrid('kurzgeschichten-grid', content.kurzgeschichten, 'kurzgeschichte');
  } else if (page === 'gedichte') {
    renderGrid('gedichte-grid', content.gedichte, 'gedicht');
  } else if (page === 'kurzgeschichten') {
    renderGrid('kurzgeschichten-grid', content.kurzgeschichten, 'kurzgeschichte');
  }

  /* mark active nav link */
  document.querySelectorAll('.site-nav a').forEach(a => {
    if (a.getAttribute('href') === window.location.pathname ||
        (window.location.pathname === '/' && a.getAttribute('href') === '/')) {
      a.setAttribute('aria-current', 'page');
    }
  });
});
