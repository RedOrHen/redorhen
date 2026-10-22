/* =====================================================================
   RedOrHen — Area admin, scheda Listino: prezzi e sconti a tempo
   Supabase (tabelle price_items e promotions) oppure modalità demo nel localStorage.
   Si attiva dopo il login (evento ro-admin-ready).
   ===================================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DEMO_KEY = 'ro-promo-demo';
  const PRICES_DEMO_KEY = 'ro-prices-demo';

  // Prezzi del Listino: questi sono quelli di partenza, sostituiti da quelli salvati
  const PRICES = {
    lv1: { price: 50 }, lv2: { price: 150 }, lv3_2: { price: 60 }, lv3_3: { price: 80 },
    extra_foto: { price: 5, suffix: '/ foto' }, extra_trasferta: { price: 0 }, extra_evento: { price: 15, suffix: '· 3 foto' }
  };
  // Pacchetti per l'esempio degli sconti (il Boss Fight parte dal prezzo più basso)
  const PLANS = {
    lv1: { name: 'Side Quest', get price() { return PRICES.lv1.price ?? 0; } },
    lv2: { name: 'Main Quest', get price() { return PRICES.lv2.price ?? 0; } },
    lv3: { name: 'Boss Fight', get price() { return Math.min(PRICES.lv3_2.price ?? 0, PRICES.lv3_3.price ?? 0); } }
  };

  const pad = (n) => String(n).padStart(2, '0');
  const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => isoDay(new Date());
  const fmtDay = (iso, year) => new Date(`${iso}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', ...(year ? { year: 'numeric' } : {}) });
  const euro = (n) => `${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')} €`;
  const discounted = (price, p) => Math.max(0, Math.round((p.kind === 'percent' ? price * (1 - p.amount / 100) : price - p.amount) * 100) / 100);
  const off = (p) => (p.kind === 'percent' ? `−${+p.amount}%` : `−${euro(+p.amount)}`);

  let toast = (m) => console.log(m);
  let store = null;
  let promos = [];
  let loaded = false;
  let editing = null;

  const form = $('#p-form');
  const list = $('#p-list');
  if (!form || !list) return;

  /* ---------- Archivio ---------- */
  const RemoteStore = (sb) => ({
    async list() {
      const { data, error } = await sb.from('promotions').select('*').order('starts_on', { ascending: false });
      if (error) throw error;
      return data;
    },
    async save(p) {
      const { data, error } = await sb.from('promotions').upsert(p).select().single();
      if (error) throw error;
      return data;
    },
    async remove(p) {
      const { error } = await sb.from('promotions').delete().eq('id', p.id);
      if (error) throw error;
    }
  });
  const LocalStore = {
    read() { try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || []; } catch (e) { return []; } },
    write(rows) { localStorage.setItem(DEMO_KEY, JSON.stringify(rows)); },
    async list() { return this.read().sort((a, b) => b.starts_on.localeCompare(a.starts_on)); },
    async save(p) {
      const rows = this.read();
      const row = { ...p, id: p.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) };
      const i = rows.findIndex((r) => r.id === row.id);
      if (i >= 0) rows[i] = row; else rows.push(row);
      this.write(rows);
      return row;
    },
    async remove(p) { this.write(this.read().filter((r) => r.id !== p.id)); }
  };

  const PriceRemote = (sb) => ({
    async list() {
      const { data, error } = await sb.from('price_items').select('key,price,suffix');
      if (error) throw error;
      return data;
    },
    async save(rows) {
      const { error } = await sb.from('price_items').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
    }
  });
  const PriceLocal = {
    async list() { try { return JSON.parse(localStorage.getItem(PRICES_DEMO_KEY)) || []; } catch (e) { return []; } },
    async save(rows) { localStorage.setItem(PRICES_DEMO_KEY, JSON.stringify(rows)); }
  };
  let priceStore = null;

  const errText = (e) => {
    const m = (e && (e.message || e.code)) || '';
    if (/price_items/i.test(m)) return 'Manca la tabella dei prezzi: esegui supabase/prezzi.sql in Supabase';
    if (/promotions|relation|does not exist|schema cache|PGRST205|42P01/i.test(m)) return 'Manca la tabella degli sconti: esegui supabase/sconti.sql in Supabase';
    if (/fetch|network/i.test(m)) return 'Connessione assente: riprova';
    if (/row-level|policy|JWT|auth/i.test(m)) return 'Permesso negato: accedi di nuovo';
    return 'Operazione non riuscita';
  };

  /* ---------- Stato di uno sconto ---------- */
  function status(p) {
    const t = today();
    if (!p.active) return { key: 'off', text: 'Disattivato' };
    if (t < p.starts_on) return { key: 'next', text: 'Programmato' };
    if (t > p.ends_on) return { key: 'past', text: 'Scaduto' };
    return { key: 'on', text: 'Attivo ora' };
  }

  /* ---------- Elenco ---------- */
  function render() {
    if (!promos.length) {
      list.innerHTML = '<p class="agenda-empty">Nessuno sconto salvato. Compila il modulo per crearne uno.</p>';
      return;
    }
    const order = { on: 0, next: 1, off: 2, past: 3 };
    const rows = [...promos].sort((a, b) => order[status(a).key] - order[status(b).key] || a.starts_on.localeCompare(b.starts_on));
    list.innerHTML = rows.map((p) => {
      const st = status(p);
      const plans = (p.plans || []).map((k) => PLANS[k] ? PLANS[k].name : k).join(' · ');
      return `
        <article class="p-card is-${st.key}${editing === p.id ? ' is-editing' : ''}">
          <div class="p-card-head">
            <b class="p-off">${esc(off(p))}</b>
            <span class="p-status pixel">${st.text}</span>
          </div>
          ${p.label ? `<p class="p-label">${esc(p.label)}</p>` : ''}
          <p class="p-when">Dal ${esc(fmtDay(p.starts_on))} al ${esc(fmtDay(p.ends_on, true))}</p>
          <p class="p-plans">${esc(plans)}</p>
          <div class="g-actions">
            <button class="btn-sm" type="button" data-act="edit" data-id="${esc(p.id)}">Modifica</button>
            <button class="btn-sm" type="button" data-act="toggle" data-id="${esc(p.id)}">${p.active ? 'Disattiva' : 'Attiva'}</button>
            <button class="btn-sm btn-danger" type="button" data-act="del" data-id="${esc(p.id)}" aria-label="Elimina lo sconto">Elimina</button>
          </div>
        </article>`;
    }).join('');
  }

  async function load() {
    if (!store) return;
    list.classList.add('loading');
    try {
      promos = await store.list();
      loaded = true;
      render();
    } catch (e) {
      console.warn(e);
      list.innerHTML = `<p class="agenda-empty">${esc(errText(e))}</p>`;
    } finally { list.classList.remove('loading'); }
  }

  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const p = promos.find((x) => x.id === b.dataset.id);
    if (!p) return;
    if (b.dataset.act === 'edit') { fill(p); return; }
    b.disabled = true;
    try {
      if (b.dataset.act === 'toggle') {
        await store.save({ ...p, active: !p.active });
        toast(p.active ? 'Sconto disattivato' : 'Sconto attivato ★');
      } else if (b.dataset.act === 'del') {
        if (!confirm(`Eliminare lo sconto ${off(p)}${p.label ? ` "${p.label}"` : ''}?`)) { b.disabled = false; return; }
        await store.remove(p);
        if (editing === p.id) reset();
        toast('Sconto eliminato');
      }
    } catch (x) { toast(errText(x), true); }
    load();
  });

  /* ---------- Modulo ---------- */
  const err = $('.ev-error', form);
  const kind = () => form.elements.kind.value || 'percent';

  function example() {
    const amount = parseFloat(String(form.elements.amount.value).replace(',', '.'));
    const plans = $$('input[name="plans"]:checked', form).map((i) => i.value);
    const out = $('#p-example');
    if (!(amount > 0) || !plans.length) { out.textContent = ''; return; }
    const p = { kind: kind(), amount };
    out.textContent = 'Esempio: ' + plans.map((k) => `${PLANS[k].name} ${euro(PLANS[k].price)} → ${euro(discounted(PLANS[k].price, p))}`).join(' · ');
  }
  form.addEventListener('input', example);
  form.addEventListener('change', () => {
    form.elements.amount.max = kind() === 'percent' ? '99' : '99999';
    example();
  });

  function fill(p) {
    editing = p.id;
    form.elements.label.value = p.label || '';
    form.elements.amount.value = +p.amount;
    $$('input[name="kind"]', form).forEach((i) => { i.checked = i.value === p.kind; });
    form.elements.starts.value = p.starts_on;
    form.elements.ends.value = p.ends_on;
    $$('input[name="plans"]', form).forEach((i) => { i.checked = (p.plans || []).includes(i.value); });
    form.elements.active.checked = p.active !== false;
    $('#p-title').textContent = 'Modifica sconto';
    $('#p-save').textContent = 'Salva modifiche';
    $('#p-reset').hidden = false;
    err.textContent = '';
    example();
    render();
    form.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    form.elements.amount.focus({ preventScroll: true });
  }

  function reset() {
    editing = null;
    form.reset();
    const t = new Date();
    form.elements.starts.value = isoDay(t);
    t.setDate(t.getDate() + 7);
    form.elements.ends.value = isoDay(t);
    $('#p-title').textContent = 'Nuovo sconto';
    $('#p-save').textContent = 'Salva sconto';
    $('#p-reset').hidden = true;
    err.textContent = '';
    example();
    render();
  }
  $('#p-reset').addEventListener('click', reset);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = form.elements;
    const amount = parseFloat(String(f.amount.value).replace(',', '.'));
    const plans = $$('input[name="plans"]:checked', form).map((i) => i.value);
    err.textContent = '';
    if (!(amount > 0)) { err.textContent = 'Inserisci lo sconto (un numero maggiore di 0)'; f.amount.focus(); return; }
    if (kind() === 'percent' && amount >= 100) { err.textContent = 'Uno sconto in percentuale deve essere sotto il 100%'; f.amount.focus(); return; }
    if (!f.starts.value || !f.ends.value) { err.textContent = 'Scegli il primo e l\'ultimo giorno'; (f.starts.value ? f.ends : f.starts).focus(); return; }
    if (f.ends.value < f.starts.value) { err.textContent = 'L\'ultimo giorno viene prima del primo'; f.ends.focus(); return; }
    if (!plans.length) { err.textContent = 'Scegli almeno un pacchetto'; return; }
    const row = {
      label: f.label.value.trim() || null,
      kind: kind(),
      amount: Math.round(amount * 100) / 100,
      starts_on: f.starts.value,
      ends_on: f.ends.value,
      plans,
      active: f.active.checked
    };
    if (editing) row.id = editing;
    const btn = $('#p-save');
    btn.disabled = true;
    try {
      await store.save(row);
      toast(editing ? 'Sconto aggiornato' : 'Sconto salvato ★');
      reset();
      load();
    } catch (x) {
      console.warn(x);
      err.textContent = errText(x);
    } finally { btn.disabled = false; }
  });

  /* ---------- Prezzi ---------- */
  const prForm = $('#pr-form');
  const prErr = $('.ev-error', prForm);
  const prState = $('.pr-state', prForm);
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? Math.round(n * 100) / 100 : null; };

  function fillPrices() {
    Object.entries(PRICES).forEach(([key, v]) => {
      const inp = prForm.elements[key];
      if (inp) inp.value = v.price ?? '';
      const suf = prForm.elements[`${key}__suffix`];
      if (suf) suf.value = v.suffix || '';
    });
    prState.textContent = '';
  }

  async function loadPrices() {
    if (!priceStore) return;
    prForm.classList.add('loading');
    try {
      (await priceStore.list()).forEach((r) => {
        if (PRICES[r.key]) PRICES[r.key] = { price: r.price == null ? null : +r.price, suffix: r.suffix || '' };
      });
      prErr.textContent = '';
    } catch (e) {
      console.warn(e);
      prErr.textContent = errText(e);
    } finally {
      prForm.classList.remove('loading');
      fillPrices();
      example();
    }
  }

  prForm.addEventListener('input', () => { prState.textContent = 'Modifiche non salvate'; });
  prForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    prErr.textContent = '';
    const rows = [];
    for (const key of Object.keys(PRICES)) {
      const inp = prForm.elements[key];
      const raw = String(inp.value).trim();
      const price = raw === '' ? null : num(raw);
      const isPlan = !key.startsWith('extra_');
      if ((raw !== '' && price == null) || (price != null && price < 0)) { prErr.textContent = 'Controlla i prezzi: solo numeri da 0 in su'; inp.focus(); return; }
      if (isPlan && price == null) { prErr.textContent = 'I prezzi dei pacchetti non possono restare vuoti'; inp.focus(); return; }
      const suf = prForm.elements[`${key}__suffix`];
      rows.push({ key, price, suffix: suf ? suf.value.trim() || null : null });
    }
    const btn = $('#pr-save');
    btn.disabled = true;
    try {
      await priceStore.save(rows);
      rows.forEach((r) => { PRICES[r.key] = { price: r.price, suffix: r.suffix || '' }; });
      prState.textContent = 'Salvati ★';
      toast('Prezzi salvati ★');
      example();
    } catch (x) {
      console.warn(x);
      prErr.textContent = errText(x);
    } finally { btn.disabled = false; }
  });

  /* ---------- Avvio ---------- */
  function init(detail) {
    const { sb, toast: t } = detail || {};
    if (t) toast = t;
    store = sb ? RemoteStore(sb) : LocalStore;
    priceStore = sb ? PriceRemote(sb) : PriceLocal;
    $('#p-preview').href = sb ? 'listino.html' : 'listino.html?demo';
    loaded = false;
    reset();
    fillPrices();
    if (!$('#tab-promo').hidden) { load(); loadPrices(); }
  }
  window.addEventListener('ro-admin-tab', (e) => { if (e.detail === 'promo' && store && !loaded) { load(); loadPrices(); } });
  window.addEventListener('ro-admin-ready', (e) => init(e.detail));
  if (window.RO_ADMIN) init(window.RO_ADMIN);
  window.addEventListener('ro-admin-logout', () => { promos = []; loaded = false; list.innerHTML = ''; });
})();
