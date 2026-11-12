/* =====================================================================
   RedOrHen: area admin, scheda Visite (tabella page_views su Supabase)
   ===================================================================== */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let sb = null;
  let loaded = false;

  const origin = (r) => {
    if (r.medium) return `${r.source || 'altro'} · ${r.medium}`;
    if (r.source) return r.source;
    if (r.referrer) return r.referrer;
    return 'diretto o sconosciuto';
  };

  const count = (rows, fn) => {
    const m = new Map();
    rows.forEach((r) => { const k = fn(r); m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const table = (title, entries, head) => `
    <div class="v-card">
      <h2 class="v-h">${esc(title)}</h2>
      ${entries.length ? `<table class="v-table"><thead><tr><th>${esc(head)}</th><th>N.</th></tr></thead><tbody>${
        entries.slice(0, 12).map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}</td></tr>`).join('')}</tbody></table>`
        : '<p class="muted">Ancora niente.</p>'}
    </div>`;

  async function load() {
    const body = $('#v-body');
    if (!sb) { body.innerHTML = '<p class="muted">Le visite si leggono solo con il login Supabase.</p>'; return; }
    const days = +$('#v-days').value || 28;
    const since = new Date(Date.now() - days * 864e5).toISOString();
    body.innerHTML = '<p class="muted">Caricamento...</p>';
    const { data, error } = await sb.from('page_views').select('created_at,page,kind,label,source,medium,campaign,referrer')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(5000);
    if (error) { body.innerHTML = `<p class="muted">Errore: ${esc(error.message)}</p>`; return; }
    loaded = true;
    const views = data.filter((r) => r.kind === 'view');
    const events = data.filter((r) => r.kind !== 'view');
    const fromIg = views.filter((r) => r.source === 'instagram');
    const landing = views.filter((r) => r.page === 'listino.html' && r.source === 'instagram');
    body.innerHTML = `
      <div class="v-kpis">
        <div class="v-kpi"><b>${views.length}</b><span>visite</span></div>
        <div class="v-kpi"><b>${fromIg.length}</b><span>da Instagram</span></div>
        <div class="v-kpi"><b>${landing.length}</b><span>atterrate sul listino da Instagram</span></div>
        <div class="v-kpi"><b>${events.filter((r) => r.label === 'prenota').length}</b><span>clic su Prenota</span></div>
        <div class="v-kpi"><b>${events.filter((r) => r.kind === 'submit').length}</b><span>moduli inviati</span></div>
      </div>
      <div class="v-grid">
        ${table('Da dove arrivano', count(views, origin), 'Origine')}
        ${table('Pagine viste', count(views, (r) => r.page), 'Pagina')}
        ${table('Azioni', count(events, (r) => r.label || r.kind), 'Azione')}
        ${table('Per giorno', count(views, (r) => r.created_at.slice(0, 10)).sort((a, b) => b[0].localeCompare(a[0])), 'Giorno')}
      </div>
      <p class="muted v-note">Non si salvano IP né cookie. Le visite fatte in locale non contano. Il conteggio parte dal giorno in cui il link in bio cambia.</p>`;
  }

  // I link da usare: si vedono sempre, anche prima del login Supabase
  const LINKS = [['ig', 'Link in bio'], ['storia', 'Sticker link nelle storie'], ['post', 'Link da citare nei post']];
  function showLinks() {
    const base = new URL('.', location.href).href;
    $('#v-links').innerHTML = `<h2 class="v-h">I tuoi link da usare</h2><table class="v-table"><tbody>${
      LINKS.map(([p, t]) => `<tr><td>${esc(t)}<br><code>${esc(base + p)}</code></td><td><button class="btn-sm" type="button" data-copy="${esc(base + p)}">Copia</button></td></tr>`).join('')}</tbody></table>`;
  }
  showLinks();
  $('#v-links').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copiato'; } catch (err) { b.textContent = 'Copia a mano'; }
    setTimeout(() => { b.textContent = 'Copia'; }, 1500);
  });

  window.addEventListener('ro-admin-ready', (e) => { sb = e.detail?.sb || null; loaded = false; });
  if (window.RO_ADMIN) sb = window.RO_ADMIN.sb;
  window.addEventListener('ro-admin-tab', (e) => { if (e.detail === 'visits') load(); });
  $('#v-days').addEventListener('change', load);
  window.addEventListener('ro-admin-logout', () => { sb = null; loaded = false; $('#v-body').innerHTML = ''; });
})();
