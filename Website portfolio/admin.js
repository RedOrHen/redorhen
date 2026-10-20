/* =====================================================================
   RedOrHen — Area admin: calendario appuntamenti
   Dati su Supabase (login + Row Level Security) oppure, se non
   configurato, in modalità demo nel localStorage del browser.
   ===================================================================== */
(() => {
  'use strict';

  const CFG = window.ADMIN_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const HOUR = 48;          // px per ora nella vista settimana/giorno (uguale a --hour)
  const SNAP = 15;          // minuti
  const mqMobile = matchMedia('(max-width: 760px)');

  const CATS = {
    shooting: { label: 'Shooting', color: '#FF6A1A' },
    evento: { label: 'Evento', color: '#FFB547' },
    editing: { label: 'Editing', color: '#D9C3A5' },
    consegna: { label: 'Consegna', color: '#6FBF8E' },
    altro: { label: 'Altro', color: '#B48CFF' }
  };
  const catOf = (k) => CATS[k] || CATS.altro;

  /* ---------- Date ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const addMin = (d, n) => new Date(d.getTime() + n * 60000);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const startOfWeek = (d) => { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)); };
  const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const timeKey = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const parseLocal = (date, time = '00:00') => {
    const [y, m, dd] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    return new Date(y, m - 1, dd, h || 0, mi || 0);
  };
  const minutesOf = (d) => d.getHours() * 60 + d.getMinutes();
  const fmt = (opts) => new Intl.DateTimeFormat('it-IT', opts);
  const fMonth = fmt({ month: 'long', year: 'numeric' });
  const fDayLong = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fDayShort = fmt({ day: 'numeric', month: 'short' });
  const fWd = fmt({ weekday: 'short' });
  const fMonShort = fmt({ month: 'short' });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const overlaps = (ev, from, to) => ev.start < to && ev.end > from;

  /* ---------- Storage ---------- */
  const fromRow = (r) => ({
    id: r.id, title: r.title, start: new Date(r.start_at), end: new Date(r.end_at),
    allDay: !!r.all_day, category: r.category || 'altro',
    location: r.location || '', client: r.client || '', notes: r.notes || ''
  });
  const toRow = (e) => ({
    title: e.title, start_at: e.start.toISOString(), end_at: e.end.toISOString(),
    all_day: e.allDay, category: e.category,
    location: e.location || null, client: e.client || null, notes: e.notes || null
  });

  const useSupabase = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  let sb = null;

  const RemoteStore = {
    async list(from, to) {
      const { data, error } = await sb.from('appointments').select('*')
        .lt('start_at', to.toISOString()).gt('end_at', from.toISOString())
        .order('start_at', { ascending: true }).limit(1000);
      if (error) throw error;
      return data.map(fromRow);
    },
    async save(e) {
      const q = e.id
        ? sb.from('appointments').update(toRow(e)).eq('id', e.id)
        : sb.from('appointments').insert(toRow(e));
      const { data, error } = await q.select().single();
      if (error) throw error;
      return fromRow(data);
    },
    async remove(id) {
      const { error } = await sb.from('appointments').delete().eq('id', id);
      if (error) throw error;
    }
  };

  const DEMO_KEY = 'ro-admin-demo';
  const LocalStore = {
    read() {
      try { return (JSON.parse(localStorage.getItem(DEMO_KEY)) || []); } catch (e) { return []; }
    },
    write(rows) {
      try { localStorage.setItem(DEMO_KEY, JSON.stringify(rows)); } catch (e) { toast('Impossibile salvare nel browser', true); }
    },
    async list(from, to) {
      return this.read().map(fromRow).filter((e) => overlaps(e, from, to)).sort((a, b) => a.start - b.start);
    },
    async save(e) {
      const rows = this.read();
      const row = { ...toRow(e), id: e.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()) };
      const i = rows.findIndex((r) => r.id === row.id);
      if (i >= 0) rows[i] = row; else rows.push(row);
      this.write(rows);
      return fromRow(row);
    },
    async remove(id) { this.write(this.read().filter((r) => r.id !== id)); }
  };

  let store = LocalStore;

  /* ---------- UI helpers ---------- */
  let toastTimer;
  function toast(msg, isError = false) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('is-error', isError);
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
  }
  const errMsg = (e) => {
    const m = (e && (e.message || e.error_description)) || '';
    if (/fetch|network/i.test(m)) return 'Connessione assente: riprova';
    if (/JWT|session|auth/i.test(m)) return 'Sessione scaduta: accedi di nuovo';
    return 'Operazione non riuscita';
  };

  /* ---------- Stato ---------- */
  const state = {
    view: 'month',
    cursor: startOfDay(new Date()),
    selected: startOfDay(new Date()),
    events: [],
    range: null,
    scrolledOnce: false
  };

  function rangeFor(view, cursor) {
    if (view === 'month') {
      const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const from = startOfWeek(first);
      return { from, to: addDays(from, 42) };
    }
    if (view === 'week') { const from = startOfWeek(cursor); return { from, to: addDays(from, 7) }; }
    return { from: startOfDay(cursor), to: addDays(startOfDay(cursor), 1) };
  }

  const eventsOn = (day) => {
    const from = startOfDay(day), to = addDays(from, 1);
    return state.events.filter((e) => overlaps(e, from, to))
      .sort((a, b) => (b.allDay - a.allDay) || (a.start - b.start));
  };

  /* ---------- Caricamento ---------- */
  let loadSeq = 0;
  async function load() {
    const seq = ++loadSeq;
    state.range = rangeFor(state.view, state.cursor);
    $('#cal-view').classList.add('loading');
    try {
      const evs = await store.list(state.range.from, state.range.to);
      if (seq !== loadSeq) return;
      state.events = evs;
    } catch (e) {
      console.warn(e);
      toast(errMsg(e), true);
    } finally {
      if (seq === loadSeq) $('#cal-view').classList.remove('loading');
    }
    render();
  }

  async function loadUpcoming() {
    const box = $('#upcoming');
    try {
      const now = new Date();
      const evs = (await store.list(now, addDays(now, 120))).slice(0, 8);
      box.innerHTML = evs.length ? evs.map(agendaItem).join('') : '<p class="agenda-empty">Nessun appuntamento in programma. Premi <b>+ Nuovo</b> per aggiungerne uno.</p>';
    } catch (e) {
      box.innerHTML = '<p class="agenda-empty">Impossibile caricare gli appuntamenti.</p>';
    }
  }

  function agendaItem(e) {
    const c = catOf(e.category);
    const when = e.allDay ? 'Tutto il giorno' : `${timeKey(e.start)} – ${timeKey(e.end)}`;
    const extra = [e.client, e.location].filter(Boolean).join(' · ');
    return `<button class="agenda-item" type="button" data-id="${esc(e.id)}" style="--c:${c.color}">
      <span class="agenda-date"><b>${e.start.getDate()}</b><span>${esc(fMonShort.format(e.start))}</span></span>
      <span class="agenda-info"><b>${esc(e.title)}</b><span>${when}${extra ? ' · ' + esc(extra) : ''}</span></span>
    </button>`;
  }

  /* ---------- Render ---------- */
  function render() {
    const { view, cursor } = state;
    let title;
    if (view === 'month') title = fMonth.format(cursor);
    else if (view === 'week') {
      const a = startOfWeek(cursor), b = addDays(a, 6);
      title = `${fDayShort.format(a)} – ${fDayShort.format(b)} ${b.getFullYear()}`;
    } else title = fDayLong.format(cursor);
    $('#cal-title').textContent = cap(title);
    $$('[data-view]').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
    $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));

    if (view === 'month') renderMonth(); else renderTimegrid(view === 'week' ? 7 : 1);
    renderDayBox();
  }

  function chip(e, day) {
    const c = catOf(e.category);
    const continues = !sameDay(e.start, day);
    const t = e.allDay ? '' : `<time>${continues ? '↳' : timeKey(e.start)}</time>`;
    return `<button class="chip${e.allDay ? ' is-allday' : ''}" type="button" draggable="true" data-id="${esc(e.id)}" style="--c:${c.color}" title="${esc(e.title)}">${t}<b>${esc(e.title)}</b></button>`;
  }

  function renderMonth() {
    const { from } = state.range;
    const month = state.cursor.getMonth();
    const today = new Date();
    const heads = Array.from({ length: 7 }, (_, i) => `<span>${esc(fWd.format(addDays(from, i)))}</span>`).join('');
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = addDays(from, i);
      const evs = eventsOn(d);
      const max = 3;
      const cls = ['day-cell', d.getMonth() !== month && 'is-other', sameDay(d, today) && 'is-today', mqMobile.matches && sameDay(d, state.selected) && 'is-selected'].filter(Boolean).join(' ');
      cells += `<div class="${cls}" data-date="${dateKey(d)}" role="button" tabindex="0" aria-label="${esc(fDayLong.format(d))}${evs.length ? ', ' + evs.length + ' appuntamenti' : ''}">
        <span class="day-num">${d.getDate()}</span>
        ${evs.slice(0, max).map((e) => chip(e, d)).join('')}
        ${evs.length > max ? `<button class="more" type="button" data-more="${dateKey(d)}">+${evs.length - max} altri</button>` : ''}
        <span class="dots" aria-hidden="true">${evs.slice(0, 4).map((e) => `<i style="--c:${catOf(e.category).color}"></i>`).join('')}</span>
      </div>`;
    }
    $('#cal-view').innerHTML = `<div class="month"><div class="month-head">${heads}</div><div class="month-grid">${cells}</div></div>`;
  }

  function layoutDay(segs) {
    // Assegna colonne agli appuntamenti sovrapposti
    segs.sort((a, b) => a.s - b.s || b.e - a.e);
    let cluster = [], clusterEnd = -1;
    const flush = () => {
      const cols = [];
      cluster.forEach((g) => {
        let c = cols.findIndex((end) => end <= g.s);
        if (c < 0) { c = cols.length; cols.push(0); }
        cols[c] = g.e;
        g.col = c;
      });
      cluster.forEach((g) => { g.cols = cols.length; });
      cluster = [];
    };
    segs.forEach((g) => {
      if (g.s >= clusterEnd && cluster.length) { flush(); clusterEnd = -1; }
      cluster.push(g);
      clusterEnd = Math.max(clusterEnd, g.e);
    });
    if (cluster.length) flush();
    return segs;
  }

  function renderTimegrid(n) {
    const from = n === 7 ? startOfWeek(state.cursor) : startOfDay(state.cursor);
    const days = Array.from({ length: n }, (_, i) => addDays(from, i));
    const today = new Date();

    const head = days.map((d) => `<div data-goto="${dateKey(d)}" class="${sameDay(d, today) ? 'is-today' : ''}"><span class="wd">${esc(fWd.format(d))}</span><span class="dn">${d.getDate()}</span></div>`).join('');
    const allday = days.map((d) => `<div>${eventsOn(d).filter((e) => e.allDay).map((e) => chip(e, d)).join('')}</div>`).join('');
    const hours = Array.from({ length: 24 }, (_, h) => `<span>${pad(h)}:00</span>`).join('');

    const cols = days.map((d, di) => {
      const dayStart = startOfDay(d), dayEnd = addDays(dayStart, 1);
      const segs = state.events.filter((e) => !e.allDay && overlaps(e, dayStart, dayEnd)).map((e) => ({
        e: Math.min(1440, (Math.min(e.end, dayEnd) - dayStart) / 60000),
        s: Math.max(0, (Math.max(e.start, dayStart) - dayStart) / 60000),
        ev: e
      }));
      const html = layoutDay(segs).map((g) => {
        const c = catOf(g.ev.category);
        const top = g.s / 60 * HOUR;
        const h = Math.max(HOUR / 3, (g.e - g.s) / 60 * HOUR - 2);
        const w = 100 / g.cols;
        const sub = [g.ev.client, g.ev.location].filter(Boolean).join(' · ');
        return `<button class="tg-ev" type="button" data-id="${esc(g.ev.id)}" data-day="${di}" style="--c:${c.color};top:${top}px;height:${h}px;left:calc(${g.col * w}% + 2px);width:calc(${w}% - 4px)">
          <b>${esc(g.ev.title)}</b><time>${timeKey(g.ev.start)} – ${timeKey(g.ev.end)}</time>${sub && h > 54 ? `<small>${esc(sub)}</small>` : ''}
          <span class="tg-resize" aria-hidden="true"></span>
        </button>`;
      }).join('');
      const now = sameDay(d, today) ? `<span class="tg-now" style="top:${minutesOf(today) / 60 * HOUR}px"></span>` : '';
      return `<div class="tg-col${sameDay(d, today) ? ' is-today' : ''}" data-date="${dateKey(d)}">${html}${now}</div>`;
    }).join('');

    const view = $('#cal-view');
    const prevScroll = $('.tg-body', view)?.scrollTop;
    view.innerHTML = `<div class="tg" style="--days:${n}">
      <div class="tg-row tg-head"><div></div>${head}</div>
      <div class="tg-row tg-allday"><div>Giorno</div>${allday}</div>
      <div class="tg-body"><div class="tg-row"><div class="tg-hours">${hours}</div>${cols}</div></div>
    </div>`;
    const body = $('.tg-body', view);
    if (prevScroll != null) body.scrollTop = prevScroll;
    else {
      const first = state.events.filter((e) => !e.allDay).map((e) => minutesOf(e.start));
      const target = Math.min(8 * 60, first.length ? Math.min(...first) - 30 : 8 * 60);
      body.scrollTop = Math.max(0, target / 60 * HOUR);
    }
  }

  function renderDayBox() {
    const box = $('#day-box');
    const show = mqMobile.matches && state.view === 'month';
    box.hidden = !show;
    if (!show) return;
    $('#day-box-title').textContent = cap(fDayLong.format(state.selected));
    const evs = eventsOn(state.selected);
    $('#day-agenda').innerHTML = evs.length ? evs.map(agendaItem).join('') : '<p class="agenda-empty">Nessun appuntamento.</p>';
  }

  /* ---------- Navigazione ---------- */
  function setView(v) {
    if (v === 'week' && mqMobile.matches) v = 'day';
    state.view = v;
    load();
  }
  function nav(dir) {
    if (dir === 0) { state.cursor = startOfDay(new Date()); state.selected = state.cursor; }
    else if (state.view === 'month') state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + dir, 1);
    else state.cursor = addDays(state.cursor, dir * (state.view === 'week' ? 7 : 1));
    load();
  }
  function gotoDay(key) { state.cursor = parseLocal(key); state.selected = state.cursor; setView('day'); }

  /* ---------- Editor ---------- */
  const dlg = $('#ev-dialog');
  const form = $('#ev-form');
  const F = form.elements;
  let editing = null;

  $('#cats').innerHTML = Object.entries(CATS).map(([k, c]) =>
    `<label style="--c:${c.color}"><input type="radio" name="category" value="${k}"><span>${c.label}</span></label>`).join('');
  $('#legend').innerHTML = Object.values(CATS).map((c) => `<span style="--c:${c.color}"><i></i>${c.label}</span>`).join('');

  function syncAllDay() {
    const all = F.allDay.checked;
    $$('[data-timed-only]', form).forEach((el) => { el.hidden = all; });
    $$('[data-allday-only]', form).forEach((el) => { el.hidden = !all; });
    F.start.required = F.end.required = !all;
  }
  F.allDay.addEventListener('change', syncAllDay);
  F.start.addEventListener('change', () => {
    // Mantiene la durata quando si sposta l'orario di inizio
    if (!editing) return;
    const dur = editing._dur || 60;
    const s = parseLocal(F.date.value || dateKey(new Date()), F.start.value);
    F.end.value = timeKey(addMin(s, dur));
  });
  F.end.addEventListener('change', () => {
    if (!editing) return;
    const s = parseLocal(F.date.value, F.start.value), e = parseLocal(F.date.value, F.end.value);
    if (e > s) editing._dur = (e - s) / 60000;
  });

  function openEditor(ev, preset = {}) {
    editing = ev ? { ...ev } : {
      id: null, title: '', category: 'shooting', allDay: !!preset.allDay, location: '', client: '', notes: '',
      start: preset.start || addMin(startOfDay(state.cursor), 10 * 60),
      end: preset.end || addMin(startOfDay(state.cursor), 11 * 60)
    };
    editing._dur = Math.max(SNAP, (editing.end - editing.start) / 60000);
    $('#ev-title').textContent = ev ? 'Modifica appuntamento' : 'Nuovo appuntamento';
    F.title.value = editing.title;
    F.allDay.checked = editing.allDay;
    F.date.value = dateKey(editing.start);
    F.endDate.value = dateKey(editing.allDay ? addDays(editing.end, -1) : editing.start);
    F.start.value = timeKey(editing.start);
    F.end.value = timeKey(editing.end);
    F.client.value = editing.client;
    F.location.value = editing.location;
    F.notes.value = editing.notes;
    (form.querySelector(`input[name="category"][value="${editing.category}"]`) || form.querySelector('input[name="category"]')).checked = true;
    $('#ev-delete').hidden = !ev;
    $('.ev-error', form).textContent = '';
    syncAllDay();
    dlg.showModal();
    setTimeout(() => F.title.focus(), 30);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('.ev-error', form);
    const title = F.title.value.trim();
    if (!title) { err.textContent = 'Dai un titolo all\'appuntamento'; F.title.focus(); return; }
    if (!F.date.value) { err.textContent = 'Scegli una data'; return; }
    let start, end;
    if (F.allDay.checked) {
      start = parseLocal(F.date.value);
      const last = F.endDate.value ? parseLocal(F.endDate.value) : start;
      if (last < start) { err.textContent = 'La data di fine è prima di quella di inizio'; return; }
      end = addDays(last, 1);
    } else {
      if (!F.start.value || !F.end.value) { err.textContent = 'Indica orario di inizio e fine'; return; }
      start = parseLocal(F.date.value, F.start.value);
      end = parseLocal(F.date.value, F.end.value);
      if (end <= start) end = addDays(end, 1); // es. 22:00 → 01:00 finisce il giorno dopo
    }
    const ev = {
      id: editing.id, title, start, end, allDay: F.allDay.checked,
      category: F.category.value || 'altro',
      client: F.client.value.trim(), location: F.location.value.trim(), notes: F.notes.value.trim()
    };
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await store.save(ev);
      dlg.close();
      toast(ev.id ? 'Appuntamento aggiornato' : 'Appuntamento salvato ★');
      refresh();
    } catch (x) {
      console.warn(x);
      err.textContent = errMsg(x);
    } finally { btn.disabled = false; }
  });

  $('#ev-cancel').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  $('#ev-delete').addEventListener('click', async () => {
    if (!editing?.id) return;
    if (!confirm(`Eliminare "${editing.title}"?`)) return;
    try {
      await store.remove(editing.id);
      dlg.close();
      toast('Appuntamento eliminato');
      refresh();
    } catch (x) { $('.ev-error', form).textContent = errMsg(x); }
  });

  async function quickSave(ev, patch) {
    const next = { ...ev, ...patch };
    // Aggiornamento ottimistico
    state.events = state.events.map((e) => (e.id === ev.id ? next : e));
    render();
    try { await store.save(next); toast('Spostato'); loadUpcoming(); }
    catch (x) { toast(errMsg(x), true); load(); }
  }

  const refresh = () => { load(); loadUpcoming(); };
  const byId = (id) => state.events.find((e) => e.id === id);

  /* ---------- Interazioni calendario ---------- */
  const view = $('#cal-view');
  let suppressClick = false;

  view.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; return; }
    const more = e.target.closest('[data-more]');
    if (more) { gotoDay(more.dataset.more); return; }
    const ch = e.target.closest('.chip, .tg-ev');
    if (ch) { const ev = byId(ch.dataset.id); if (ev) openEditor(ev); return; }
    const goto = e.target.closest('[data-goto]');
    if (goto) { gotoDay(goto.dataset.goto); return; }
    const cell = e.target.closest('.day-cell');
    if (cell) {
      const d = parseLocal(cell.dataset.date);
      if (mqMobile.matches) { state.selected = d; render(); return; }
      openEditor(null, { start: addMin(d, 10 * 60), end: addMin(d, 11 * 60) });
      return;
    }
    const col = e.target.closest('.tg-col');
    if (col) {
      const y = e.clientY - col.getBoundingClientRect().top;
      const m = Math.max(0, Math.min(1410, Math.floor((y / HOUR * 60) / 30) * 30));
      const d = parseLocal(col.dataset.date);
      openEditor(null, { start: addMin(d, m), end: addMin(d, m + 60) });
    }
  });

  view.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('day-cell')) {
      e.preventDefault();
      e.target.click();
    }
  });

  // Mese: trascina un appuntamento su un altro giorno
  let dragId = null;
  view.addEventListener('dragstart', (e) => {
    const ch = e.target.closest('.chip');
    if (!ch) return;
    dragId = ch.dataset.id;
    ch.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  });
  view.addEventListener('dragend', () => { dragId = null; $$('.is-dragging, .is-drop', view).forEach((el) => el.classList.remove('is-dragging', 'is-drop')); });
  view.addEventListener('dragover', (e) => {
    const cell = e.target.closest('.day-cell');
    if (!dragId || !cell) return;
    e.preventDefault();
    $$('.is-drop', view).forEach((el) => el !== cell && el.classList.remove('is-drop'));
    cell.classList.add('is-drop');
  });
  view.addEventListener('drop', (e) => {
    const cell = e.target.closest('.day-cell');
    const ev = byId(dragId);
    if (!cell || !ev) return;
    e.preventDefault();
    const target = parseLocal(cell.dataset.date);
    const delta = Math.round((target - startOfDay(ev.start)) / 86400000);
    if (delta) quickSave(ev, { start: addDays(ev.start, delta), end: addDays(ev.end, delta) });
  });

  // Settimana/Giorno: trascina per spostare, maniglia in basso per cambiare durata
  view.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.tg-ev');
    if (!el || e.button !== 0 || e.pointerType === 'touch') return;
    const ev = byId(el.dataset.id);
    if (!ev) return;
    e.preventDefault();
    const resize = e.target.classList.contains('tg-resize');
    const col = el.parentElement;
    const cols = $$('.tg-col', view);
    const colW = col.getBoundingClientRect().width;
    const idx = cols.indexOf(col);
    const sx = e.clientX, sy = e.clientY;
    const h0 = el.offsetHeight;
    const timeEl = $('time', el);
    let moved = false, dMin = 0, dDay = 0;
    try { el.setPointerCapture(e.pointerId); } catch (x) { /* il movimento è seguito comunque su window */ }

    const onMove = (m) => {
      const dx = m.clientX - sx, dy = m.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true;
      el.classList.add('is-dragging');
      dMin = Math.round((dy / HOUR * 60) / SNAP) * SNAP;
      if (resize) {
        dMin = Math.max(dMin, SNAP - (ev.end - ev.start) / 60000);
        el.style.height = `${Math.max(HOUR / 4, h0 + dMin / 60 * HOUR)}px`;
        timeEl.textContent = `${timeKey(ev.start)} – ${timeKey(addMin(ev.end, dMin))}`;
      } else {
        dDay = cols.length > 1 ? Math.max(-idx, Math.min(cols.length - 1 - idx, Math.round(dx / colW))) : 0;
        el.style.transform = `translate(${dDay * colW}px, ${dMin / 60 * HOUR}px)`;
        const ns = addMin(addDays(ev.start, dDay), dMin);
        timeEl.textContent = `${timeKey(ns)} – ${timeKey(addMin(ns, (ev.end - ev.start) / 60000))}`;
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      if (!moved) return;
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 50);
      if (resize) { if (dMin) quickSave(ev, { end: addMin(ev.end, dMin) }); else render(); }
      else if (dMin || dDay) quickSave(ev, { start: addMin(addDays(ev.start, dDay), dMin), end: addMin(addDays(ev.end, dDay), dMin) });
      else render();
    };
    const onCancel = () => { onUp(); render(); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  });

  // Elenchi laterali
  ['#upcoming', '#day-agenda'].forEach((sel) => $(sel).addEventListener('click', async (e) => {
    const it = e.target.closest('.agenda-item');
    if (!it) return;
    let ev = byId(it.dataset.id);
    if (!ev) {
      // L'appuntamento può essere fuori dal periodo visualizzato
      const d = new Date();
      ev = (await store.list(addDays(d, -1), addDays(d, 400))).find((x) => x.id === it.dataset.id);
    }
    if (ev) openEditor(ev);
  }));
  $('#day-add').addEventListener('click', () => {
    const d = state.selected;
    openEditor(null, { start: addMin(d, 10 * 60), end: addMin(d, 11 * 60) });
  });

  // Toolbar
  $$('[data-nav]').forEach((b) => b.addEventListener('click', () => nav(+b.dataset.nav)));
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('#new-ev').addEventListener('click', () => {
    const base = state.view === 'month' && !mqMobile.matches ? startOfDay(new Date()) : (mqMobile.matches ? state.selected : state.cursor);
    openEditor(null, { start: addMin(base, 10 * 60), end: addMin(base, 11 * 60) });
  });

  document.addEventListener('keydown', (e) => {
    if ($('#app').hidden || $('#tab-calendar').hidden || document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/input|textarea|select/i.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'n') { e.preventDefault(); $('#new-ev').click(); }
    else if (k === 't') nav(0);
    else if (e.key === 'ArrowLeft') nav(-1);
    else if (e.key === 'ArrowRight') nav(1);
    else if (k === 'm') setView('month');
    else if (k === 's') setView('week');
    else if (k === 'g') setView('day');
  });

  mqMobile.addEventListener('change', () => { if (state.view === 'week' && mqMobile.matches) setView('day'); else render(); });
  setInterval(() => { if (state.view !== 'month' && !$('#app').hidden) render(); }, 60000);

  /* ---------- Avvio e login ---------- */
  function startApp(user) {
    $('#login').hidden = true;
    $('#app').hidden = false;
    $('#user-email').textContent = user ? user.email : 'Demo';
    $('#demo-banner').hidden = !!user;
    $('#logout').hidden = !user;
    refresh();
    window.RO_ADMIN = { sb: user ? sb : null, toast };
    window.dispatchEvent(new CustomEvent('ro-admin-ready', { detail: window.RO_ADMIN }));
  }
  function showLogin() {
    $('#app').hidden = true;
    $('#login').hidden = false;
    state.events = [];
    window.RO_ADMIN = null;
    window.dispatchEvent(new CustomEvent('ro-admin-logout'));
    setTimeout(() => $('#login-form').email.focus(), 30);
  }

  async function boot() {
    if (!useSupabase) { store = LocalStore; startApp(null); return; }
    if (!window.supabase?.createClient) {
      showLogin();
      $('.login-error').textContent = 'Impossibile caricare il servizio di accesso. Controlla la connessione.';
      return;
    }
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    store = RemoteStore;
    const { data } = await sb.auth.getSession();
    if (data.session) startApp(data.session.user); else showLogin();
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) showLogin();
    });
  }

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const msg = $('.login-error', f);
    msg.textContent = '';
    if (!f.email.value || !f.password.value) { msg.textContent = 'Inserisci email e password'; return; }
    const btn = f.querySelector('button[type="submit"]');
    btn.disabled = true;
    const { data, error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
    btn.disabled = false;
    if (error) {
      msg.textContent = /invalid/i.test(error.message) ? 'Email o password non corretti' : 'Accesso non riuscito, riprova';
      return;
    }
    f.password.value = '';
    startApp(data.user);
  });

  $('#logout').addEventListener('click', async () => { await sb?.auth.signOut(); showLogin(); });

  boot();
})();
