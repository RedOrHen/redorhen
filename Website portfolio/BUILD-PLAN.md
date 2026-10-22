# REDORHEN — Master Build Plan

> **Documento storico.** È il piano creativo scritto all'inizio del progetto (20 ottobre 2026). Il sito poi è cambiato
> (niente video, area admin, galleria su Supabase, listino reale…). Lo stato attuale è descritto in
> [docs/DOCUMENTAZIONE.md](docs/DOCUMENTAZIONE.md).

> Creative brief + istruzioni di implementazione per Claude Code
> Progetto: sito portfolio di fotografia cosplay · Versione 1.0 · 20 ottobre 2026

---

## PARTE I — CREATIVE BRIEF

### 1. Website overview

| | |
|---|---|
| **Brand** | RedOrHen |
| **Disciplina** | Fotografia cosplay |
| **Tipo di sito** | Portfolio (4 pagine: Home, Lavori, Listino, Contatti) |
| **Obiettivo primario** | Far sfogliare i lavori: ogni percorso porta alla galleria |
| **Obiettivo secondario** | Convertire chi ha visto i lavori in una richiesta di shooting (Listino → Contatti) |
| **Pubblico** | Cosplayer (principianti ed esperti) che cercano un fotografo che rispetti il loro lavoro; organizzatori di eventi e set; appassionati di cosplay e fotografia |
| **Lingua** | Italiano |
| **Video** | Nessuno. Il sito è costruito interamente sulle fotografie |

Il sito è un **cinema in pixel**: un'esperienza a scorrimento che tratta ogni foto come un fotogramma di un film e la incornicia in un linguaggio visivo da videogioco retrò. Le immagini entrano in scena “caricandosi” da pixel grezzi a fotografia nitida: il passaggio dal gioco al cinema è la metafora del brand.

### 2. Core positioning

**Promessa:** il tuo cosplay merita più di una foto. Merita una scena.

**Posizionamento:** RedOrHen non scatta “foto ai cosplay”: costruisce attorno al personaggio la luce, l'ambiente e l'atmosfera da cui quel personaggio verrebbe, così che mesi di cuciture, armature e parrucche abbiano finalmente l'immagine che si meritano.

**Tagline principale:** *Ogni cosplay è un personaggio. Io gli costruisco la scena.*

**Tagline alternative:**
- *Dal tuo lavoro, al suo fotogramma.*
- *Fotografia cosplay. Girata come un film.*
- *Press start. Inizia lo shooting.*

**Tre ragioni per scegliere RedOrHen:**
1. **Rispetto per il lavoro del cosplayer:** ogni dettaglio del costume viene valorizzato, non nascosto.
2. **Foto coerenti con il personaggio:** luce, pose e location sono scelte in base allo stile e al mondo del personaggio.
3. **Un'esperienza, non una sessione:** lo shooting è un momento da vivere insieme, con calma e divertimento.

**Il “difetto” trasformato in valore:** la post-produzione richiede tempo. Il sito lo dice apertamente come scelta di qualità: *“Ogni foto è ritoccata a mano, una per una. Ci vuole il tempo che serve, e si vede.”* Tempi di consegna indicati con onestà nel Listino.

### 3. Brand personality

| Tratto | Come si manifesta |
|---|---|
| **Amichevole** | Tono informale, in seconda persona (“tu”), micro-copy giocoso, nessuna distanza da “fotografo professionista freddo” |
| **Cinematografico** | Barre letterbox, titoli di testa, inquadrature ampie, ritmo da montaggio |
| **Nerd con orgoglio** | Riferimenti a pixel art e videogiochi: “Press Start”, barre HP/XP, cursore pixel, “Level up” |
| **Artigianale** | Racconta tempi e cura della post-produzione, il percorso nato per caso |
| **Socievole** | Lo shooting presentato come una collaborazione e un'occasione per conoscersi |

**Voce:** calda, diretta, ironica senza essere sciocca. Frasi brevi. Mai gergo tecnico fine a se stesso.

**Da evitare:** toni da agenzia, superlativi vuoti (“il migliore”, “top”), la parola “servizi” nelle intestazioni.

