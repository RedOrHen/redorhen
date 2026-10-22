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
  const MAX_BYTES = 20 * 1024 * 1024; // peso massimo di una foto originale
  const THUMB_SIDE = 1600;   // lato lungo dell'anteprima per griglia e miniature
  const DEMO_SIDE = 1200;    // in demo le foto stanno nel browser: più piccole
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const mb = (n) => `${(n / 1048576).toFixed(1).replace('.', ',')} MB`;
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
    return { canvas: c, w, h, w0, h0 };
  }
  const toBlob = (canvas, q = 0.86) => new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));

  // Foto oltre 20 MB: si ricomprime alla risoluzione piena con la qualità JPEG più alta
  // che sta sotto il limite (95% → 85%); solo se non basta si riducono un po' le dimensioni.
  async function fitUnderLimit(file) {
    const { canvas: full, w0, h0 } = await resizeImage(file, Infinity);
    for (let scale = 1; scale >= 0.5; scale = Math.round(scale * 0.9 * 1000) / 1000) {
      let src = full;
      if (scale < 1) {
        src = document.createElement('canvas');
        src.width = Math.round(w0 * scale);
        src.height = Math.round(h0 * scale);
        const ctx = src.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(full, 0, 0, src.width, src.height);
      }
      for (const q of [0.95, 0.93, 0.91, 0.89, 0.87, 0.85]) {
        const blob = await toBlob(src, q);
        if (blob && blob.size <= MAX_BYTES) return { blob, w: src.width, h: src.height, q, scale };
      }
    }
    throw new Error('Impossibile ridurre la foto sotto i 20 MB');
  }

  const fileUrl = (path) => `${CFG.supabaseUrl}/storage/v1/object/public/gallery/${String(path).split('/').map(encodeURIComponent).join('/')}`;
  // Nell'admin si mostra l'anteprima leggera (l'originale resta per il visualizzatore del sito)
  const publicUrl = (p) => p.src || fileUrl(p.thumb || p.path);

  /* ---------- Storage ---------- */
  const cleanRow = (s) => ({
    id: s.id, character: s.character, series: s.series || null, category: s.category || null,
    cosplayer: s.cosplayer || null, featured: !!s.featured, published: s.published !== false,
    position: s.position || 0, photos: s.photos.map((p) => (p.path ? { path: p.path, thumb: p.thumb || null, w: p.w, h: p.h, alt: p.alt || null, hero: p.hero || undefined, contact: p.contact || undefined } : p))
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
    // L'originale viene caricato così com'è (nessuna ricompressione: qualità intatta);
    // in più si genera un'anteprima leggera per griglia, miniature e pellicola della Home.
    async upload(setId, file, onStep) {
      const { canvas, w0, h0 } = await resizeImage(file, THUMB_SIDE);
      const thumbBlob = await toBlob(canvas, 0.85);
      let body = file, type = EXT[file.type] ? file.type : 'image/jpeg', w = w0, h = h0, reduced = null;
      if (file.size > MAX_BYTES) {
        onStep?.('riduco');
        const r = await fitUnderLimit(file);
        body = r.blob; type = 'image/jpeg'; w = r.w; h = r.h;
        reduced = { from: file.size, to: r.blob.size, q: r.q, scale: r.scale };
      }
      onStep?.('carico');
      const base = `${setId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const path = `${base}.${EXT[type]}`;
      const thumb = `${base}-anteprima.jpg`;
      const bucket = sb.storage.from('gallery');
      const up1 = await bucket.upload(path, body, { contentType: type, cacheControl: '31536000', upsert: false });
      if (up1.error) throw up1.error;
      const up2 = await bucket.upload(thumb, thumbBlob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (up2.error) { await bucket.remove([path]); throw up2.error; }
      return { path, thumb, w, h, reduced };
    },
    async removeFiles(photos) {
      const paths = photos.flatMap((p) => [p.path, p.thumb]).filter(Boolean);
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
    if (/esaurito|Impossibile ridurre/.test(m)) return m;
    if (/maximum allowed size|exceeded/i.test(m)) return 'Supabase rifiuta il file: il limite del contenitore "gallery" è più basso di 20 MB (vedi supabase/LEGGIMI.md)';
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
      const hero = s.photos.some((p) => p.hero), contact = s.photos.some((p) => p.contact);
      // Non pubblicato: non compare nei Lavori; se ha la foto Hero/Contatti quella si vede comunque
      const draft = s.published === false;
      const flags = draft
        ? [hero || contact ? 'Solo ' + [hero && 'Hero', contact && 'Contatti'].filter(Boolean).join(' e ') : 'Bozza']
        : [hero && 'Hero', contact && 'Contatti', s.featured && '★ Home'].filter(Boolean);
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
      : { ...s, photos: s.photos.map((p) => ({ ...p })) };
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
        <div class="g-flagbar">
          <button type="button" data-p="hero" aria-pressed="${!!p.hero}" title="Usa come immagine della Home">Hero</button>
          <button type="button" data-p="contact" aria-pressed="${!!p.contact}" title="Usa come immagine della pagina Contatti">Contatti</button>
        </div>
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
    if (b.dataset.p === 'hero' || b.dataset.p === 'contact') {
      // Una sola foto per impostazione: le altre del set la perdono, quelle degli altri set al salvataggio
      const flag = b.dataset.p;
      const on = !ph[i][flag];
      ph.forEach((p) => { delete p[flag]; });
      if (on) ph[i][flag] = true;
    }
    if (b.dataset.p === 'del') {
      const [p] = ph.splice(i, 1);
      if (uploaded.includes(p)) store.removeFiles([p]).catch(() => {});
      else removed.push(p);
    }
    renderPhotos();
  });

  async function addFiles(files) {
    const all = [...files].filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (!all.length) { toast('Scegli file JPG, PNG o WebP', true); return; }
    const imgs = all;
    busy++;
    let done = 0, failed = 0, lastErr = '';
    const notes = [];
    for (const f of imgs) {
      const label = `${done + 1} / ${imgs.length} — ${f.name} (${mb(f.size)})`;
      progress.textContent = `Caricamento ${label}…`;
      try {
        const p = await store.upload(draft.id, f, (step) => {
          progress.textContent = step === 'riduco' ? `Riduco sotto i 20 MB ${label}…` : `Caricamento ${label}…`;
        });
        if (p.reduced) {
          const r = p.reduced;
          notes.push(`${f.name}: ${mb(r.from)} → ${mb(r.to)} (qualità ${Math.round(r.q * 100)}%${r.scale < 1 ? `, dimensioni ${Math.round(r.scale * 100)}%` : ', risoluzione piena'})`);
        }
        delete p.reduced;
        p.alt = '';
        draft.photos.push(p);
        uploaded.push(p);
        renderPhotos();
      } catch (e) {
        console.warn(e);
        failed++;
        lastErr = errText(e);
        if (/esaurito/.test(e.message)) break;
      }
      done++;
    }
    busy--;
    progress.textContent = [
      failed ? `${done - failed} caricate, ${failed} non riuscite: ${lastErr}` : `${done} foto aggiunte ★`,
      notes.length ? `Ridotte: ${notes.join(' · ')}` : ''
    ].filter(Boolean).join(' · ');
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
      for (const flag of ['hero', 'contact']) {
        if (!draft.photos.some((p) => p[flag])) continue;
        for (const other of sets) {
          if (other.id === draft.id || !other.photos.some((p) => p[flag])) continue;
          other.photos = other.photos.map((p) => { const q = { ...p }; delete q[flag]; return q; });
          await store.save(other);
        }
      }
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
