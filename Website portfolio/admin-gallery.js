/* =====================================================================
   RedOrHen — Area admin: gestione dei set della pagina Lavori
   Supabase (tabella gallery_sets + storage "gallery") oppure modalità
   demo nel localStorage. Si attiva dopo il login (evento ro-admin-ready).
   ===================================================================== */
(() => {
  'use strict';

  const CFG = window.ADMIN_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  }));
  const MAX_SIDE = 2400;     // lato lungo delle foto caricate su Supabase
  const DEMO_SIDE = 1200;    // in demo le foto stanno nel browser: più piccole
  const DEMO_KEY = 'ro-gallery-demo';

  let toast = (m) => console.log(m);
  let store = null;
  let sets = [];
  let loaded = false;

  /* ---------- Immagini ---------- */
  async function resizeImage(source, max) {
    let bmp;
    try {
      bmp = await createImageBitmap(source, { imageOrientation: 'from-image' });
    } catch (e) {
      bmp = await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = URL.createObjectURL(source);
      });
    }
    const w0 = bmp.width, h0 = bmp.height;
    const s = Math.min(1, max / Math.max(w0, h0));
    const w = Math.round(w0 * s), h = Math.round(h0 * s);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    return { canvas: c, w, h };
  }
  const toBlob = (canvas, q = 0.86) => new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));

  const publicUrl = (p) => p.src || `${CFG.supabaseUrl}/storage/v1/object/public/gallery/${String(p.path).split('/').map(encodeURIComponent).join('/')}`;

  /* ---------- Storage ---------- */
  const cleanRow = (s) => ({
    id: s.id, character: s.character, series: s.series || null, category: s.category || null,
    cosplayer: s.cosplayer || null, featured: !!s.featured, published: s.published !== false,
    position: s.position || 0, photos: s.photos.map((p) => (p.path ? { path: p.path, w: p.w, h: p.h, alt: p.alt || null } : p))
  });

  const RemoteStore = (sb) => ({
    async list() {
      const { data, error } = await sb.from('gallery_sets').select('*')
        .order('position', { ascending: true }).order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    async save(s) {
      const { data, error } = await sb.from('gallery_sets').upsert(cleanRow(s)).select().single();
      if (error) throw error;
      return data;
    },
    async setPosition(id, position) {
      const { error } = await sb.from('gallery_sets').update({ position }).eq('id', id);
      if (error) throw error;
    },
    async remove(s) {
      const { error } = await sb.from('gallery_sets').delete().eq('id', s.id);
      if (error) throw error;
      await this.removeFiles(s.photos);
    },
    async upload(setId, file) {
      const { canvas, w, h } = await resizeImage(file, MAX_SIDE);
      const blob = await toBlob(canvas);
      const path = `${setId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await sb.storage.from('gallery').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (error) throw error;
      return { path, w, h };
    },
    async removeFiles(photos) {
      const paths = photos.filter((p) => p.path).map((p) => p.path);
      if (paths.length) await sb.storage.from('gallery').remove(paths);
    }
  });

  const LocalStore = {
    read() { try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || []; } catch (e) { return []; } },
    write(rows) {
      try { localStorage.setItem(DEMO_KEY, JSON.stringify(rows)); }
      catch (e) { throw new Error('Spazio della modalità demo esaurito: elimina qualche foto o attiva Supabase'); }
    },
    async list() { return this.read().sort((a, b) => a.position - b.position); },
    async save(s) {
      const rows = this.read();
      const row = cleanRow(s);
      const i = rows.findIndex((r) => r.id === row.id);
      if (i >= 0) rows[i] = row; else rows.push(row);
      this.write(rows);
      return row;
    },
    async setPosition(id, position) {
      const rows = this.read();
      const r = rows.find((x) => x.id === id);
      if (r) { r.position = position; this.write(rows); }
    },
    async remove(s) { this.write(this.read().filter((r) => r.id !== s.id)); },
    async upload(setId, file) {
      const { canvas, w, h } = await resizeImage(file, DEMO_SIDE);
      return { src: canvas.toDataURL('image/jpeg', 0.78), w, h };
    },
    async removeFiles() {}
  };

  const errText = (e) => {
    const m = (e && e.message) || '';
    if (/esaurito/.test(m)) return m;
    if (/fetch|network/i.test(m)) return 'Connessione assente: riprova';
    if (/row-level|policy|JWT|auth/i.test(m)) return 'Permesso negato: accedi di nuovo';
    if (/mime|size|too large/i.test(m)) return 'File non valido o troppo grande';
    return 'Operazione non riuscita';
  };

  /* ---------- Elenco ---------- */
  const list = $('#g-list');

  async function load() {
    list.classList.add('loading');
    try {
      sets = (await store.list()).map((r) => ({ ...r, photos: r.photos || [] }));
      loaded = true;
    } catch (e) {
      console.warn(e);
      toast(errText(e), true);
    } finally { list.classList.remove('loading'); }
    render();
  }

  function render() {
    const cats = [...new Set(sets.map((s) => s.category).filter(Boolean))];
    $('#g-cats').innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join('');
    if (!sets.length) {
      list.innerHTML = `<div class="g-empty side-box">
        <h2>Nessun set</h2>
        <p class="agenda-empty">La pagina Lavori sta mostrando i lavori di works.js. Crea il tuo primo set con <b>+ Nuovo set</b>, oppure importa quelli esistenti con <b>Importa da works.js</b>.</p>
      </div>`;
      return;
    }
    list.innerHTML = sets.map((s, i) => {
      const cover = s.photos[0];
      const flags = [s.featured && '★ Home', s.published === false && 'Bozza'].filter(Boolean);
      return `<article class="g-card${s.published === false ? ' is-draft' : ''}" data-id="${esc(s.id)}">
        <button class="g-cover" type="button" data-act="edit" aria-label="Modifica ${esc(s.character)}">
          ${cover ? `<img src="${esc(publicUrl(cover))}" alt="" loading="lazy" decoding="async">` : '<span class="g-nophoto pixel">Nessuna foto</span>'}
          <span class="g-badge pixel">${s.photos.length} foto</span>
          ${flags.length ? `<span class="g-flags pixel">${flags.map(esc).join(' · ')}</span>` : ''}
        </button>
        <div class="g-info">
          <b>${esc(s.character)}</b>
          <span>${esc([s.series, s.category].filter(Boolean).join(' · ') || '—')}</span>
        </div>
        <div class="g-actions">
          <button class="btn-sm icon" type="button" data-act="up" aria-label="Sposta prima" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="btn-sm icon" type="button" data-act="down" aria-label="Sposta dopo" ${i === sets.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="btn-sm" type="button" data-act="edit">Modifica</button>
          <button class="btn-sm btn-danger" type="button" data-act="del" aria-label="Elimina ${esc(s.character)}">✕</button>
        </div>
      </article>`;
    }).join('');
  }

  async function move(id, dir) {
    const i = sets.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sets.length) return;
    [sets[i], sets[j]] = [sets[j], sets[i]];
    const changed = [];
    sets.forEach((s, k) => { if (s.position !== k) { s.position = k; changed.push(s); } });
    render();
    try {
      await Promise.all(changed.map((s) => store.setPosition(s.id, s.position)));
      toast('Ordine aggiornato');
    } catch (e) { toast(errText(e), true); load(); }
  }

  async function removeSet(s) {
    if (!confirm(`Eliminare il set "${s.character}" e le sue ${s.photos.length} foto? L'operazione non si può annullare.`)) return false;
    try {
      await store.remove(s);
      sets = sets.filter((x) => x.id !== s.id);
      render();
      toast('Set eliminato');
      return true;
    } catch (e) { toast(errText(e), true); return false; }
  }

  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    const card = e.target.closest('.g-card');
    if (!b || !card) return;
    const s = sets.find((x) => x.id === card.dataset.id);
    if (!s) return;
    if (b.dataset.act === 'edit') openEditor(s);
    if (b.dataset.act === 'up') move(s.id, -1);
    if (b.dataset.act === 'down') move(s.id, 1);
    if (b.dataset.act === 'del') removeSet(s);
  });

  /* ---------- Editor ---------- */
  const dlg = $('#g-dialog');
  const form = $('#g-form');
  const F = form.elements;
  const photosEl = $('#g-photos');
  const progress = $('.g-progress', form);
  let draft = null;        // set in modifica
  let uploaded = [];       // foto caricate in questa sessione dell'editor
  let removed = [];        // foto esistenti tolte (da cancellare al salvataggio)
  let busy = 0;

  function openEditor(s) {
    const isNew = !s;
    draft = isNew
      ? { id: uuid(), character: '', series: '', category: '', cosplayer: '', featured: false, published: true, photos: [], _new: true }
      : { ...s, photos: [...s.photos] };
    uploaded = []; removed = [];
    $('#g-title').textContent = isNew ? 'Nuovo set' : 'Modifica set';
    F.character.value = draft.character || '';
    F.series.value = draft.series || '';
    F.category.value = draft.category || '';
    F.cosplayer.value = draft.cosplayer || '';
    F.published.checked = draft.published !== false;
    F.featured.checked = !!draft.featured;
    $('#g-delete').hidden = isNew;
    $('.ev-error', form).textContent = '';
    progress.textContent = '';
    renderPhotos();
    dlg.showModal();
    setTimeout(() => F.character.focus(), 30);
  }

  function renderPhotos() {
    $('.g-count', form).textContent = draft.photos.length ? `(${draft.photos.length})` : '';
    photosEl.innerHTML = draft.photos.map((p, i) => `
      <figure class="g-photo" data-i="${i}">
        <img src="${esc(publicUrl(p))}" alt="" decoding="async">
        ${i === 0 ? '<span class="g-cover-tag pixel">Copertina</span>' : ''}
        <figcaption>
          <button type="button" data-p="left" aria-label="Sposta prima" ${i === 0 ? 'disabled' : ''}>◀</button>
          ${i > 0 ? '<button type="button" data-p="cover" aria-label="Usa come copertina">★</button>' : ''}
          <button type="button" data-p="right" aria-label="Sposta dopo" ${i === draft.photos.length - 1 ? 'disabled' : ''}>▶</button>
          <button type="button" data-p="del" aria-label="Togli foto">✕</button>
        </figcaption>
      </figure>`).join('');
  }

  photosEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    const i = +b.closest('.g-photo').dataset.i;
    const ph = draft.photos;
    if (b.dataset.p === 'left' && i > 0) [ph[i - 1], ph[i]] = [ph[i], ph[i - 1]];
    if (b.dataset.p === 'right' && i < ph.length - 1) [ph[i + 1], ph[i]] = [ph[i], ph[i + 1]];
    if (b.dataset.p === 'cover') ph.unshift(ph.splice(i, 1)[0]);
    if (b.dataset.p === 'del') {
      const [p] = ph.splice(i, 1);
      if (uploaded.includes(p)) store.removeFiles([p]).catch(() => {});
      else removed.push(p);
    }
    renderPhotos();
  });

  async function addFiles(files) {
    const imgs = [...files].filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (!imgs.length) { toast('Scegli file JPG, PNG o WebP', true); return; }
    busy++;
    let done = 0, failed = 0;
    progress.textContent = `Caricamento 0 / ${imgs.length}…`;
    for (const f of imgs) {
      try {
        const p = await store.upload(draft.id, f);
        p.alt = '';
        draft.photos.push(p);
        uploaded.push(p);
        renderPhotos();
      } catch (e) {
        console.warn(e);
        failed++;
        if (/esaurito/.test(e.message)) { progress.textContent = e.message; break; }
      }
      done++;
      progress.textContent = `Caricamento ${done} / ${imgs.length}…`;
    }
    busy--;
    progress.textContent = failed ? `${done - failed} caricate, ${failed} non riuscite` : `${done} foto aggiunte ★`;
  }

  $('#g-files').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
  const drop = $('#g-drop');
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('is-over')));
  drop.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); });

  async function discard() {
    // Annulla: cancella le foto caricate e mai salvate
    if (uploaded.length) store.removeFiles(uploaded).catch(() => {});
    uploaded = []; removed = [];
    dlg.close();
  }
  $('#g-cancel').addEventListener('click', () => {
    if (busy) { toast('Attendi la fine del caricamento', true); return; }
    discard();
  });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (!busy) discard(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('.ev-error', form);
    if (busy) { err.textContent = 'Attendi la fine del caricamento delle foto'; return; }
    const character = F.character.value.trim();
    if (!character) { err.textContent = 'Indica il nome del personaggio'; F.character.focus(); return; }
    Object.assign(draft, {
      character, series: F.series.value.trim(), category: F.category.value.trim(),
      cosplayer: F.cosplayer.value.trim(), published: F.published.checked, featured: F.featured.checked
    });
    draft.photos.forEach((p, k) => { p.alt = p.alt || `${character}${draft.series ? ' — ' + draft.series : ''}, foto ${k + 1}`; });
    if (draft._new) draft.position = sets.length ? Math.min(...sets.map((s) => s.position || 0)) - 1 : 0;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const saved = await store.save(draft);
      if (removed.length) store.removeFiles(removed).catch(() => {});
      uploaded = []; removed = [];
      dlg.close();
      toast(draft._new ? 'Set creato ★' : 'Set salvato');
      await load();
      return saved;
    } catch (x) {
      console.warn(x);
      err.textContent = errText(x);
    } finally { btn.disabled = false; }
  });

  $('#g-delete').addEventListener('click', async () => {
    const s = sets.find((x) => x.id === draft?.id);
    if (!s) return;
    if (await removeSet(s)) { uploaded = []; dlg.close(); }
  });

  $('#g-new').addEventListener('click', () => openEditor(null));

  /* ---------- Importazione da works.js ---------- */
  $('#g-import').addEventListener('click', async () => {
    const src = (window.WORKS || []).filter((w) => Array.isArray(w.photos) ? w.photos.some((p) => p && p.src) : !!w.src);
    if (!src.length) { toast('In works.js non ci sono set con foto vere', true); return; }
    const existing = new Set(sets.map((s) => s.character.toLowerCase()));
    const todo = src.filter((w) => !existing.has(String(w.character).toLowerCase()));
    if (!todo.length) { toast('I set di works.js sono già stati importati'); return; }
    if (!confirm(`Importare ${todo.length} set da works.js (${todo.map((w) => w.character).join(', ')})?`)) return;
    const btn = $('#g-import');
    btn.disabled = true;
    let pos = sets.length ? Math.max(...sets.map((s) => s.position || 0)) + 1 : 0;
    try {
      for (const w of todo) {
        btn.textContent = `Importo ${w.character}…`;
        const id = uuid();
        const list = Array.isArray(w.photos) ? w.photos.filter((p) => p && p.src) : [{ src: w.src, alt: w.alt }];
        const photos = [];
        for (const p of list) {
          const blob = await (await fetch(p.src)).blob();
          const up = await store.upload(id, blob);
          up.alt = p.alt || '';
          photos.push(up);
        }
        await store.save({
          id, character: w.character, series: w.series, category: w.category, cosplayer: w.cosplayer,
          featured: !!w.featured, published: true, position: pos++, photos
        });
      }
      toast('Importazione completata ★');
    } catch (e) {
      console.warn(e);
      toast(errText(e), true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Importa da works.js';
      load();
    }
  });

  /* ---------- Schede e avvio ---------- */
  function showTab(tab) {
    $$('[data-tab]').forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    $('#tab-calendar').hidden = tab !== 'calendar';
    $('#tab-gallery').hidden = tab !== 'gallery';
    try { localStorage.setItem('ro-admin-tab', tab); } catch (e) { /* facoltativo */ }
    if (tab === 'gallery' && store && !loaded) load();
  }
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

  function init(detail) {
    const { sb, toast: t } = detail || {};
    if (t) toast = t;
    store = sb ? RemoteStore(sb) : LocalStore;
    $('#g-preview').href = sb ? 'lavori.html' : 'lavori.html?demo';
    loaded = false;
    let tab = 'calendar';
    try { tab = localStorage.getItem('ro-admin-tab') || 'calendar'; } catch (x) { /* facoltativo */ }
    showTab(tab);
  }
  window.addEventListener('ro-admin-ready', (e) => init(e.detail));
  if (window.RO_ADMIN) init(window.RO_ADMIN);
  window.addEventListener('ro-admin-logout', () => { sets = []; loaded = false; list.innerHTML = ''; });
})();
