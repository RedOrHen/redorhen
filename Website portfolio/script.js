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
  const cameFromWipe = root.classList.contains('wiping');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const page = document.body.dataset.page || '';
  const WORKS = window.WORKS || [];
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

  // Ogni voce di WORKS è un set (una "cartella") di foto: la prima è la copertina.
  const PH_RATIOS = [[800, 1120], [800, 1000], [800, 1200], [1120, 800]];
  WORKS.forEach((w, i) => {
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
    Object.assign(w, { src: photos[0].src, w: photos[0].w, h: photos[0].h, alt: photos[0].alt });
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
        if (!img.complete) await new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
        if (img.decode) await img.decode().catch(() => {});
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
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('[data-cursor], a, button, summary, label, input, select, textarea');
      const lab = t?.closest('[data-cursor]')?.dataset.cursor;
      cur.classList.toggle('has-label', !!lab);
      if (lab) label.textContent = lab;
      cur.classList.toggle('is-link', !!t && !lab);
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
      store.set('ro-wipe', '1');
      const sq = buildWipe();
      gsap.fromTo(sq, { scale: 0 }, {
        scale: 1.02, duration: .38, ease: 'power2.out', stagger: { each: .008, from: 'random' },
        onComplete: () => { location.href = url.href; }
      });
    });
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) { $$('i', wipe).forEach((i) => gsap.set(i, { scale: 0 })); store.del('ro-wipe'); }
    });
  }

  /* ---------------------------------------------------------------
     Loader (solo Home, prima visita della sessione)
     --------------------------------------------------------------- */
  function runLoader() {
    return new Promise((res) => {
      const L = $('.loader');
      if (!L) return res();
      if (!motion || root.classList.contains('seen') || cameFromWipe) { L.remove(); return res(); }
      store.set('ro-seen', '1');
      const pct = $('.loader-pct', L);
      const fill = $('.loader-fill', L);
      const o = { v: 0 };
      gsap.timeline({ onComplete: () => { L.remove(); res(); } })
        .to(o, { v: 100, duration: 1.1, ease: 'power2.inOut', snap: { v: 1 }, onUpdate: () => { pct.textContent = `${o.v}%`; fill.style.transform = `scaleX(${o.v / 100})`; } })
        .to($('.loader-start', L), { opacity: 1, duration: .05, repeat: 3, yoyo: true, ease: 'steps(1)' })
        .to(L, { clipPath: 'inset(0 0 100% 0)', duration: .7, ease: 'expo.inOut' }, '+=.05');
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
     Icone pixel
     --------------------------------------------------------------- */
  const ICONS = {
    camera: [
      '............',
      '....####....',
      '.##########.',
      '.#........#.',
      '.#..####..#.',
      '.#.#oooo#.#.',
      '.#.#oooo#.#.',
      '.#..####..#.',
      '.#........#.',
      '.##########.',
      '............',
      '............'
    ],
    scene: [
      '.........oo.',
      '........oooo',
      '.........oo.',
      '............',
      '....#.......',
      '...###......',
      '..#####..#..',
      '.#######.##.',
      '############',
      '############',
      '............',
      '............'
    ],
    heart: [
      '............',
      '..##....##..',
      '.####..####.',
      '#####oo#####',
      '############',
      '############',
      '.##########.',
      '..########..',
      '...######...',
      '....####....',
      '.....##.....',
      '............'
    ]
  };
  $$('[data-icon]').forEach((el) => {
    const map = ICONS[el.dataset.icon];
    if (!map) return;
    let rects = '';
    map.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '#') rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="#FF6A1A"/>`;
      if (ch === 'o') rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="#FFB547"/>`;
    }));
    el.innerHTML = `<svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  });

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

  function home() {
    buildReel();

    // Timecode da cinepresa
    const tc = $('.timecode');
    if (tc) {
      const t0 = performance.now();
      const pad = (n) => String(n).padStart(2, '0');
      let last = -1;
      const loop = (now) => {
        const f = Math.floor((now - t0) / (1000 / 24));
        if (f !== last) {
          last = f;
          tc.textContent = `${pad(Math.floor(f / 86400))}:${pad(Math.floor(f / 1440) % 60)}:${pad(Math.floor(f / 24) % 60)}:${pad(f % 24)}`;
        }
        requestAnimationFrame(loop);
      };
      if (motion) requestAnimationFrame(loop);
    }

    // Countdown arcade nella CTA finale
    const cd = $('.countdown-n');
    if (cd && motion) {
      let n = 10;
      setInterval(() => { n = n <= 0 ? 10 : n - 1; cd.textContent = n; }, 1000);
    }

    if (!motion) return;

    // Hero: titoli di testa
    const heroPx = $('.hero-photo .px');
    const intro = () => {
      const tl = gsap.timeline();
      tl.add(animateChars($$('.hero [data-chars]'), { stagger: .03, duration: 1.2 }), 0);
      if (heroPx) {
        tl.add(() => pixel.run(heroPx), .1);
        tl.fromTo(heroPx, { scale: 1.15 }, { scale: 1, duration: 2.6, ease: 'power2.out' }, 0);
      }
      tl.fromTo($$('.hero [data-intro]'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .1 }, .5);
    };
    runLoader().then(() => wipeDone.then(intro));

    // Barre letterbox che si ritirano + parallax
    gsap.to('.hero-bar', { scaleY: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '40% top', scrub: true } });
    gsap.to('.hero-photo', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-content', { yPercent: 18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

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
        onEnter: () => gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: .08, repeat: 7, yoyo: true, ease: 'steps(1)' })
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
    const lvlBar = $('.story-level-bar i');
    let current = -1;
    const setFrame = (i) => {
      if (i === current) return;
      current = i;
      frames.forEach((f, k) => f.classList.toggle('is-active', k === i));
      chapters.forEach((c, k) => c.classList.toggle('is-active', k === i));
      const ch = chapters[i];
      if (lvl && ch) lvl.textContent = ch.dataset.level;
      if (lvlBar && ch) lvlBar.style.transform = `scaleX(${ch.dataset.xp})`;
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
      <button class="work${w.photos.length > 1 ? ' work--set' : ''}" type="button" data-i="${w.index}" data-cat="${esc(w.category)}" data-cursor="Apri set" aria-label="Apri il set ${esc(w.character)}${w.series ? ', ' + esc(w.series) : ''}: ${nFoto(w.photos.length)}">
        <span class="work-stack">
          <span class="px" style="aspect-ratio:${w.w}/${w.h}"><img src="${esc(w.src)}" alt="${esc(w.alt)}" width="${w.w}" height="${w.h}" loading="lazy" decoding="async"></span>
          <span class="work-count pixel" aria-hidden="true"><i></i>${nFoto(w.photos.length)}</span>
        </span>
        <span class="work-cap pixel"><span>${esc(w.character)}</span><span class="muted">${esc(w.series)}</span></span>
      </button>`).join('');

    const counter = $('.scene-count');
    const cats = [...new Set(WORKS.map((w) => w.category).filter(Boolean))];
    const count = (c) => WORKS.filter((w) => !c || w.category === c).length;
    if (bar) {
      bar.innerHTML = [`<button class="filter" type="button" data-filter="" aria-pressed="true">Tutti<sup>${count()}</sup></button>`]
        .concat(cats.map((c) => `<button class="filter" type="button" data-filter="${esc(c)}" aria-pressed="false">${esc(c)}<sup>${count(c)}</sup></button>`)).join('');
    }

    const items = $$('.work', grid);
    items.forEach((it) => pixel.observe($('.px', it)));
    const visible = () => items.filter((it) => !it.hidden);
    const setCount = () => { if (counter) counter.textContent = String(visible().length).padStart(2, '0'); };
    setCount();

    bar?.addEventListener('click', (e) => {
      const b = e.target.closest('.filter');
      if (!b) return;
      $$('.filter', bar).forEach((f) => f.setAttribute('aria-pressed', String(f === b)));
      const c = b.dataset.filter;
      const apply = () => {
        items.forEach((it) => { it.hidden = !!c && it.dataset.cat !== c; });
        setCount();
        if (hasGSAP) ScrollTrigger.refresh();
        if (motion) gsap.fromTo(visible(), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .8, ease: 'expo.out', stagger: .04 });
      };
      if (motion) gsap.to(items, { opacity: 0, duration: .2, onComplete: apply }); else apply();
    });

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
      </div>
      <button class="lb-btn lb-close" type="button" aria-label="Chiudi">✕ Esc</button>
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

    const fit = (p) => {
      const maxW = innerWidth - (innerWidth < 700 ? 32 : 220);
      const maxH = innerHeight * (innerWidth < 700 ? .5 : .6) + (list.length > 1 ? 0 : 60);
      const s = Math.min(maxW / p.w, maxH / p.h);
      media.style.width = `${Math.round(p.w * s)}px`;
      media.style.height = `${Math.round(p.h * s)}px`;
    };
    const show = () => {
      const p = list[pos];
      fit(p);
      lbImg.src = p.src;
      lbImg.alt = p.alt;
      cnt.textContent = `${String(pos + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
      $$('.lb-thumb', thumbs).forEach((t, k) => {
        t.classList.toggle('is-active', k === pos);
        t.setAttribute('aria-current', String(k === pos));
        if (k === pos) t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: motion ? 'smooth' : 'auto' });
      });
      pixel.run(lbPx);
      const next = list[(pos + 1) % list.length];
      if (next && !next.placeholder) { const pre = new Image(); pre.src = next.src; }
    };
    const open = (i, from) => {
      set = WORKS[i];
      list = set.photos;
      pos = 0;
      opener = from;
      title.innerHTML = `<span>${esc(set.character)}</span><span class="muted">${esc(set.series)}</span>${set.cosplayer ? `<span class="ember">${esc(set.cosplayer)}</span>` : ''}`;
      thumbs.innerHTML = list.length > 1 ? list.map((p, k) => `
        <button class="lb-thumb" type="button" data-k="${k}" aria-label="Foto ${k + 1} di ${list.length}">
          <img src="${esc(p.src)}" alt="" width="${p.w}" height="${p.h}" loading="lazy" decoding="async">
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
    const close = () => {
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
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
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

    const pkg = new URLSearchParams(location.search).get('pacchetto');
    const sel = $('#f-pacchetto');
    if (pkg && sel && [...sel.options].some((o) => o.value === pkg)) sel.value = pkg;

    const messages = {
      valueMissing: 'Questo campo serve',
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
      const data = new FormData(form);
      const btn = $('button[type="submit"]', form);

      if (SITE.formEndpoint) {
        btn.disabled = true;
        status.textContent = 'Invio in corso…';
        data.set('pacchetto', sel?.selectedOptions[0]?.text || 'Non lo so ancora');
        data.set('privacy', 'Accettata');
        data.set('_subject', `Richiesta shooting — ${data.get('personaggio') || data.get('nome')}`);
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
        const body = [
          `Nome: ${data.get('nome')}`,
          `Email: ${data.get('email')}`,
          `Personaggio / serie: ${data.get('personaggio') || '-'}`,
          `Data o evento: ${data.get('data') || '-'}`,
          `Pacchetto: ${sel?.selectedOptions[0]?.text || '-'}`,
          '',
          data.get('messaggio')
        ].join('\n');
        location.href = `mailto:${SITE.email}?subject=${encodeURIComponent('Richiesta shooting — ' + (data.get('personaggio') || data.get('nome')))}&body=${encodeURIComponent(body)}`;
        done('Si è aperto il tuo programma di posta con il messaggio già pronto: premi invia e ci sentiamo presto.');
        return;
      }

      status.textContent = 'Il modulo non è ancora attivo: imposta email o formEndpoint in assets/data/works.js.';
    });
  }

  /* ---------------------------------------------------------------
     Avvio
     --------------------------------------------------------------- */
  const wipeDone = wipeIn();

  // Immagini con effetto pixel presenti nell'HTML (escluse quelle gestite a mano)
  $$('.px').forEach((el) => { if (!el.hasAttribute('data-px-manual')) pixel.observe(el); });

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