### 4. Visual direction

**Concept: “Pixel → Fotogramma”.**
Due mondi che si incontrano:
- **Il cinema:** fotografie grandi, a tutto schermo, in formato panoramico, grana di pellicola, barre nere letterbox, titoli enormi tipo locandina.
- **La pixel art:** etichette, numeri, cornici, cursore, icone e transizioni in pixel. Il pixel è la *cornice*, mai il contenuto: le foto restano sempre protagoniste e pulite.

**Moodboard verbale:** un cinema di provincia al tramonto; il menu iniziale di un JRPG a 16 bit; la luce arancione dell'ora d'oro sul set; una pellicola Kodak un po' sovraesposta.

**Firma visiva:** ogni foto entra in scena **pixelata** (blocchi da 48 px) e si **risolve** in nitidezza durante lo scroll, come una texture che si carica. È l'effetto che rende il sito riconoscibile.

### 5. Higgsfield Seedance 2.0 asset generation

**Stato: NON UTILIZZATO in questa versione.** Su indicazione del cliente il sito non usa video generati: le protagoniste sono le fotografie reali di RedOrHen.

- Nessun clip 1080p da 8–12 s da generare.
- Immagine di riferimento identità: la cartella `Media/` non è presente nel progetto. Se in futuro si vorranno video, posizionare il riferimento in `Media/reference.jpg` e riattivare questa sezione.
- **Sostituto:** il movimento cinematografico è ottenuto con fotografie animate via codice (parallax, Ken Burns, depixelazione, scrub a sequenza di immagini sullo scroll).

### 6. Three cinematic scenes

Le tre “scene” non sono video ma **sequenze fotografiche guidate dallo scroll**, costruite con le foto del portfolio:

1. **SCENA 1 — TITOLI DI TESTA (Hero).** Schermo nero, barre letterbox. Una foto hero si risolve da pixel a nitida mentre il titolo enorme entra lettera per lettera. Lentissimo zoom Ken Burns (scala 1.15 → 1.0).
2. **SCENA 2 — IL MONTAGGIO (Featured work).** Sezione bloccata (pinned) in cui 5–6 foto scorrono orizzontalmente come una pellicola; ogni fotogramma ha un'etichetta pixel con nome del personaggio e “serie”.
3. **SCENA 3 — DIETRO LE QUINTE (Story).** Una sequenza di 3 foto (la prima Poison Ivy → foto recenti) che si sovrappongono in crossfade mentre il racconto avanza: “Livello 1 → Livello 8”.

---

## PARTE II — STRUTTURA E CONTENUTI

### 7. Website structure

```
index.html      Home: esperienza cinematografica a scroll
lavori.html     Galleria completa (destinazione della CTA principale)
listino.html    Listino prezzi
contatti.html   Contatti e richiesta shooting
```

**Navigazione (fissa, minimal):** logo pixel `REDORHEN` a sinistra · `Lavori` `Listino` `Contatti` a destra · indicatore pixel della pagina attiva (freccina ▶ lampeggiante come in un menu di gioco).

**Flusso Home:**
Hero → Stats strip → Missione → Tre pilastri → Storia → Il montaggio (lavori in evidenza) → Come funziona uno shooting → CTA finale → Footer

### 8. Hero section

- **Sopra il titolo (pixel, piccolo):** `▶ PRESS START — FOTOGRAFIA COSPLAY`
- **Titolo (enorme, 2 righe):** `OGNI COSPLAY` / `MERITA LA SUA SCENA.`
- **Sottotitolo:** *Luce, ambiente e pose costruiti attorno al tuo personaggio, per dare al tuo lavoro l'immagine che si merita.*
- **CTA primaria:** `Guarda i lavori →` (porta a `lavori.html`)
- **CTA secondaria (link testuale):** `Prenota uno shooting`
- **Visual:** foto hero a tutto schermo, con overlay sfumato caldo in basso, barre letterbox che si ritirano allo scroll, grana.
- **Dettaglio:** in basso a destra un “timecode” che scorre con lo scroll (`00:00:12:04`); in basso a sinistra `SCROLL ▼` lampeggiante in pixel.

