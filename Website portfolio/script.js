/* =====================================================================
   RedOrHen — interazioni e animazioni
   Vanilla JS + GSAP/ScrollTrigger + Lenis (da CDN)
   ===================================================================== */
(() => {
  'use strict';

  window.__ro = true; // segnala allo script nel <head> che il JS è partito

  const root = document.documentElement;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasGSAP) root.classList.remove('motion');
  const motion = root.classList.contains('motion');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const page = document.body.dataset.page || '';
  let WORKS = window.WORKS || [];
  const SITE = window.SITE || {};

  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* storage non disponibile */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* storage non disponibile */ } }
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------------------------------------------------------
     Segnaposto: immagini SVG generate per le foto non ancora caricate
     --------------------------------------------------------------- */
  const PH_COLORS = ['255,106,26', '255,181,71', '184,58,18', '214,90,48'];
  function placeholder(label, sub, i = 0, w = 800, h = 1120) {
    const c = PH_COLORS[i % PH_COLORS.length];
    let s = (i + 7) * 9301;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    let blocks = '';
    for (let k = 0; k < 30; k++) {
      const x = Math.floor(rnd() * (w / 40)) * 40;
      const y = Math.floor(rnd() * (h / 40)) * 40;
      blocks += `<rect x="${x}" y="${y}" width="40" height="40" fill="rgb(${c})" fill-opacity="${(0.05 + rnd() * 0.2).toFixed(2)}"/>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="rgb(${c})" stop-opacity=".55"/><stop offset="1" stop-color="#120B07"/></linearGradient></defs>` +
      `<rect width="${w}" height="${h}" fill="#1E140D"/><rect width="${w}" height="${h}" fill="url(#g)"/>${blocks}` +
      (label ? `<rect x="56" y="${h - 240}" width="24" height="24" fill="#FF6A1A"/>` +
      `<text x="56" y="${h - 160}" font-family="monospace" font-size="34" font-weight="700" fill="#F6E7D3" letter-spacing="4">${esc(label.toUpperCase())}</text>` +
      `<text x="56" y="${h - 114}" font-family="monospace" font-size="22" fill="#F6E7D3" fill-opacity=".6" letter-spacing="4">${esc(sub.toUpperCase())}</text>` : '') + '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------------------------------------------------------------
     Set di foto: da Supabase (gestiti dall'area admin) oppure da works.js
     --------------------------------------------------------------- */
  const DB = window.ADMIN_CONFIG || {};
  const GALLERY_DEMO_KEY = 'ro-gallery-demo';
  const publicUrl = (path) => (/^(https?:|data:)/.test(path)
    ? path
    : `${DB.supabaseUrl}/storage/v1/object/public/gallery/${String(path).split('/').map(encodeURIComponent).join('/')}`);
  const rowToWork = (r) => ({
    character: r.character || '', series: r.series || '', category: r.category || '',
    cosplayer: r.cosplayer || '', featured: !!r.featured, published: r.published !== false,
    fair: r.fair || '', year: r.year || null,
    // src = originale in piena qualità; thumb = anteprima leggera per griglia e miniature
    photos: (r.photos || []).map((p) => ({ src: p.src || publicUrl(p.path), thumb: p.thumb ? publicUrl(p.thumb) : undefined, w: p.w, h: p.h, alt: p.alt, hero: !!p.hero, contact: !!p.contact, story: !!p.story, rule: !!p.rule }))
  });

  async function loadRemoteWorks() {
    // Anteprima della modalità demo dell'area admin: lavori.html?demo
    if (new URLSearchParams(location.search).has('demo')) {
      try {
        const d = JSON.parse(localStorage.getItem(GALLERY_DEMO_KEY));
        if (Array.isArray(d) && d.length) {
          const sets = d.map(rowToWork).filter((w) => w.photos.length);
          if (sets.length) return sets;
        }
      } catch (e) { /* nessuna anteprima */ }
    }
    if (!DB.supabaseUrl || !DB.supabaseAnonKey) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    try {
      const headers = { apikey: DB.supabaseAnonKey };
      if (DB.supabaseAnonKey.startsWith('eyJ')) headers.Authorization = `Bearer ${DB.supabaseAnonKey}`;
      const url = (cols) => `${DB.supabaseUrl}/rest/v1/gallery_sets?select=${cols}&order=position.asc,created_at.asc`;
      const base = 'character,series,category,cosplayer,featured,published,photos';
      let res = await fetch(url(`${base},fair,year`), { headers, signal: ctrl.signal });
      // database senza i campi Anno e Fiera (supabase/anno-fiera.sql non ancora eseguito): si leggono i set senza
      if (res.status === 400) res = await fetch(url(base), { headers, signal: ctrl.signal });
      if (!res.ok) return null;
      const sets = (await res.json()).map(rowToWork).filter((w) => w.photos.length);
      return sets.length ? sets : null;
    } catch (e) {
      return null; // offline o Supabase non raggiungibile: si usa works.js
    } finally { clearTimeout(timer); }
  }

  // Ogni voce di WORKS è un set (una "cartella") di foto: la prima è la copertina.
  const PH_RATIOS = [[800, 1120], [800, 1000], [800, 1200], [1120, 800]];
  const normalizeWorks = () => WORKS.forEach((w, i) => {
    w.index = i;
    let photos = Array.isArray(w.photos) ? w.photos.filter((p) => p && p.src) : [];
    if (!photos.length && w.src) photos = [{ src: w.src, w: w.w, h: w.h, alt: w.alt }];
    w.placeholder = !photos.length;
    if (w.placeholder) {
      const n = w.count || 4;
      photos = Array.from({ length: n }, (_, k) => {
        const [pw, ph] = k === 0 ? [w.w || 800, w.h || 1120] : PH_RATIOS[(i + k) % PH_RATIOS.length];
        return { src: placeholder('', '', i + k, pw, ph), w: pw, h: ph, placeholder: true };
      });
    }
    photos.forEach((p, k) => {
      p.w = p.w || 800;
      p.h = p.h || 1120;
      if (!p.alt) p.alt = p.placeholder ? 'Segnaposto: foto in arrivo' : `${w.character} — ${w.series}, foto ${k + 1}`;
    });
    w.photos = photos;
    // La copertina rappresenta il set nella griglia e nella pellicola della Home
    Object.assign(w, { src: photos[0].thumb || photos[0].src, w: photos[0].w, h: photos[0].h, alt: photos[0].alt });
  });

  // <img data-ph="Titolo|Sottotitolo" data-ph-i="2"> nell'HTML
  $$('img[data-ph]').forEach((img) => {
    const [a, b = ''] = img.dataset.ph.split('|');
    const w = +img.getAttribute('width') || 800;
    const h = +img.getAttribute('height') || 1000;
    img.src = placeholder(a, b, +(img.dataset.phI || 0), w, h);
  });

  /* ---------------------------------------------------------------
     Pixel reveal: l'immagine passa da pixel grezzi a nitida
     --------------------------------------------------------------- */
  const pixel = (() => {
    const STEPS = [64, 44, 30, 20, 14, 9, 6, 3];
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { io.unobserve(e.target); run(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.02 }) : null;

    function cover(ctx, img, w, h) {
      const nw = img.naturalWidth, nh = img.naturalHeight;
      const ir = nw / nh, r = w / h;
      let sx = 0, sy = 0, sw = nw, sh = nh;
      if (ir > r) { sw = nh * r; sx = (nw - sw) / 2; } else { sh = nw / r; sy = (nh - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    }

    async function run(el) {
      const img = $('img', el);
      if (!motion || !img) { el.classList.add('px-done'); return; }
      el.classList.remove('px-done');
      if (el._pxTimer) clearTimeout(el._pxTimer);
      try {
        // Limiti di tempo: in alcuni casi (scheda in secondo piano) load/decode non rispondono mai
        // e la foto resterebbe invisibile per sempre.
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        if (!img.complete) await Promise.race([new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); }), wait(6000)]);
        if (img.decode) await Promise.race([img.decode().catch(() => {}), wait(800)]);
      } catch (e) { /* mostra comunque */ }
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h || !img.naturalWidth) { el.classList.add('px-done'); return; }
      let c = $('.px-canvas', el);
      if (!c) { c = document.createElement('canvas'); c.className = 'px-canvas'; c.setAttribute('aria-hidden', 'true'); el.appendChild(c); }
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      const ctx = c.getContext('2d');
      const tmp = document.createElement('canvas');
      const tctx = tmp.getContext('2d');
      const steps = innerWidth < 760 ? STEPS.filter((_, i) => i % 2 === 0) : STEPS;
      let i = 0;
      const tick = () => {
        if (i >= steps.length) {
          el.classList.add('px-done');
          return;
        }
        const s = steps[i++] * dpr;
        tmp.width = Math.max(1, Math.ceil(c.width / s));
        tmp.height = Math.max(1, Math.ceil(c.height / s));
        cover(tctx, img, tmp.width, tmp.height);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(tmp, 0, 0, c.width, c.height);
        el._pxTimer = setTimeout(tick, 75);
      };
      tick();
    }

    return {
      observe(el) { if (!motion || !io) { el.classList.add('px-done'); return; } io.observe(el); },
      run
    };
  })();

  /* ---------------------------------------------------------------
     Smooth scroll (Lenis)
     --------------------------------------------------------------- */
  let lenis = null;
  if (motion && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = (y) => (lenis ? lenis.scrollTo(y, { duration: 1.6 }) : window.scrollTo({ top: y, behavior: motion ? 'smooth' : 'auto' }));
  const lockScroll = (on) => {
    if (lenis) on ? lenis.stop() : lenis.start();
    document.body.style.overflow = on ? 'hidden' : '';
  };

  /* ---------------------------------------------------------------
     Header, menu, barra XP, link attivo, dati del sito
     --------------------------------------------------------------- */
  $$(`[data-page-link="${page}"]`).forEach((a) => a.setAttribute('aria-current', 'page'));

  const header = $('.site-header');
  const xp = $('.xp span');
  let lastY = 0;
  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (xp) xp.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (header) {
      header.classList.toggle('is-scrolled', y > 40);
      const menuOpen = $('.menu-toggle')?.getAttribute('aria-expanded') === 'true';
      header.classList.toggle('is-hidden', !menuOpen && y > lastY && y > 160);
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggle = $('.menu-toggle');
  const menu = $('#menu');
  if (toggle && menu) {
    const setMenu = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Chiudi' : 'Menu';
      menu.hidden = !open;
      lockScroll(open);
      if (open && motion) gsap.from($$('a', menu), { yPercent: 60, opacity: 0, duration: .7, ease: 'expo.out', stagger: .06 });
      if (open) $('a', menu)?.focus();
    };
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });
  }

  $$('[data-site]').forEach((el) => {
    const key = el.dataset.site;
    const val = SITE[key];
    if (!val) { (el.closest('li') || el).hidden = true; return; }
    if (key === 'email') el.href = `mailto:${val}`;
    else el.href = val;
  });

  $$('.to-top').forEach((b) => b.addEventListener('click', () => scrollTo(0)));

  /* ---------------------------------------------------------------
     Cursore custom + bottoni magnetici
     --------------------------------------------------------------- */
  if (motion && finePointer) {
    root.classList.add('has-cursor');
    const cur = document.createElement('div');
    cur.className = 'cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<span class="cursor-dot"></span><span class="cursor-label"></span>';
    document.body.appendChild(cur);
    const label = $('.cursor-label', cur);
    const xTo = gsap.quickTo(cur, 'x', { duration: .22, ease: 'power3' });
    const yTo = gsap.quickTo(cur, 'y', { duration: .22, ease: 'power3' });
    window.addEventListener('mousemove', (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    // Sopra testi o sfondi arancioni il cursore (anche lui arancione) sparirebbe: lì diventa nero
    const EMBER = 'rgb(255, 106, 26)';
    const overEmber = (el) => {
      if (!(el instanceof Element)) return false;
      if (getComputedStyle(el).color === EMBER) return true;
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && bg !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(bg)) return bg === EMBER;
      }
      return false;
    };
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('[data-cursor], a, button, summary, label, input, select, textarea');
      const lab = t?.closest('[data-cursor]')?.dataset.cursor;
      cur.classList.toggle('has-label', !!lab);
      if (lab) label.textContent = lab;
      cur.classList.toggle('is-link', !!t && !lab);
      cur.classList.toggle('on-ember', overEmber(e.target));
    });
    document.addEventListener('mouseleave', () => gsap.to(cur, { opacity: 0, duration: .2 }));
    document.addEventListener('mouseenter', () => gsap.to(cur, { opacity: 1, duration: .2 }));

    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .22, y: (e.clientY - r.top - r.height / 2) * .32, duration: .4, ease: 'power3.out' });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1, .4)' }));
    });
  }

  /* ---------------------------------------------------------------
     Testo cinetico: divisione in lettere
     --------------------------------------------------------------- */
  function splitChars(el) {
    if (el._split) return el._split;
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', text);
    el.textContent = '';
    const chars = [];
    text.split(' ').forEach((word, wi, arr) => {
      const w = document.createElement('span');
      w.className = 'w';
      w.setAttribute('aria-hidden', 'true');
      [...word].forEach((ch) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = ch;
        w.appendChild(s);
        chars.push(s);
      });
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el._split = chars;
    return chars;
  }

  function animateChars(els, opts = {}) {
    const chars = els.flatMap((el) => splitChars(el));
    gsap.set(chars, { yPercent: 115 });
    gsap.set(els, { visibility: 'visible' });
    return gsap.to(chars, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: .025, ...opts });
  }

  /* ---------------------------------------------------------------
     Transizioni di pagina (wipe a blocchi pixel)
     --------------------------------------------------------------- */
  const wipe = $('.wipe');
  function buildWipe() {
    if (!wipe) return [];
    const cols = innerWidth < 760 ? 6 : 12;
    const size = innerWidth / cols;
    const rows = Math.ceil(innerHeight / size);
    wipe.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    wipe.style.gridTemplateRows = `repeat(${rows}, ${size}px)`;
    wipe.innerHTML = '<i></i>'.repeat(cols * rows);
    return $$('i', wipe);
  }

  function wipeIn() {
    return new Promise((res) => {
      if (!motion || !wipe || !root.classList.contains('wiping')) { root.classList.remove('wiping'); return res(); }
      const sq = buildWipe();
      gsap.set(sq, { scale: 1.02 });
      root.classList.remove('wiping');
      store.del('ro-wipe');
      gsap.to(sq, { scale: 0, duration: .45, ease: 'power2.in', stagger: { each: .008, from: 'random' }, onComplete: res });
    });
  }

  // Protezione delle foto: niente menu "Salva immagine", trascinamento o pressione lunga.
  // È un deterrente: chi sa usare gli strumenti del browser o fa uno screenshot può comunque copiarle.
  (function protectPhotos() {
    const PHOTO = 'img, .px, .lb-media, .work, .reel-frame, .hero-photo, .story-frame, .lightbox';
    let note = null, noteTimer = null;
    const notice = (x, y) => {
      if (!note) {
        note = document.createElement('div');
        note.className = 'copy-note pixel';
        note.setAttribute('role', 'status');
        note.textContent = '© RedOrHen — foto protette';
        document.body.appendChild(note);
      }
      note.style.left = `${Math.min(x, innerWidth - 240)}px`;
      note.style.top = `${Math.max(12, y - 44)}px`;
      note.classList.add('is-on');
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => note.classList.remove('is-on'), 1600);
    };
    document.addEventListener('contextmenu', (e) => {
      if (!e.target.closest(PHOTO)) return;
      e.preventDefault();
      notice(e.clientX, e.clientY);
    });
    document.addEventListener('dragstart', (e) => { if (e.target.closest(PHOTO)) e.preventDefault(); });
    $$('img').forEach((img) => img.setAttribute('draggable', 'false'));
  })();

  // Vai a una pagina del sito con la transizione a blocchi pixel (se attiva)
  function goTo(href) {
    if (!motion || !wipe) { location.href = href; return; }
    store.set('ro-wipe', '1');
    const sq = buildWipe();
    gsap.fromTo(sq, { scale: 0 }, {
      scale: 1.02, duration: .38, ease: 'power2.out', stagger: { each: .008, from: 'random' },
      onComplete: () => { location.href = href; }
    });
  }

  // Accesso nascosto all'area admin: tre clic rapidi sul logo REDORHEN in alto.
  // Un clic singolo funziona come sempre (torna alla Home), con un breve ritardo
  // per capire se arrivano altri clic.
  (function secretAdmin() {
    const brand = $('.site-header .brand');
    if (!brand) return;
    let clicks = 0, timer = null;
    brand.style.touchAction = 'manipulation'; // evita lo zoom col doppio tocco su mobile
    brand.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      clicks++;
      clearTimeout(timer);
      if (clicks >= 3) {
        clicks = 0;
        location.href = 'admin.html';
        return;
      }
      timer = setTimeout(() => {
        clicks = 0;
        if (page === 'home') scrollTo(0); else goTo(brand.href);
      }, 380);
    });
  })();

  if (motion && wipe) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html$/.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      goTo(url.href);
    });
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) { $$('i', wipe).forEach((i) => gsap.set(i, { scale: 0 })); store.del('ro-wipe'); }
    });
  }

  /* ---------------------------------------------------------------
     Animazioni comuni
     --------------------------------------------------------------- */
  function commonReveals() {
    // Titoli di sezione
    $$('[data-chars]').forEach((el) => {
      if (el.closest('[data-intro-scope]')) return;
      animateChars([el], { scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    // Blocchi generici
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .08, overwrite: true })
    });
  }

  function staticReveals() {
    $$('[data-chars], [data-reveal], [data-intro]').forEach((el) => { el.style.visibility = 'visible'; el.style.opacity = 1; el.style.transform = 'none'; });
  }

  /* ---------------------------------------------------------------
     HOME
     --------------------------------------------------------------- */
  function buildReel() {
    const track = $('.reel-track');
    if (!track) return;
    const items = WORKS.filter((w) => w.featured).slice(0, 6);
    const html = items.map((w, i) => `
      <a class="reel-frame" href="lavori.html" data-cursor="Apri">
        <div class="px"><img src="${esc(w.src)}" alt="${esc(w.alt)}" width="${w.w}" height="${w.h}" loading="lazy" decoding="async"></div>
        <div class="reel-cap pixel"><span>#${String(i + 1).padStart(2, '0')} — ${esc(w.character)}</span><span class="muted">${esc(w.series)}</span></div>
      </a>`).join('');
    track.insertAdjacentHTML('afterbegin', html);
  }

  // Titoli di testa della Home: partono subito, senza aspettare i lavori da Supabase,
  // così titolo e foto sono visibili entro il primo secondo.
  function heroIntro() {
    if (!motion) return;
    const heroPx = $('.hero-photo .px');
    wipeDone.then(() => {
      const tl = gsap.timeline();
      tl.add(animateChars($$('.hero [data-chars]'), { stagger: .025, duration: 1 }), 0);
      if (heroPx) {
        // la comparsa a pixel parte quando è pronta la foto scelta nell'area admin
        tl.add(() => { heroReady.then(() => pixel.run(heroPx)); }, 0);
        tl.fromTo(heroPx, { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'power2.out' }, 0);
      }
      tl.fromTo($$('.hero [data-intro]'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .9, ease: 'expo.out', stagger: .08 }, .3);
    });
    // Barre letterbox che si ritirano + parallax
    gsap.to('.hero-bar', { scaleY: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '40% top', scrub: true } });
    gsap.to('.hero-photo', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-content', { yPercent: 18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });
  }

  // Foto scelte nell'area admin con l'interruttore Storia o Regole (al massimo n, nell'ordine dei set)
  const flagged = (flag, n) => WORKS.flatMap((w) => w.photos.filter((p) => p[flag]).map((p) => ({ w, p }))).slice(0, n);

  // Foto della storia (desktop e telefono): prima quelle scelte nell'area admin (Storia);
  // i capitoli rimasti usano i primi set, con un set "Ivy" al primo capitolo
  function fillStory() {
    const real = WORKS.filter((w) => !w.placeholder);
    if (!real.length) return;
    const chosen = flagged('story', 3);
    if (chosen.length) {
      const fill = real.map((w) => ({ w, p: w.photos[0] })).filter((c) => !chosen.some((x) => x.p === c.p));
      chosen.concat(fill).slice(0, 3).forEach(({ w, p }, i) => {
        $$(`img[data-story="${i}"]`).forEach((img) => {
          img.src = p.thumb || p.src;
          img.width = p.w; img.height = p.h;
          img.alt = p.alt || `${w.character}${w.series ? ' — ' + w.series : ''}`;
          img.removeAttribute('data-ph');
        });
      });
      return;
    }
    const pick = [];
    const ivy = real.find((w) => /ivy/i.test(`${w.character} ${w.series}`));
    if (ivy) pick.push(ivy);
    real.forEach((w) => { if (pick.length < 3 && !pick.includes(w)) pick.push(w); });
    // Con meno di 3 set si usano anche le altre foto dello stesso set
    const photos = pick.map((w) => ({ w, p: w.photos[0] }));
    for (let k = 1; photos.length < 3 && k < 12; k++) {
      pick.forEach((w) => { if (photos.length < 3 && w.photos[k]) photos.push({ w, p: w.photos[k] }); });
    }
    photos.forEach(({ w, p }, i) => {
      $$(`img[data-story="${i}"]`).forEach((img) => {
        img.src = p.thumb || p.src;
        img.width = p.w; img.height = p.h;
        img.alt = p.alt || `${w.character}${w.series ? ' — ' + w.series : ''}`;
        img.removeAttribute('data-ph');
      });
    });
  }

  // Foto dei tre pilastri: prima i set non già mostrati nella storia o nella pellicola
  function fillPillars() {
    const imgs = $$('img[data-pillar]');
    const real = WORKS.filter((w) => !w.placeholder);
    if (!imgs.length || !real.length) return;
    const shown = new Set($$('img[data-story], .reel-frame img').map((i) => i.getAttribute('src')));
    const isShown = (w) => shown.has(w.photos[0].thumb || w.photos[0].src);
    const pool = real.filter((w) => !isShown(w)).concat(real.filter(isShown));
    // prima le foto scelte nell'area admin (Regole), poi le copertine dei set non ancora mostrati
    const chosen = flagged('rule', imgs.length);
    const rest = pool.map((w) => ({ w, p: w.photos[0] })).filter((c) => !chosen.some((x) => x.p === c.p));
    const list = chosen.concat(rest);
    imgs.forEach((img, i) => {
      const { w, p } = list[i % list.length];
      img.src = p.thumb || p.src;
      img.width = p.w; img.height = p.h;
      img.alt = p.alt || `${w.character}${w.series ? ' — ' + w.series : ''}`;
      const fig = img.closest('figure');
      if (fig) fig.style.setProperty('--ar', String(p.w / p.h));
    });
  }

  function home() {
    buildReel();
    fillStory();
    fillPillars();

    // Countdown arcade nella CTA finale: parte quando il finale è sullo schermo, scende da 10 a 0
    // una volta sola e a zero diventa il pulsante per prenotare (senza animazioni il pulsante c'è subito)
    const cd = $('.countdown-n');
    const cdBox = $('.countdown');
    const cdGo = $('.countdown-go');
    const showGo = () => {
      if (cdBox) cdBox.hidden = true;
      if (!cdGo) return;
      cdGo.hidden = false;
      if (motion) gsap.fromTo(cdGo, { scale: .6, opacity: 0 }, { scale: 1, opacity: 1, duration: .5, ease: 'back.out(3)' });
    };
    if (cd && cdGo && motion && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((en) => en.isIntersecting)) return;
        io.disconnect();
        let n = 10;
        const t = setInterval(() => {
          n -= 1;
          cd.textContent = n;
          if (n <= 0) { clearInterval(t); setTimeout(showGo, 400); }
        }, 1000);
      }, { threshold: .6 });
      io.observe(cdBox);
    } else showGo();

    if (!motion) return;

    // Contatori arcade
    $$('[data-count]').forEach((el) => {
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || '';
      const o = { v: 0 };
      el.textContent = `0${suffix}`;
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, {
          v: target, duration: 1.8, ease: 'power2.out', snap: { v: 1 },
          onUpdate: () => { el.textContent = `${o.v}${suffix}`; },
          onComplete: () => gsap.fromTo(el, { scale: 1.12 }, { scale: 1, duration: .5, ease: 'back.out(3)' })
        })
      });
    });
    $$('[data-glitch]').forEach((el) => {
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        // repeat pari: con yoyo l'ultimo giro finisce "acceso" (con un numero dispari restava invisibile)
        onEnter: () => gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: .08, repeat: 6, yoyo: true, ease: 'steps(1)', onComplete: () => gsap.set(el, { opacity: 1 }) })
      });
    });

    // Missione: le parole si accendono con lo scroll
    const mission = $('.mission-text');
    if (mission) {
      const words = [];
      const walk = (node) => {
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              const s = document.createElement('span');
              s.className = 'mw';
              s.textContent = part;
              frag.appendChild(s);
              words.push(s);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1) walk(n);
        });
      };
      walk(mission);
      gsap.fromTo(words, { opacity: .12 }, {
        opacity: 1, ease: 'none', stagger: .1,
        scrollTrigger: { trigger: mission, start: 'top 78%', end: 'bottom 40%', scrub: true }
      });
    }

    // Pilastri: barre statistiche
    $$('.pillar').forEach((p) => {
      const segs = $$('.statbar-segs i', p);
      ScrollTrigger.create({
        trigger: p, start: 'top 80%', once: true,
        onEnter: () => segs.forEach((s, i) => setTimeout(() => s.classList.add('on'), 200 + i * 70))
      });
    });

    // Quest: spunte
    $$('.quest').forEach((q, i) => {
      ScrollTrigger.create({ trigger: q, start: 'top 75%', once: true, onEnter: () => setTimeout(() => q.classList.add('is-done'), i * 180) });
    });

    // Storia: scena a fotogrammi che cambia con i capitoli
    const frames = $$('.story-frame');
    const chapters = $$('.chapter');
    const lvl = $('.story-level');
    let current = -1;
    const setFrame = (i) => {
      if (i === current) return;
      current = i;
      frames.forEach((f, k) => f.classList.toggle('is-active', k === i));
      chapters.forEach((c, k) => c.classList.toggle('is-active', k === i));
      const ch = chapters[i];
      if (lvl && ch) lvl.textContent = ch.dataset.level;
      const px = $('.px', frames[i]);
      if (px) pixel.run(px);
    };
    chapters.forEach((ch, i) => {
      ScrollTrigger.create({ trigger: ch, start: 'top 60%', end: 'bottom 60%', onToggle: (self) => self.isActive && setFrame(i) });
    });
    if (frames.length) {
      ScrollTrigger.create({ trigger: '.story', start: 'top 80%', once: true, onEnter: () => { if (current < 0) setFrame(0); } });
    }

    // Pellicola orizzontale (desktop)
    const reel = $('.reel');
    const track = $('.reel-track');
    if (reel && track) {
      const mm = gsap.matchMedia();
      mm.add('(min-width: 900px)', () => {
        reel.classList.add('is-pinned');
        const dist = () => Math.max(0, track.scrollWidth - innerWidth);
        gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: reel, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
        });
        return () => reel.classList.remove('is-pinned');
      });
    }
  }

  /* ---------------------------------------------------------------
     LAVORI: galleria, filtri, lightbox
     --------------------------------------------------------------- */
  function lavori() {
    const grid = $('.gallery');
    const bar = $('.filters');
    if (!grid) return;

    const nFoto = (n) => `${n} foto`;
    grid.innerHTML = WORKS.map((w) => `
      <button class="work${w.photos.length > 1 ? ' work--set' : ''}" type="button" data-i="${w.index}" data-cat="${esc(w.category)}" data-fair="${esc(w.fair || '')}" data-cursor="Apri set" aria-label="Apri il set ${esc(w.character)}${w.series ? ', ' + esc(w.series) : ''}: ${nFoto(w.photos.length)}">
        <span class="work-stack">
          <span class="px" style="aspect-ratio:${w.w}/${w.h}"><img src="${esc(w.src)}" alt="${esc(w.alt)}" width="${w.w}" height="${w.h}" loading="lazy" decoding="async"></span>
          <span class="work-count pixel" aria-hidden="true"><i></i>${nFoto(w.photos.length)}</span>
        </span>
        <span class="work-cap pixel"><span>${esc(w.character)}</span><span class="muted">${esc(w.series)}</span>${w.fair || w.year ? `<span class="ember">${esc([w.fair, w.year].filter(Boolean).join(' '))}</span>` : ''}</span>
      </button>`).join('');

    const counter = $('.scene-count');
    const cats = [...new Set(WORKS.map((w) => w.category).filter(Boolean))];
    const count = (c) => WORKS.filter((w) => !c || w.category === c).length;
    if (bar) {
      bar.innerHTML = [`<button class="filter" type="button" data-filter="" aria-pressed="true">Tutti<sup>${count()}</sup></button>`]
        .concat(cats.map((c) => `<button class="filter" type="button" data-filter="${esc(c)}" aria-pressed="false">${esc(c)}<sup>${count(c)}</sup></button>`)).join('');
    }
    // Filtro per fiera: per vedere gli scatti fatti in una fiera (tutte le edizioni)
    const fairBar = $('.filters--fair');
    const fairs = [...new Set(WORKS.map((w) => w.fair).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
    const fairCount = (f) => WORKS.filter((w) => w.fair === f).length;
    if (fairBar) {
      fairBar.hidden = !fairs.length;
      fairBar.innerHTML = `<span class="filters-label pixel" aria-hidden="true">Fiera</span>` +
        [`<button class="filter" type="button" data-fair="" aria-pressed="true">Tutte</button>`]
          .concat(fairs.map((f) => `<button class="filter" type="button" data-fair="${esc(f)}" aria-pressed="false">${esc(f)}<sup>${fairCount(f)}</sup></button>`)).join('');
    }

    const items = $$('.work', grid);
    items.forEach((it) => pixel.observe($('.px', it)));
    const visible = () => items.filter((it) => !it.hidden);
    const setCount = () => { if (counter) counter.textContent = String(visible().length); };
    setCount();

    let cat = '', fair = '';
    const onFilter = (group, e) => {
      const b = e.target.closest('.filter');
      if (!b) return;
      $$('.filter', group).forEach((f) => f.setAttribute('aria-pressed', String(f === b)));
      if (group === fairBar) fair = b.dataset.fair; else cat = b.dataset.filter;
      const apply = () => {
        items.forEach((it) => { it.hidden = (!!cat && it.dataset.cat !== cat) || (!!fair && it.dataset.fair !== fair); });
        const empty = $('.gallery-empty');
        if (empty) empty.hidden = visible().length > 0;
        setCount();
        if (hasGSAP) ScrollTrigger.refresh();
        if (motion) gsap.fromTo(visible(), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .8, ease: 'expo.out', stagger: .04 });
      };
      if (motion) gsap.to(items, { opacity: 0, duration: .2, onComplete: apply }); else apply();
    };
    bar?.addEventListener('click', (e) => onFilter(bar, e));
    fairBar?.addEventListener('click', (e) => onFilter(fairBar, e));

    // Carosello del set
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Set di foto');
    lb.innerHTML = `
      <div class="lb-head">
        <p class="lb-title pixel"></p>
        <span class="lb-count pixel" aria-live="polite"></span>
        <span class="lb-hint pixel" aria-hidden="true"></span>
      </div>
      <button class="lb-btn lb-close" type="button" aria-label="Chiudi">✕ Esc</button>
      <button class="lb-btn lb-full" type="button" aria-label="Schermo intero" aria-pressed="false">⤢</button>
      <button class="lb-btn lb-prev" type="button" aria-label="Foto precedente">◀</button>
      <button class="lb-btn lb-next" type="button" aria-label="Foto successiva">▶</button>
      <figure class="lb-figure">
        <div class="lb-media"><div class="px"><img alt=""></div></div>
        <div class="lb-thumbs" role="group" aria-label="Foto del set"></div>
      </figure>`;
    document.body.appendChild(lb);
    const media = $('.lb-media', lb);
    const lbPx = $('.px', lb);
    const lbImg = $('img', lb);
    const title = $('.lb-title', lb);
    const cnt = $('.lb-count', lb);
    const thumbs = $('.lb-thumbs', lb);
    let set = null, list = [], pos = 0, opener = null;

    // La foto occupa tutto lo spazio disponibile
    // Telefono: tutto lo schermo (i comandi stanno sopra la foto).
    // Desktop: tutto tranne la fascia del titolo, le frecce ai lati e le miniature.
    const fit = (p) => {
      const mobile = innerWidth <= 700;
      const vh = (window.visualViewport && window.visualViewport.height) || innerHeight;
      const maxW = mobile ? innerWidth : innerWidth - 176;
      const maxH = mobile ? vh : vh - 64 - (list.length > 1 ? 88 : 20);
      const s = Math.min(maxW / p.w, maxH / p.h);
      media.style.width = `${Math.round(p.w * s)}px`;
      media.style.height = `${Math.round(p.h * s)}px`;
      zoom.reset();
    };

    // Foto da 4000 px: si scarica solo se serve (vedi show), altrimenti basta l'anteprima da 1600 px
    let ensureFull = null;

    // Zoom: rotella e doppio clic con il mouse; due dita e doppio tocco su telefono.
    // Da ingrandita la foto si sposta trascinandola.
    const zoom = (() => {
      let s = 1, tx = 0, ty = 0, gestured = false;
      let pinch = null, pan = null, lastTap = 0, lastTapX = 0, lastTapY = 0, lastTouch = 0;
      const ptrs = new Map();
      // Da ingrandita la foto esce dalla cornice e può riempire tutto lo schermo (telefono e desktop).
      // I gesti valgono in tutto il visualizzatore, non solo sulla foto:
      // il pizzico (o la rotella) parte spesso sulla parte nera intorno.
      const surface = lb;
      const onControl = (e) => !!e.target.closest('.lb-btn, .lb-thumbs, .lb-head');
      const maxScale = () => {
        const p = list[pos];
        const w = media.offsetWidth || 1;
        return Math.max(3, Math.min(12, ((p && p.w) || w) / w * 2));
      };
      const apply = (anim) => {
        lbImg.style.transition = anim ? 'transform .35s cubic-bezier(.16, 1, .3, 1)' : 'none';
        lbImg.style.transform = s === 1 ? '' : `translate(${tx}px, ${ty}px) scale(${s})`;
        media.classList.toggle('is-zoomed', s > 1);
        if (s > 1 && ensureFull) ensureFull(); // ingrandendo serve il dettaglio della foto grande
        lb.classList.toggle('is-zoomed', s > 1); // da ingrandita spariscono tutti i comandi
        media.dataset.cursor = s > 1 ? 'Trascina' : 'Zoom';
      };
      const clamp = () => {
        const w = media.offsetWidth, h = media.offsetHeight;
        // I limiti sono i bordi dello schermo. Se la foto ingrandita è più piccola
        // dello schermo in una direzione resta centrata, altrimenti si sposta fino ai suoi bordi.
        const r = media.getBoundingClientRect();
        const W = innerWidth;
        const H = (window.visualViewport && window.visualViewport.height) || innerHeight;
        const sw = w * s, sh = h * s;
        tx = sw > W ? Math.min(-r.left, Math.max(W - r.left - sw, tx)) : (W - sw) / 2 - r.left;
        ty = sh > H ? Math.min(-r.top, Math.max(H - r.top - sh, ty)) : (H - sh) / 2 - r.top;
      };
      const zoomAt = (cx, cy, target, anim) => {
        const r = media.getBoundingClientRect();
        const ns = Math.max(1, Math.min(maxScale(), target));
        const px = cx - r.left, py = cy - r.top;
        tx = px - (px - tx) * (ns / s);
        ty = py - (py - ty) * (ns / s);
        s = ns;
        if (s <= 1.001) { s = 1; tx = 0; ty = 0; }
        clamp();
        apply(anim);
      };
      const toggleAt = (cx, cy) => zoomAt(cx, cy, s > 1 ? 1 : 2.5, true);

      surface.addEventListener('wheel', (e) => {
        if (onControl(e)) return;
        e.preventDefault();
        zoomAt(e.clientX, e.clientY, s * Math.exp(-e.deltaY * 0.0018));
      }, { passive: false });
      media.addEventListener('dblclick', (e) => {
        if (Date.now() - lastTouch < 800) return; // il doppio tocco è gestito sotto
        toggleAt(e.clientX, e.clientY);
      });
      surface.addEventListener('pointerdown', (e) => {
        if (onControl(e) || (e.pointerType === 'mouse' && s === 1)) return;
        try { surface.setPointerCapture(e.pointerId); } catch (x) { /* non indispensabile */ }
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
        if (ptrs.size === 2) {
          const [a, b] = [...ptrs.values()];
          pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
          pan = null;
          gestured = true;
        } else if (ptrs.size === 1 && s > 1) {
          pan = { x: e.clientX, y: e.clientY, tx, ty };
        }
      });
      surface.addEventListener('pointermove', (e) => {
        const pt = ptrs.get(e.pointerId);
        if (!pt) return;
        pt.x = e.clientX; pt.y = e.clientY;
        if (pinch && ptrs.size >= 2) {
          const [a, b] = [...ptrs.values()];
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          tx += mx - pinch.mx; ty += my - pinch.my;
          pinch.mx = mx; pinch.my = my;
          zoomAt(mx, my, pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d);
        } else if (pan) {
          tx = pan.tx + (e.clientX - pan.x);
          ty = pan.ty + (e.clientY - pan.y);
          clamp();
          apply(false);
        }
      });
      const end = (e) => {
        const pt = ptrs.get(e.pointerId);
        if (!pt) return;
        ptrs.delete(e.pointerId);
        if (ptrs.size < 2) pinch = null;
        if (ptrs.size === 1 && s > 1) { const [q] = [...ptrs.values()]; pan = { x: q.x, y: q.y, tx, ty }; }
        else if (!ptrs.size) pan = null;
        if (e.pointerType === 'touch') {
          lastTouch = Date.now();
          const still = Math.hypot(e.clientX - pt.sx, e.clientY - pt.sy) < 12;
          if (e.type === 'pointerup' && !ptrs.size && still && !gestured) {
            if (lastTouch - lastTap < 320 && Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 40) {
              toggleAt(e.clientX, e.clientY);
              lastTap = 0;
            } else { lastTap = lastTouch; lastTapX = e.clientX; lastTapY = e.clientY; }
          }
        }
      };
      ['pointerup', 'pointercancel'].forEach((t) => surface.addEventListener(t, end));

      return {
        reset() { s = 1; tx = 0; ty = 0; pinch = null; pan = null; ptrs.clear(); apply(false); },
        active: () => s > 1 || gestured,
        clearGesture() { gestured = false; },
        recentTouch: () => Date.now() - lastTouch < 800,
        zoomBy(f) { const r = media.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, s * f, true); }
      };
    })();
    let showToken = 0;
    const THUMB_SIDE = 1600; // lato lungo delle anteprime create dall'area admin
    const show = () => {
      const p = list[pos];
      const token = ++showToken;
      fit(p);
      // Prima l'anteprima (veloce). La foto da 4000 px si scarica solo se lo schermo ha più pixel
      // di quelli dell'anteprima (4K, Retina) o quando si ingrandisce: telefoni e schermi Full HD
      // vedono già l'anteprima nitida, e così si risparmia il traffico mensile di Supabase.
      lbImg.src = p.thumb || p.src;
      lbImg.alt = p.alt;
      media.classList.remove('is-loading');
      ensureFull = null;
      if (p.thumb && p.thumb !== p.src) {
        let started = false;
        ensureFull = () => {
          if (started) return;
          started = true;
          media.classList.add('is-loading');
          const full = new Image();
          full.decoding = 'async';
          full.onload = () => { if (token === showToken) { lbImg.src = p.src; media.classList.remove('is-loading'); } };
          full.onerror = () => { if (token === showToken) media.classList.remove('is-loading'); };
          full.src = p.src;
        };
        const thumbW = p.w * Math.min(1, THUMB_SIDE / Math.max(p.w, p.h));
        const needW = (media.offsetWidth || innerWidth) * (window.devicePixelRatio || 1);
        if (thumbW < needW * 0.95) ensureFull();
      }
      cnt.textContent = `${String(pos + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
      $$('.lb-thumb', thumbs).forEach((t, k) => {
        t.classList.toggle('is-active', k === pos);
        t.setAttribute('aria-current', String(k === pos));
        if (k === pos) t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: motion ? 'smooth' : 'auto' });
      });
      pixel.run(lbPx);
      const next = list[(pos + 1) % list.length];
      if (next && !next.placeholder) { const pre = new Image(); pre.src = next.thumb || next.src; }
    };
    const open = (i, from) => {
      set = WORKS[i];
      list = set.photos;
      pos = 0;
      opener = from;
      title.innerHTML = `<span>${esc(set.character)}</span><span class="muted">${esc(set.series)}</span>${set.fair || set.year ? `<span class="muted">${esc([set.fair, set.year].filter(Boolean).join(' '))}</span>` : ''}${set.cosplayer ? `<span class="ember">${esc(set.cosplayer)}</span>` : ''}`;
      thumbs.innerHTML = list.length > 1 ? list.map((p, k) => `
        <button class="lb-thumb" type="button" data-k="${k}" aria-label="Foto ${k + 1} di ${list.length}">
          <img src="${esc(p.thumb || p.src)}" alt="" width="${p.w}" height="${p.h}" loading="lazy" decoding="async">
        </button>`).join('') : '';
      lb.classList.toggle('is-single', list.length < 2);
      lb.hidden = false;
      lockScroll(true);
      show();
      if (motion) gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: .3 });
      $('.lb-close', lb).focus();
    };
    thumbs.addEventListener('click', (e) => {
      const t = e.target.closest('.lb-thumb');
      if (t) { pos = +t.dataset.k; show(); }
    });
    const fullBtn = $('.lb-full', lb);
    if (!lb.requestFullscreen) fullBtn.hidden = true;
    fullBtn.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else lb.requestFullscreen().catch(() => {});
    });
    document.addEventListener('fullscreenchange', () => {
      const on = document.fullscreenElement === lb;
      fullBtn.setAttribute('aria-pressed', String(on));
      fullBtn.textContent = on ? '⤡' : '⤢';
      if (!lb.hidden) fit(list[pos]);
    });
    const close = () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      lb.hidden = true;
      lockScroll(false);
      opener?.focus();
    };
    const step = (d) => { if (list.length < 2) return; pos = (pos + d + list.length) % list.length; show(); };

    grid.addEventListener('click', (e) => {
      const it = e.target.closest('.work');
      if (it) open(+it.dataset.i, it);
    });
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-prev', lb).addEventListener('click', () => step(-1));
    $('.lb-next', lb).addEventListener('click', () => step(1));
    // Tocco sullo sfondo: chiude solo col mouse (su telefono si usa Esc/✕, così doppio tocco e pizzico non chiudono)
    lb.addEventListener('click', (e) => { if (e.target === lb && !zoom.recentTouch() && !lb.classList.contains('is-zoomed')) close(); });
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') { if (lb.classList.contains('is-zoomed')) zoom.reset(); else close(); }
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === '+' || e.key === '=') zoom.zoomBy(1.5);
      if (e.key === '-') zoom.zoomBy(1 / 1.5);
      if (e.key === '0') zoom.reset();
      if (e.key === 'Tab') {
        const f = $$('button', lb);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    let sx = 0, sy = 0;
    lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      // Da ingrandita (o dopo un pizzico) lo scorrimento sposta la foto, non cambia foto
      if (zoom.active()) { if (!e.touches.length) zoom.clearGesture(); return; }
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    }, { passive: true });
    window.addEventListener('resize', () => { if (!lb.hidden) fit(list[pos]); });
  }

  /* ---------------------------------------------------------------
     CONTATTI: modulo
     --------------------------------------------------------------- */
  function contatti() {
    const form = $('#contact-form');
    if (!form) return;
    const success = $('.success');
    const status = $('.form-status');

    // dal Listino arriva ?pacchetto=lv1|lv2|lv3 (lv3 = Boss Fight per 2 persone, il prezzo "da")
    let pkg = new URLSearchParams(location.search).get('pacchetto');
    if (pkg === 'lv3') pkg = 'lv3_2';
    const sel = $('#f-pacchetto');
    if (pkg && sel && [...sel.options].some((o) => o.value === pkg)) sel.value = pkg;

    // Sotto il pacchetto: prezzo, eventuale sconto e importo finale (gli stessi che arrivano nell'email)
    const quoteEl = $('#f-quote');
    const showQuote = async () => {
      if (!quoteEl || !sel) return;
      const q = await quote(sel.value);
      quoteEl.hidden = !q;
      if (!q) return;
      quoteEl.innerHTML = (q.promo
        ? `Prezzo: <s>${euroTxt(q.price)}</s> <b>${euroTxt(q.final)}</b> con lo sconto ${esc(promoOff(q.promo))}${q.promo.label ? ` (${esc(q.promo.label)})` : ''}`
        : `Prezzo: <b>${euroTxt(q.final)}</b>`) +
        (q.deposit != null ? ` · caparra del 50% per confermare il set: <b>${euroTxt(q.deposit)}</b>` : '');
    };
    sel?.addEventListener('change', showQuote);
    showQuote();

    const messages = {
      valueMissing: 'Compila questo campo',
      typeMismatch: "Controlla l'indirizzo email",
      tooShort: 'Scrivimi qualcosa in più'
    };
    const check = (input) => {
      const field = input.closest('.field') || input.closest('.check')?.parentElement;
      const err = field?.querySelector('.field-error');
      let msg = '';
      if (!input.validity.valid) {
        msg = Object.keys(messages).find((k) => input.validity[k]);
        msg = msg ? messages[msg] : 'Valore non valido';
      }
      field?.classList.toggle('is-invalid', !!msg);
      if (err) err.textContent = msg;
      input.setAttribute('aria-invalid', String(!!msg));
      return !msg;
    };
    const inputs = $$('input, select, textarea', form);
    inputs.forEach((i) => i.addEventListener('blur', () => check(i)));
    inputs.forEach((i) => i.addEventListener('input', () => { if (i.getAttribute('aria-invalid') === 'true') check(i); }));

    const done = (text) => {
      form.hidden = true;
      success.hidden = false;
      if (text) $('.success-text', success).textContent = text;
      if (motion) gsap.from(success, { scale: .96, opacity: 0, duration: .6, ease: 'expo.out' });
      success.focus();
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ok = inputs.map(check).every(Boolean);
      if (!ok) { inputs.find((i) => i.getAttribute('aria-invalid') === 'true')?.focus(); return; }
      const raw = new FormData(form);
      const btn = $('button[type="submit"]', form);
      const q = await quote(sel?.value).catch(() => null);
      const promoTxt = q && q.promo
        ? `${promoOff(q.promo)}${q.promo.label ? ` (${q.promo.label})` : ''}, valido fino al ${new Date(`${q.promo.ends_on}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`
        : 'Nessuno';
      // Riepilogo in un ordine chiaro: prima cosa ha scelto e quanto paga, poi chi è e cosa vuole
      const summary = [
        ['Pacchetto scelto', q ? q.name : 'Non lo sa ancora'],
        ['Prezzo di listino', q ? euroTxt(q.price) : '—'],
        ['Sconto applicato', q ? promoTxt : '—'],
        ['Importo finale da pagare', q ? euroTxt(q.final) : 'Da definire'],
        ...(q && q.deposit != null ? [['Caparra per confermare il set (50%, shooting in fiera)', euroTxt(q.deposit)]] : []),
        ['Nome', raw.get('nome')],
        ['email', raw.get('email')],
        ['Instagram', raw.get('instagram') || '—'],
        ['Personaggio / serie', raw.get('personaggio') || '—'],
        ['Data o evento', raw.get('data') || '—'],
        ['Messaggio', raw.get('messaggio')],
        ['Consenso privacy', 'Accettato']
      ];
      const subject = `Nuova richiesta shooting · ${q ? `${q.name} · ${euroTxt(q.final)}${q.promo ? ' (scontato)' : ''}` : 'pacchetto da definire'} · ${raw.get('nome')}`;

      if (SITE.formEndpoint) {
        btn.disabled = true;
        status.textContent = 'Invio in corso…';
        const data = new FormData();
        data.set('_subject', subject);
        data.set('_gotcha', raw.get('_gotcha') || '');
        summary.forEach(([k, v]) => data.append(k, v));
        try {
          const r = await fetch(SITE.formEndpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            throw new Error((j.errors || []).map((x) => x.message).join(' ') || r.status);
          }
          form.reset();
          done();
        } catch (err) {
          console.warn('Invio modulo non riuscito:', err.message);
          status.textContent = 'Ops, qualcosa non ha funzionato. Riprova tra poco o scrivimi su Instagram.';
        } finally { btn.disabled = false; }
        return;
      }

      if (SITE.email) {
        const body = summary.map(([k, v]) => `${k === 'email' ? 'Email' : k}: ${v}`).join('\n');
        location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        done('Si è aperto il tuo programma di posta con il messaggio già pronto: premi invia e ci sentiamo presto.');
        return;
      }

      status.textContent = 'Il modulo al momento non funziona: scrivimi via email o su Instagram.';
    });
  }

  /* ---------------------------------------------------------------
     Avvio
     --------------------------------------------------------------- */
  const wipeDone = wipeIn();

  // Immagini con effetto pixel presenti nell'HTML (escluse quelle gestite a mano)
  $$('.px').forEach((el) => { if (!el.hasAttribute('data-px-manual')) pixel.observe(el); });

  // I set da Supabase servono a Home, Lavori e Contatti (anche per le foto scelte come Hero e Contatti)
  const remoteP = ['home', 'lavori', 'contatti'].includes(page) ? loadRemoteWorks() : Promise.resolve(null);
  // Foto scelta nell'area admin per un'impostazione ('hero' o 'contact').
  // null se non ce n'è nessuna o se Supabase tarda: resta l'immagine già presente nella pagina.
  // Set natalizi (categoria con "Natal": Natale, Natalizio, Natalizia…) visibili solo dal 1° novembre al 6 gennaio
  const isChristmas = (w) => /natal/i.test(w.category || '');
  const christmasTime = (() => { const d = new Date(), m = d.getMonth() + 1, g = d.getDate(); return m >= 11 || (m === 1 && g <= 6); })();
  const inSeason = (w) => christmasTime || !isChristmas(w);

  const chosenPhoto = (flag, ms) => Promise.race([
    remoteP.then((sets) => {
      for (const w of (sets || []).filter(inSeason)) { const p = w.photos.find((x) => x[flag]); if (p) return { w, p }; }
      return null;
    }).catch(() => null),
    new Promise((res) => setTimeout(() => res(null), ms))
  ]);
  const usePhoto = (img, c) => {
    if (!img || !c) return;
    img.src = c.p.thumb || c.p.src;
    if (c.p.w && c.p.h) {
      img.width = c.p.w; img.height = c.p.h;
      // la cornice prende le proporzioni della foto, così la foto non viene tagliata
      const fig = img.closest('figure');
      if (fig) fig.style.setProperty('--ar', String(c.p.w / c.p.h));
    }
    img.alt = c.p.alt || `${c.w.character}${c.w.series ? ' — ' + c.w.series : ''}`;
  };
  const heroReady = page === 'home'
    ? chosenPhoto('hero', 1200).then((c) => {
      usePhoto($('.hero-photo img'), c);
      // proporzioni anche sulla hero: decidono quanto spazio resta al titolo
      if (c && c.p.w && c.p.h) $('.hero').style.setProperty('--ar', String(c.p.w / c.p.h));
      const tag = $('.hero-photo .frame-tag');
      if (c && tag) tag.textContent = `#01 — ${c.w.character}`;
    })
    : Promise.resolve();
  if (page === 'contatti') {
    const px = $('.page-hero-photo .px');
    chosenPhoto('contact', 1500).then((c) => { usePhoto($('.page-hero-photo img'), c); if (px) pixel.run(px); });
  }

  if (page === 'home') heroIntro();
  if (page === 'listino') listinoPromos();

  /* ---------------------------------------------------------------
     LISTINO: sconti a tempo impostati nell'area admin (tabella promotions)
     --------------------------------------------------------------- */
  async function loadPromos() {
    if (new URLSearchParams(location.search).has('demo')) {
      try { return (JSON.parse(localStorage.getItem('ro-promo-demo')) || []).filter((p) => p.active); } catch (e) { return []; }
    }
    if (!DB.supabaseUrl || !DB.supabaseAnonKey) return [];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    try {
      const headers = { apikey: DB.supabaseAnonKey };
      if (DB.supabaseAnonKey.startsWith('eyJ')) headers.Authorization = `Bearer ${DB.supabaseAnonKey}`;
      const res = await fetch(`${DB.supabaseUrl}/rest/v1/promotions?select=label,kind,amount,starts_on,ends_on,plans&active=eq.true`, { headers, signal: ctrl.signal });
      return res.ok ? await res.json() : [];
    } catch (e) {
      return []; // nessuno sconto se Supabase non risponde: restano i prezzi pieni
    } finally { clearTimeout(timer); }
  }

  // Prezzi modificati dall'area admin (tabella price_items); senza risposta restano quelli scritti nella pagina
  async function loadPrices() {
    if (new URLSearchParams(location.search).has('demo')) {
      try { return JSON.parse(localStorage.getItem('ro-prices-demo')) || []; } catch (e) { return []; }
    }
    if (!DB.supabaseUrl || !DB.supabaseAnonKey) return [];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    try {
      const headers = { apikey: DB.supabaseAnonKey };
      if (DB.supabaseAnonKey.startsWith('eyJ')) headers.Authorization = `Bearer ${DB.supabaseAnonKey}`;
      const res = await fetch(`${DB.supabaseUrl}/rest/v1/price_items?select=key,price,suffix`, { headers, signal: ctrl.signal });
      return res.ok ? await res.json() : [];
    } catch (e) {
      return [];
    } finally { clearTimeout(timer); }
  }

  function applyPrices(rows) {
    const euro = (n) => `${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')} €`;
    const map = {};
    rows.forEach((r) => { map[r.key] = { price: r.price == null ? null : +r.price, suffix: r.suffix || '' }; });
    // il "da" del Boss Fight è il più basso dei prezzi di gruppo
    const group = ['lv3_2', 'lv3_3'].map((k) => map[k] && map[k].price).filter((n) => n != null);
    if (group.length) map.lv3_from = { price: Math.min(...group) };
    $$('[data-count]').forEach((el) => {
      const v = map[el.dataset.count];
      if (v && Number.isInteger(v.price) && v.price > 0) el.textContent = String(v.price);
    });
    $$('[data-key]').forEach((el) => {
      const v = map[el.dataset.key];
      if (!v) return;
      if (el.hasAttribute('data-price')) {
        if (v.price == null) return;
        el.dataset.price = String(v.price);
        el.textContent = euro(v.price);
      } else {
        el.textContent = v.price == null ? 'Da concordare' : v.price === 0 ? 'Inclusa' : `${euro(v.price)}${v.suffix ? ` ${v.suffix}` : ''}`;
      }
    });
  }

  async function listinoPromos() {
    const [prices, promoRows] = await Promise.all([loadPrices(), loadPromos()]);
    if (prices.length) applyPrices(prices);
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const promos = promoRows.filter((p) => p.amount > 0 && p.starts_on <= today && today <= p.ends_on);
    if (!promos.length) return;
    const euro = (n) => `${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')} €`;
    const cut = (price, p) => Math.max(0, Math.round((p.kind === 'percent' ? price * (1 - p.amount / 100) : price - p.amount) * 100) / 100);
    const off = (p) => (p.kind === 'percent' ? `−${+p.amount}%` : `−${euro(+p.amount)}`);
    const names = {};
    const used = new Set();
    $$('.plan[data-plan]').forEach((plan) => {
      const key = plan.dataset.plan;
      names[key] = plan.querySelector('h2').textContent.replace(/^\s*LV\.\d\s*/, '').trim();
      const prices = $$('[data-price]', plan);
      if (!prices.length) return;
      // con più sconti nello stesso giorno vale quello più conveniente per il pacchetto
      const base = +prices[0].dataset.price;
      const best = promos.filter((p) => (p.plans || []).includes(key)).sort((a, b) => cut(base, a) - cut(base, b))[0];
      if (!best) return;
      used.add(best);
      prices.forEach((el) => {
        const price = +el.dataset.price;
        el.innerHTML = `<s class="price-old"><span class="sr-only">prezzo pieno </span>${euro(price)}</s> <span class="price-new"><span class="sr-only">scontato a </span>${euro(cut(price, best))}</span>`;
      });
      plan.classList.add('is-promo');
      plan.querySelector('.plan-price').insertAdjacentHTML('afterend', `<span class="plan-promo pixel">Sconto ${esc(off(best))}</span>`);
    });
    const banner = $('#promo-banner');
    if (!banner || !used.size) return;
    const all = Object.keys(names);
    banner.innerHTML = [...used].map((p) => {
      const plans = (p.plans || []).filter((k) => names[k]);
      const which = plans.length === all.length ? 'su tutti i pacchetti' : `su ${plans.map((k) => names[k]).join(' e ')}`;
      const until = new Date(`${p.ends_on}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
      return `<span>▲ ${p.label ? `${esc(p.label)}: ` : ''}sconto ${esc(off(p))} ${esc(which)}, fino al ${esc(until)}</span>`;
    }).join('');
    banner.hidden = false;
  }

  /* ---------------------------------------------------------------
     CONTATTI: preventivo del pacchetto scelto, con prezzi e sconti dell'area admin
     --------------------------------------------------------------- */
  // prezzi di riserva, uguali a quelli scritti nel Listino, se Supabase non risponde
  const CHOICES = {
    lv1: { name: 'LV.1 Side Quest', key: 'lv1', plan: 'lv1', price: 50 },
    lv2: { name: 'LV.2 Main Quest', key: 'lv2', plan: 'lv2', price: 150 },
    lv3_2: { name: 'LV.3 Boss Fight, 2 persone', key: 'lv3_2', plan: 'lv3', price: 60 },
    lv3_3: { name: 'LV.3 Boss Fight, 3 persone', key: 'lv3_3', plan: 'lv3', price: 80 },
    fiera: { name: 'Shooting in fiera', key: 'extra_evento', plan: null, price: 15, suffix: '· 3 foto', fair: true }
  };
  const euroTxt = (n) => `${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')} €`;
  const promoCut = (price, p) => Math.max(0, Math.round((p.kind === 'percent' ? price * (1 - p.amount / 100) : price - p.amount) * 100) / 100);
  const promoOff = (p) => (p.kind === 'percent' ? `−${+p.amount}%` : `−${euroTxt(+p.amount)}`);
  let quoteData = null;
  const loadQuoteData = () => {
    if (!quoteData) {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      quoteData = Promise.all([loadPrices(), loadPromos()]).then(([prices, promos]) => ({
        prices: Object.fromEntries(prices.map((r) => [r.key, r])),
        promos: promos.filter((p) => p.amount > 0 && p.starts_on <= today && today <= p.ends_on)
      }));
    }
    return quoteData;
  };
  // { name, price, promo, final, deposit }: deposit = caparra del 50% per gli shooting in fiera
  async function quote(choice) {
    const c = CHOICES[choice];
    if (!c) return null;
    const { prices, promos } = await loadQuoteData();
    const row = prices[c.key];
    const price = row && row.price != null ? +row.price : c.price;
    const suffix = row ? row.suffix || '' : c.suffix || '';
    const promo = c.plan ? promos.filter((p) => (p.plans || []).includes(c.plan)).sort((a, b) => promoCut(price, a) - promoCut(price, b))[0] || null : null;
    const final = promo ? promoCut(price, promo) : price;
    const extra = suffix.replace(/^[·\s/]+/, '');
    return {
      name: c.fair && extra ? `${c.name} (${extra})` : c.name,
      price, promo, final,
      deposit: c.fair ? Math.round(final * 50) / 100 : null
    };
  }

  (async () => {
  if (page === 'home' || page === 'lavori') {
    const remote = await remoteP;
    // Nella galleria e nella pellicola solo i set pubblicati; i set non pubblicati arrivano
    // solo se contengono la foto scelta come Hero o Contatti (servono a chosenPhoto)
    const published = (remote || []).filter((w) => w.published && inSeason(w));
    if (published.length) WORKS = published;
  }
  normalizeWorks();

  if (page === 'home') home();
  if (page === 'lavori') lavori();
  if (page === 'contatti') contatti();

  // Le .px create dinamicamente (pellicola) vanno osservate dopo il render
  $$('.reel-frame .px').forEach((el) => pixel.observe(el));

  if (motion) {
    if (page !== 'home') {
      wipeDone.then(() => {
        const heroChars = $$('.page-hero [data-chars]');
        if (heroChars.length) animateChars(heroChars, { stagger: .03, duration: 1.2 });
        gsap.fromTo($$('.page-hero [data-intro]'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .1, delay: .35 });
      });
    }
    commonReveals();
    if (document.fonts?.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh());
  } else {
    staticReveals();
    $$('.px').forEach((el) => el.classList.add('px-done'));
  }
  })();
})();
