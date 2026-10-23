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
  // Online si tiene solo una versione a 4000 px sul lato lungo: nitida anche su un monitor 4K,
  // ma non l'originale da stampa (chi la scarica dal browser non ha la foto piena)
  const MAX_SIDE = 4000;
  const QUALITY = 0.9;       // qualità JPEG della versione online
  const THUMB_SIDE = 1600;   // lato lungo dell'anteprima per griglia e miniature
  const DEMO_SIDE = 1200;    // in demo le foto stanno nel browser: più piccole
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

  // Riduce un canvas già pronto (per l'anteprima si parte dalla versione a 4000 px, più veloce)
  function shrinkCanvas(src, max) {
    const s = Math.min(1, max / Math.max(src.width, src.height));
    const c = document.createElement('canvas');
    c.width = Math.round(src.width * s); c.height = Math.round(src.height * s);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }

  // Versione online di una foto: al massimo 4000 px sul lato lungo, JPEG al 90%.
  // Si ricodifica sempre: così spariscono anche i metadati (posizione GPS, dati della fotocamera).
  async function webVersion(file) {
    const r = await resizeImage(file, MAX_SIDE);
    const blob = await toBlob(r.canvas, QUALITY);
    if (!blob) throw new Error('Impossibile leggere la foto');
    return { blob, canvas: r.canvas, w: r.w, h: r.h, w0: r.w0, h0: r.h0 };
  }

  const fileUrl = (path) => `${CFG.supabaseUrl}/storage/v1/object/public/gallery/${String(path).split('/').map(encodeURIComponent).join('/')}`;
  // Nell'admin si mostra l'anteprima leggera (l'originale resta per il visualizzatore del sito)
  const publicUrl = (p) => p.src || fileUrl(p.thumb || p.path);

  // Barra di avanzamento (valore da 0 a 1; null = nascosta)
  function showBar(el, v) {
    if (!el) return;
    el.hidden = v == null;
    if (v == null) return;
    el.querySelector('i').style.transform = `scaleX(${Math.min(1, Math.max(0, v))})`;
    el.setAttribute('aria-valuenow', String(Math.round(v * 100)));
  }

  /* ---------- Storage ---------- */
  const cleanRow = (s) => ({
    id: s.id, character: s.character, series: s.series || null, category: s.category || null,
    cosplayer: s.cosplayer || null, featured: !!s.featured, published: s.published !== false,
    position: s.position || 0, year: s.year || null, fair: s.fair || null, photos: s.photos.map((p) => (p.path ? { path: p.path, thumb: p.thumb || null, w: p.w, h: p.h, alt: p.alt || null, hero: p.hero || undefined, contact: p.contact || undefined, story: p.story || undefined, rule: p.rule || undefined } : p))
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
    // Caricamento con avanzamento: supabase-js non segnala i byte inviati, quindi si usa
    // direttamente l'API dello storage con XMLHttpRequest
    async put(path, blob, onPct) {
      const { data } = await sb.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error('auth: sessione scaduta');
      const url = `${CFG.supabaseUrl}/storage/v1/object/gallery/${path.split('/').map(encodeURIComponent).join('/')}`;
      await new Promise((res, rej) => {
        const x = new XMLHttpRequest();
        x.open('POST', url);
        x.setRequestHeader('Authorization', `Bearer ${token}`);
        x.setRequestHeader('apikey', CFG.supabaseAnonKey);
        x.setRequestHeader('Content-Type', blob.type || 'image/jpeg');
        x.setRequestHeader('Cache-Control', 'max-age=31536000');
        x.setRequestHeader('x-upsert', 'false');
        x.upload.onprogress = (e) => { if (e.lengthComputable) onPct?.(e.loaded / e.total); };
        x.onload = () => {
          if (x.status >= 200 && x.status < 300) { onPct?.(1); res(); return; }
          let m = `HTTP ${x.status}`;
          try { m = JSON.parse(x.responseText).message || m; } catch (e) { /* risposta non JSON */ }
          rej(new Error(m));
        };
        x.onerror = () => rej(new Error('network'));
        x.send(blob);
      });
    },
    // Si salvano solo la versione a 4000 px e un'anteprima leggera per griglia, miniature e pellicola.
    // onProgress riceve un valore da 0 a 1: preparazione 0–15%, foto 15–90%, anteprima 90–100%.
    async upload(setId, file, onProgress) {
      onProgress?.(0.02);
      const web = await webVersion(file);
      const thumbBlob = await toBlob(shrinkCanvas(web.canvas, THUMB_SIDE), 0.85);
      onProgress?.(0.15);
      const base = `${setId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const path = `${base}.jpg`;
      const thumb = `${base}-anteprima.jpg`;
      await this.put(path, web.blob, (p) => onProgress?.(0.15 + p * 0.75));
      try {
        await this.put(thumb, thumbBlob, (p) => onProgress?.(0.9 + p * 0.1));
      } catch (e) { await sb.storage.from('gallery').remove([path]); throw e; }
      return { path, thumb, w: web.w, h: web.h };
    },
    // Crea la versione a 4000 px di una foto già online (il file vecchio si cancella dopo il salvataggio)
    async shrinkExisting(photo, onProgress) {
      onProgress?.(0.02);
      const path = `${photo.path.replace(/\.[a-z0-9]+$/i, '')}-4000.jpg`;
      const res = await fetch(fileUrl(photo.path), { cache: 'no-store' });
      if (!res.ok) {
        // Riparazione: l'originale non c'è più ma la versione a 4000 px sì (una conversione
        // precedente era stata annullata da un salvataggio del set fatto nel frattempo): si collega quella
        const done = await fetch(fileUrl(path), { cache: 'no-store' });
        if (!done.ok) throw new Error(`download ${res.status}`);
        const bmp = await createImageBitmap(await done.blob());
        const fixed = { ...photo, path, w: bmp.width, h: bmp.height };
        bmp.close?.();
        onProgress?.(1);
        return fixed;
      }
      const raw = await res.blob();
      onProgress?.(0.4);
      const web = await webVersion(new Blob([raw], { type: raw.type || 'image/jpeg' }));
      onProgress?.(0.5);
      await this.put(path, web.blob, (p) => onProgress?.(0.5 + p * 0.5));
      return { ...photo, path, w: web.w, h: web.h };
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
    async upload(setId, file, onProgress) {
      const { canvas, w, h } = await resizeImage(file, DEMO_SIDE);
      onProgress?.(1);
      return { src: canvas.toDataURL('image/jpeg', 0.78), w, h };
    },
    async removeFiles() {}
  };

  const errText = (e) => {
    const m = (e && e.message) || '';
    if (/esaurito|Impossibile leggere/.test(m)) return m;
    if (/'(year|fair)' column|column .*(year|fair)/i.test(m)) return 'Mancano i campi Anno e Fiera: esegui supabase/anno-fiera.sql in Supabase';
    if (/maximum allowed size|exceeded/i.test(m)) return 'Supabase rifiuta il file: il limite del contenitore "gallery" è più basso di 20 MB (vedi supabase/LEGGIMI.md)';
    if (/fetch|network/i.test(m)) return 'Connessione assente: riprova';
    if (/row-level|policy|JWT|JWS|auth/i.test(m)) return 'Permesso negato: accedi di nuovo';
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
    updateShrinkButton();
  }

  // Valori già usati in un campo, senza doppioni (maiuscole e spazi non contano), in ordine alfabetico
  const norm = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');
  const known = (key) => {
    const m = new Map();
    sets.forEach((s) => { const v = norm(s[key]); if (v && !m.has(v.toLowerCase())) m.set(v.toLowerCase(), v); });
    return [...m.values()].sort((a, b) => a.localeCompare(b, 'it'));
  };
  // Se il valore esiste già con un'altra grafia, si usa quella salvata
  const canon = (key, v) => {
    const t = norm(v);
    return known(key).find((x) => x.toLowerCase() === t.toLowerCase()) || t;
  };
  const fillList = (id, values) => { $(id).innerHTML = values.map((v) => `<option value="${esc(v)}">`).join(''); };
  let yearFilter = '';

  function render() {
    fillList('#g-cats', known('category'));
    fillList('#g-chars', known('character'));
    fillList('#g-series', known('series'));
    fillList('#g-fairs', known('fair'));
    const years = [...new Set(sets.map((s) => s.year).filter(Boolean))].sort((a, b) => b - a);
    fillList('#g-years', years);
    const yf = $('#g-year-filter');
    if (yf) {
      if (yearFilter && !years.includes(+yearFilter)) yearFilter = '';
      yf.innerHTML = '<option value="">Tutti gli anni</option>' + years.map((y) => `<option value="${y}">${y}</option>`).join('') +
        (sets.some((s) => !s.year) ? '<option value="none">Senza anno</option>' : '');
      yf.value = yearFilter;
      yf.hidden = !years.length;
    }
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
        : [hero && 'Hero', contact && 'Contatti', s.photos.some((p) => p.story) && 'Storia', s.photos.some((p) => p.rule) && 'Regole', s.featured && '★ Home'].filter(Boolean);
      const hide = yearFilter && (yearFilter === 'none' ? !!s.year : String(s.year) !== yearFilter);
      return `<article class="g-card${s.published === false ? ' is-draft' : ''}" data-id="${esc(s.id)}"${hide ? ' hidden' : ''}>
        <button class="g-cover" type="button" data-act="edit" aria-label="Modifica ${esc(s.character)}">
          ${cover ? `<img src="${esc(publicUrl(cover))}" alt="" loading="lazy" decoding="async">` : '<span class="g-nophoto pixel">Nessuna foto</span>'}
          <span class="g-badge pixel">${s.photos.length} foto</span>
          ${flags.length ? `<span class="g-flags pixel">${flags.map(esc).join(' · ')}</span>` : ''}
        </button>
        <div class="g-info">
          <b>${esc(s.character)}</b>
          <span>${esc([s.series, s.category].filter(Boolean).join(' · ') || '—')}</span>
          ${s.fair || s.year ? `<span class="g-when">${esc([s.fair, s.year].filter(Boolean).join(' · '))}</span>` : ''}
        </div>
        <div class="g-actions">
          <button class="btn-sm icon" type="button" data-act="up" aria-label="Sposta prima" ${i === 0 || yearFilter ? 'disabled' : ''}>▲</button>
          <button class="btn-sm icon" type="button" data-act="down" aria-label="Sposta dopo" ${i === sets.length - 1 || yearFilter ? 'disabled' : ''}>▼</button>
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
  const bar = $('#g-bar');
  let draft = null;        // set in modifica
  let uploaded = [];       // foto caricate in questa sessione dell'editor
  let removed = [];        // foto esistenti tolte (da cancellare al salvataggio)
  let busy = 0;

  function openEditor(s) {
    if (shrinking) { toast('Attendi la fine della riduzione delle foto', true); return; }
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
    F.fair.value = draft.fair || '';
    F.year.value = draft.year || '';
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
          <button type="button" data-p="story" aria-pressed="${!!p.story}" title="Mostra nella storia della Home">Storia</button>
          <button type="button" data-p="rule" aria-pressed="${!!p.rule}" title="Mostra nelle regole della Home">Regole</button>
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
    // Storia e Regole: più foto possibili, ognuna si accende e si spegne da sola
    if (b.dataset.p === 'story' || b.dataset.p === 'rule') {
      if (ph[i][b.dataset.p]) delete ph[i][b.dataset.p]; else ph[i][b.dataset.p] = true;
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
    for (const f of imgs) {
      const label = `foto ${done + 1} di ${imgs.length} (${f.name}, ${mb(f.size)})`;
      const step = (p) => {
        const total = (done + p) / imgs.length;
        showBar(bar, total);
        progress.textContent = `Caricamento ${Math.round(total * 100)}% · ${label}`;
      };
      step(0);
      try {
        const p = await store.upload(draft.id, f, step);
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
    showBar(bar, null);
    progress.textContent = failed ? `${done - failed} caricate, ${failed} non riuscite: ${lastErr}` : `Caricamento 100% · ${done} foto aggiunte ★`;
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
    const character = canon('character', F.character.value);
    if (!character) { err.textContent = 'Indica il nome del personaggio'; F.character.focus(); return; }
    const yearRaw = String(F.year.value).trim();
    const year = yearRaw ? parseInt(yearRaw, 10) : null;
    if (yearRaw && !(year >= 1990 && year <= 2100)) { err.textContent = "Controlla l'anno (es. 2026)"; F.year.focus(); return; }
    Object.assign(draft, {
      character, series: canon('series', F.series.value), category: canon('category', F.category.value),
      fair: canon('fair', F.fair.value), year,
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
  $('#g-year-filter')?.addEventListener('change', (e) => { yearFilter = e.target.value; render(); });

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

  /* ---------- Foto già online: versione a 4000 px al posto degli originali ---------- */
  const big = (p) => p.path && Math.max(p.w || 0, p.h || 0) > MAX_SIDE;
  let shrinking = false; // durante la riduzione l'editor resta chiuso: un salvataggio la annullerebbe
  function updateShrinkButton() {
    const btn = $('#g-shrink');
    if (!btn) return;
    const n = sets.reduce((k, s) => k + s.photos.filter(big).length, 0);
    btn.hidden = !n || !store?.shrinkExisting;
    btn.textContent = `Riduci ${n} foto a 4000 px`;
  }

  $('#g-shrink')?.addEventListener('click', async () => {
    const todo = sets.map((s) => ({ s, photos: s.photos.filter(big) })).filter((t) => t.photos.length);
    const n = todo.reduce((k, t) => k + t.photos.length, 0);
    if (!n) return;
    if (!confirm(`Creo la versione a 4000 px di ${n} foto e CANCELLO DEFINITIVAMENTE da Supabase i loro originali in alta risoluzione. Le anteprime restano. Gli originali sul tuo computer non vengono toccati. Procedo?`)) return;
    const btn = $('#g-shrink');
    const out = $('#g-batch');
    const bbar = $('#g-batch-bar');
    btn.disabled = true;
    shrinking = true;
    let done = 0, failed = 0;
    try {
      for (const t of todo) {
        const old = [];
        const fixed = new Map(); // indirizzo vecchio → foto a 4000 px
        for (const p of t.photos) {
          const step = (x) => {
            const total = (done + x) / n;
            showBar(bbar, total);
            out.textContent = `Riduzione ${Math.round(total * 100)}% · foto ${done + 1} di ${n} (${t.s.character})`;
          };
          step(0);
          try {
            const np = await store.shrinkExisting(p, step);
            fixed.set(p.path, np);
            if (np.path !== p.path) old.push(p.path);
          } catch (e) { console.warn(e); failed++; }
          done++;
        }
        if (!fixed.size) continue;
        // Si riparte dalla versione del set salvata adesso (non da quella letta all'inizio),
        // così non si perdono modifiche fatte nel frattempo; poi si cancellano gli originali
        const fresh = (await store.list()).find((x) => x.id === t.s.id) || t.s;
        await store.save({ ...fresh, photos: (fresh.photos || []).map((p) => fixed.get(p.path) || p) });
        if (old.length) await store.removeFiles(old.map((path) => ({ path })));
      }
      out.textContent = failed ? `Fatto: ${n - failed} foto ridotte, ${failed} non riuscite (riprova)` : `Fatto: ${n} foto ridotte a 4000 px, originali cancellati ★`;
      toast(failed ? 'Riduzione completata con qualche errore' : 'Foto ridotte a 4000 px ★', !!failed);
    } catch (e) {
      console.warn(e);
      out.textContent = errText(e);
      toast(errText(e), true);
    } finally {
      shrinking = false;
      showBar(bbar, null);
      btn.disabled = false;
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
    $$('[id^="tab-"]').forEach((el) => { el.hidden = el.id !== `tab-${tab}`; });
    try { localStorage.setItem('ro-admin-tab', tab); } catch (e) { /* facoltativo */ }
    if (tab === 'gallery' && store && !loaded) load();
    window.dispatchEvent(new CustomEvent('ro-admin-tab', { detail: tab }));
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