### 9. Animated stats strip

Striscia orizzontale con contatori che partono da 0 quando entrano in viewport, stile punteggio arcade:

| Valore | Etichetta |
|---|---|
| **100+** | cosplayer fotografati |
| **7+** | anni dietro l'obiettivo |
| **2×** | evento fotografico di San Marino |
| **∞** | foto ritoccate a mano |

Sotto la striscia un marquee infinito in pixel: `PERSONAGGI · SET · LUCE · STORIE · AMICIZIE · ` …

### 10. Mission section

Testo enorme che si “accende” parola per parola durante lo scroll (da 15% di opacità a 100%):

> *Voglio creare arte che anche gli altri possano apprezzare.*
> *E voglio farlo insieme: conoscendo persone nuove, costruendo un set, ridendo tra uno scatto e l'altro.*

Firma pixel: `— RedOrHen`

### 11. Three pillars section

Tre carte stile “selezione personaggio” con icona pixel, numero e barra statistica:

1. **01 · IL TUO LAVORO, IN PRIMO PIANO**
   Mesi di cuciture, stampe 3D e parrucche meritano di vedersi. Ogni dettaglio del costume viene valorizzato, non nascosto.
   `CURA ██████████`
2. **02 · IL PERSONAGGIO, NEL SUO MONDO**
   Luce, location e pose scelte in base allo stile del personaggio, perché la foto sembri un fotogramma della sua storia.
   `ATMOSFERA ██████████`
3. **03 · UN'ESPERIENZA, NON UNA SESSIONE**
   Lo shooting è un momento da vivere insieme, con calma e divertimento. Si arriva sconosciuti, si riparte amici.
   `DIVERTIMENTO ██████████`

Hover: la carta si solleva, il bordo diventa arancione pixel, la barra si riempie.

### 12. Story section

Titolo: **`TUTTO È INIZIATO PER CASO.`**

Copy (rivisto):

> Mi sono ritrovato con una macchina fotografica in mano per aiutare la mia ragazza a fotografare il suo nuovo cosplay: Poison Ivy.
> Quindici anni dopo, quella ragazza è mia moglie. E quella macchina non l'ho più lasciata.
>
> Da lì la curiosità ha fatto il resto: nuove fotocamere, nuove luci, nuovi esperimenti, alla ricerca di uno stile mio.
> Gli eventi fotografici mi hanno fatto conoscere decine di persone straordinarie e regalato momenti che non dimentico.
>
> Oggi fotografo cosplay da più di sette anni. Ma l'idea è sempre la stessa di quel primo giorno: **aiutare qualcuno a vedere il proprio lavoro come lo immaginava.**

Layout: testo a sinistra in colonna stretta, sequenza fotografica pinned a destra (Scena 3) con etichetta `LV. 01 → LV. 08`.

### 13. Product / Service / Community section — “Come funziona uno shooting”

Quattro step in stile “quest log”:

1. **`QUEST 1 · SCRIVIMI`** Personaggio, idea, data. Anche solo un'ispirazione va benissimo.
2. **`QUEST 2 · PREPARIAMO IL SET`** Scegliamo insieme location, luci e atmosfera giuste per il personaggio.
3. **`QUEST 3 · LO SHOOTING`** Si scatta, si sperimenta, ci si diverte. Senza fretta.
4. **`QUEST 4 · LA CONSEGNA`** Ogni foto viene ritoccata a mano. Ci vuole il suo tempo, ma ne vale la pena.

CTA: `Vedi il listino →`

### 14. Featured work / content section — “Il montaggio”

Sezione pinned con scroll orizzontale (Scena 2): 6 fotogrammi grandi su “pellicola” con perforazioni laterali pixel. Ogni fotogramma:
- etichetta pixel: `#03 — POISON IVY` / `DC COMICS`
- depixelazione all'ingresso nel viewport orizzontale
- cursore che diventa `[ APRI ]`

Alla fine della pellicola: carta finale enorme `TUTTI I LAVORI →` (link a `lavori.html`).

### 15. Final CTA section

Sfondo arancione pieno, testo scuro enorme:

