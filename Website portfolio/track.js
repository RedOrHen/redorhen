/* =====================================================================
   RedOrHen: contatore visite senza cookie e senza dati personali.
   Registra su Supabase (tabella page_views) pagina, origine (utm_*),
   sito di provenienza e pochi clic importanti. Niente IP, niente
   identificativi. Una visita per pagina e per scheda del browser.
   ===================================================================== */
(() => {
  'use strict';
  const cfg = window.ADMIN_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '') return; // niente prove in locale

  const cut = (v, n) => (v ? String(v).slice(0, n) : null);
  const params = new URLSearchParams(location.search);
  const page = cut(location.pathname.split('/').pop() || 'index.html', 80);
  let ref = null;
  try { ref = document.referrer ? new URL(document.referrer).hostname : null; } catch (e) { /* ignora */ }
  if (ref === host) ref = null;

  const source = cut(params.get('utm_source'), 40);
  const medium = cut(params.get('utm_medium'), 40);
  const campaign = cut(params.get('utm_campaign'), 60);

  const send = (row) => {
    try {
      fetch(`${cfg.supabaseUrl}/rest/v1/page_views`, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: cfg.supabaseAnonKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(row)
      }).catch(() => {});
    } catch (e) { /* il sito funziona anche senza contatore */ }
  };

  // visita: una sola per pagina e per scheda, anche se si ricarica
  let seen = false;
  const key = `ro-v:${page}`;
  try { seen = sessionStorage.getItem(key) === '1'; sessionStorage.setItem(key, '1'); } catch (e) { /* ignora */ }
  if (!seen) {
    // l'origine arriva con il primo clic e va ricordata nella scheda
    let s = source, m = medium, c = campaign;
    try {
      if (s || m || c) sessionStorage.setItem('ro-utm', JSON.stringify({ s, m, c }));
      else { const o = JSON.parse(sessionStorage.getItem('ro-utm') || 'null'); if (o) { s = o.s; m = o.m; c = o.c; } }
    } catch (e) { /* ignora */ }
    send({ page, kind: 'view', source: s, medium: m, campaign: c, referrer: ref });
  }

  const stored = () => { try { return JSON.parse(sessionStorage.getItem('ro-utm') || 'null') || {}; } catch (e) { return {}; } };
  const event = (kind, label) => { const o = stored(); send({ page, kind, label: cut(label, 60), source: o.s || null, medium: o.m || null, campaign: o.c || null }); };

  // clic su "Prenota", sulla liberatoria e invio del modulo contatti
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (/contatti\.html/.test(href) && /prenota/i.test(a.textContent)) event('click', 'prenota');
    else if (/liberatoria/.test(href)) event('click', 'liberatoria');
  });
  const form = document.querySelector('form');
  if (form && page === 'contatti.html') form.addEventListener('submit', () => event('submit', 'modulo contatti'));
})();