> **`IL TUO PROSSIMO PERSONAGGIO`**
> **`MERITA UNA SCENA.`**

Sottotitolo pixel: `CONTINUE? 10… 9… 8…` (countdown animato in loop stile arcade)
Bottoni: `Guarda i lavori` (primario, scuro) · `Prenota uno shooting` (secondario, outline).

### 16. Footer

- Logo pixel grande `REDORHEN` che occupa tutta la larghezza
- Colonne: Navigazione · Social (Instagram, ecc. — da compilare) · Contatti (email — da compilare)
- Riga finale: `© 2026 RedOrHen — Fotografia cosplay` · `GAME OVER? NO, TORNA SU ▲` (back to top)

### 16b. Pagina Lavori (`lavori.html`) — destinazione CTA principale

- Hero corto: `I LAVORI` + contatore `xx SCENE`
- Filtri pixel a pill: `TUTTI` · per serie/universo (es. DC, Anime, Videogiochi…) — generati dai dati
- Griglia masonry responsive (3 colonne desktop, 2 tablet, 1 mobile) con depixelazione allo scroll
- Click → **lightbox cinematografico** a tutto schermo con barre letterbox, frecce ◀ ▶, tastiera (←, →, Esc), swipe su mobile, didascalia pixel (personaggio, cosplayer con @, serie)
- Fine pagina: CTA `Ti piace quello che vedi? Prenota uno shooting →`

### 16c. Pagina Listino (`listino.html`)

Titolo: `SCEGLI IL TUO LIVELLO`. Tre carte pacchetto stile selezione personaggio (prezzi **segnaposto**, da confermare):

| Pacchetto | Durata | Foto consegnate | Prezzo |
|---|---|---|---|
| **LV.1 — Side Quest** | ~1 h, 1 location | 10 foto ritoccate | € —— |
| **LV.2 — Main Quest** *(consigliato)* | ~2 h, 1–2 location | 20 foto ritoccate | € —— |
| **LV.3 — Boss Fight** | mezza giornata, set costruito | 35 foto ritoccate | € —— |

Sotto: extra (foto aggiuntive, trasferta, eventi), **tempi di consegna onesti** (“La post-produzione è fatta a mano: indicativamente X settimane”), FAQ in accordion (pagamento, maltempo, minorenni, uso delle foto sui social, crediti).

### 16d. Pagina Contatti (`contatti.html`)

Titolo: `NUOVA PARTITA?` · sottotitolo: *Raccontami il personaggio che hai in mente. Rispondo a tutti.*
- Form: Nome · Email · Personaggio/serie · Data o evento · Messaggio · checkbox privacy
- Invio: servizio form statico (Formspree o simile, endpoint da configurare); fallback `mailto:`
- Accanto: link diretti Instagram / email, e la frase *“Non sai ancora cosa fare? Scrivimi lo stesso: ne parliamo.”*
- Stato di successo: schermata pixel `MESSAGGIO INVIATO! ★ +100 XP`

---

## PARTE III — DESIGN SYSTEM

### 17. Complete visual style guide

**Palette (calda, ispirata all'ora d'oro):**

| Token | Hex | Uso |
|---|---|---|
| `--ink` | `#120B07` | Sfondo principale (nero caldo, mai nero puro) |
| `--ink-2` | `#1E140D` | Superfici, carte |
| `--ember` | `#FF6A1A` | Arancione brand: CTA, accenti, cursore |
| `--amber` | `#FFB547` | Highlight, numeri, hover |
| `--rust` | `#B83A12` | Ombre pixel, stati premuti |
| `--cream` | `#F6E7D3` | Testo principale |
| `--dust` | `#A8927C` | Testo secondario |
| `--line` | `rgba(246,231,211,.12)` | Bordi sottili |

**Texture:** grana di pellicola animata in overlay (opacità 6–8%), vignettatura leggera ai bordi, scanline opzionale solo sulle etichette pixel.

**Pixel elements:** bordi a gradini (box-shadow a step da 4 px), icone in SVG pixel 16×16, `image-rendering: pixelated` dove serve.

**Griglia:** 12 colonne, margini laterali `clamp(16px, 4vw, 64px)`, ritmo verticale generoso (sezioni ≥ 100vh dove serve dramma).

**Fotografie:** sempre grandi, mai incorniciate da ombre morbide; angoli vivi (raggio 0), coerenti con il pixel.

### 18. Typography

| Ruolo | Font (Google Fonts) | Uso |
|---|---|---|
| **Display** | **Anton** | Titoli enormi, maiuscolo, `clamp(64px, 14vw, 240px)`, interlinea 0.9 |
| **Pixel** | **Silkscreen** (o *Press Start 2P* per micro-etichette) | Etichette, nav, numeri, bottoni, timecode |
| **Body** | **Manrope** | Testi lunghi, 17–19 px, interlinea 1.6 |

Regole: display sempre maiuscolo con tracking leggermente negativo; pixel sempre maiuscolo, piccolo (11–14 px), tracking positivo; mai più di 65 caratteri per riga nel body.

### 19. Animation direction

- **Easing firma:** `expo.out` per entrate, `power3.inOut` per transizioni; durate 0.8–1.4 s.
- **Kinetic typography:** titoli divisi in lettere/parole con maschera (`overflow: hidden`), entrata dal basso con stagger 0.03 s; parole della missione che si accendono in scrub.
- **Depixelazione:** effetto firma su canvas (pixel 48 → 1) legato all'ingresso in viewport (o allo scrub nella Scena 2).
- **Ken Burns:** zoom lento su hero e foto grandi.
- **Letterbox:** barre nere 10vh che si ritirano all'avvio e ricompaiono nel lightbox.
- **Contatori arcade:** numeri che scorrono con suono visivo “blip” (scale 1.1 a ogni step finale).
- **Transizioni di pagina:** schermata di wipe a blocchi pixel arancioni (griglia di quadrati che si riempie e poi si svuota), ~0.7 s.
- **Loader iniziale:** barra di caricamento pixel `LOADING… 87%` + `PRESS START`, max 1.5 s, saltato alle visite successive (sessionStorage).

### 20. Interaction design

- **Cursore custom:** quadrato pixel arancione 12 px con trail leggero; su foto diventa etichetta `[ APRI ]`, su link `[ ▶ ]`. Disattivato su touch.
- **Bottoni magnetici:** leggera attrazione verso il cursore (max 8 px), ombra pixel a gradini che “si preme” al click.
- **Hover foto:** desaturazione → colore pieno e micro-zoom 1.03.
- **Nav:** si nasconde scrollando giù, riappare scrollando su.
- **Lightbox:** tastiera, swipe, preload dell'immagine successiva.
- **Accessibilità:** focus ben visibile (contorno pixel arancione), tutte le animazioni ridotte con `prefers-reduced-motion`, testo alternativo per ogni foto.

### 21. Scroll behavior

- **Lenis** per smooth scroll (lerp 0.1), sincronizzato con il ticker di GSAP.
- **ScrollTrigger** per: pin della Scena 2 (scroll orizzontale), pin della Scena 3 (crossfade storia), scrub della missione, reveal di sezioni, timecode hero.
- Barra di avanzamento pagina in alto stile barra XP (`XP ████░░░░`).
- Nessun scroll-jacking oltre ai due pin.

### 22. Mobile behavior

- Scena 2 (pellicola orizzontale) diventa carosello con scroll-snap orizzontale nativo, senza pin.
- Scena 3 diventa sequenza verticale semplice.
- Cursore custom e bottoni magnetici disattivati.
- Titoli display a `clamp()` per non tagliare mai parole; nav in menu a tutto schermo con voci giganti.
- Depixelazione mantenuta ma con meno step (prestazioni).
- Target touch ≥ 44 px, nessuno scroll orizzontale della pagina, gutter 16 px.

---

## PARTE IV — IMPLEMENTAZIONE (istruzioni per Claude Code)

### 23. Technical implementation

**Stack:** HTML + CSS + JavaScript vanilla. Nessun framework, nessun build step.

**CDN (versioni esatte):**
```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
```

**Struttura file** (radice: `Website portfolio/`):
```
index.html
lavori.html
listino.html
contatti.html
style.css
script.js
assets/
  data/works.js        ← elenco foto (unico file da modificare per aggiornare la galleria)
  works/               ← foto del portfolio (.jpg/.webp, lato lungo 2000 px + versione 800 px)
  img/                 ← favicon, icone pixel, og-image
```

**Dati galleria (`assets/data/works.js`):**
```js
window.WORKS = [
  { src: 'assets/works/poison-ivy.webp', thumb: 'assets/works/poison-ivy-800.webp',
    character: 'Poison Ivy', series: 'DC Comics', category: 'DC',
    cosplayer: '@nomecosplayer', featured: true, alt: 'Descrizione della foto' },
];
```
La Home usa le voci `featured: true`; `lavori.html` genera griglia e filtri da `category`. Finché le foto reali non sono presenti si usano **segnaposto generati** (gradienti caldi + etichetta pixel), così il sito è completo e funzionante.

**Moduli in `script.js`** (inizializzati in base agli elementi presenti nella pagina):
1. `loader` · 2. `smoothScroll` (Lenis + GSAP ticker) · 3. `cursor` · 4. `nav` (hide/show, menu mobile) · 5. `pageTransition` (wipe pixel) · 6. `splitText` (split lettere/parole) · 7. `pixelReveal` (canvas depixelazione) · 8. `heroScene` · 9. `counters` · 10. `missionScrub` · 11. `filmstrip` (Scena 2) · 12. `storyScene` (Scena 3) · 13. `gallery` (filtri + masonry) · 14. `lightbox` · 15. `faq` · 16. `contactForm` · 17. `xpBar`.

**Performance:**
- Immagini in WebP/AVIF con `srcset`, `loading="lazy"`, `decoding="async"`, dimensioni esplicite (no layout shift); hero con `fetchpriority="high"`.
- Effetto pixel: canvas disegnato una volta per step, nessun ricalcolo per frame oltre al necessario; disconnesso quando fuori viewport.
- Grana come piccola texture/canvas ripetuta e animata con `steps()`, non a ogni frame.
- Solo `transform` e `opacity` nelle animazioni; `will-change` solo durante l'animazione.
- Font con `display=swap` e `preconnect`.
- `prefers-reduced-motion`: niente Lenis, niente pin, niente depixelazione; contenuti subito visibili.
- Obiettivo Lighthouse ≥ 90 su Performance e Accessibility.

**SEO / meta:** `<title>` e description per pagina, Open Graph con og-image, `lang="it"`, HTML semantico (header/main/section/footer), un solo `h1` per pagina.

**Deploy:** il repo attuale contiene un sito Astro e un workflow GitHub Pages basato su Astro. Il nuovo sito statico lo sostituisce: il workflow `.github/workflows/deploy.yml` va aggiornato per pubblicare la cartella `Website portfolio/` così com'è (`actions/upload-pages-artifact` + `deploy-pages`), senza build. I file Astro (`src/`, `astro.config.mjs`, `package.json`…) vanno rimossi solo con conferma del cliente.

**Da fornire dal cliente (segnaposto finché mancano):**
- [ ] Fotografie del portfolio + nome personaggio, serie e @ del cosplayer per ognuna
- [ ] Foto per la storia (la prima Poison Ivy, se disponibile)
- [ ] Prezzi, durate e tempi di consegna reali
- [ ] Email, Instagram e altri social
- [ ] Nome esatto dell'evento fotografico di San Marino
- [ ] Endpoint del form (es. Formspree) oppure conferma per usare solo `mailto:`

**Checklist di completamento:**
- [ ] 4 pagine funzionanti con navigazione e transizioni
- [ ] Hero, stats, missione, pilastri, storia, montaggio, quest, CTA finale, footer in Home
- [ ] Galleria con filtri e lightbox (tastiera + swipe)
- [ ] Listino con 3 pacchetti e FAQ
- [ ] Form contatti con validazione e stato di successo
- [ ] Responsive verificato a 375 px, 768 px, 1440 px
- [ ] `prefers-reduced-motion` rispettato
- [ ] Nessun errore in console
