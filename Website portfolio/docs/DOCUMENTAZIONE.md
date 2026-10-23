# RedOrHen — documentazione del sito

Documentazione dello stato attuale del sito portfolio di **RedOrHen, fotografia cosplay**.
Ultimo aggiornamento: 22 ottobre 2026.

- Sito pubblicato: <https://redorhen.github.io/redorhen/>
- Codice: cartella `Website portfolio/` del repository `RedOrHen/redorhen`
- Attivazione di Supabase passo per passo: [`supabase/LEGGIMI.md`](../supabase/LEGGIMI.md)
- Piano creativo iniziale (storico, non più aggiornato): [`BUILD-PLAN.md`](../BUILD-PLAN.md)

---

## 1. Cosa fa il sito

È il portfolio online di un fotografo cosplay. Serve a:

1. **mostrare i lavori**, organizzati in set di foto (un set = un personaggio o uno shooting) e filtrabili per categoria (evento o shooting);
2. **presentare il fotografo e il suo modo di lavorare** (storia, missione, come funziona uno shooting);
3. **mostrare il listino** dei pacchetti;
4. **ricevere richieste di shooting** tramite il modulo contatti;
5. dare al proprietario un'**area riservata** con il calendario degli appuntamenti e l'editor della galleria.

Il concept visivo è "**Pixel → Fotogramma**": un sito cinematografico (titoli enormi, barre letterbox, REC e timecode) con dettagli da videogioco in pixel art (etichette, livelli LV, quest, "+100 XP"). Le foto compaiono passando da pixel grossi a nitide.

---

## 2. Le pagine

| Pagina | File | Contenuto |
|---|---|---|
| Home | `index.html` | Hero con foto in cornice da cinepresa, numeri, missione, tre pilastri (ognuno con una foto dai set), storia in tre capitoli, pellicola orizzontale con i set in evidenza, "quattro quest" dello shooting, invito finale, footer |
| Lavori | `lavori.html` | Griglia dei set con filtri per categoria e per fiera (su telefono in righe che scorrono); clic su un set → visualizzatore a carosello |
| Listino | `listino.html` | Tre pacchetti (Side Quest 50 €, Main Quest 150 €, Boss Fight da 60 €), extra, tempi di consegna, domande frequenti |
| Contatti | `contatti.html` | Modulo di richiesta shooting (inviato con Formspree), link a email e Instagram |
| Area admin | `admin.html` | Login, calendario appuntamenti, editor dei set della galleria (vedi §5) |

L'area admin non è nel menu e non viene indicizzata dai motori di ricerca. Ci si arriva dall'indirizzo `admin.html`
oppure con **tre clic rapidi sul logo REDORHEN** in alto in qualunque pagina pubblica (un clic singolo porta alla Home).
È un accesso nascosto, non una protezione: la protezione è il login.

### Il visualizzatore delle foto (pagina Lavori)

- Mostra l'anteprima da 1600 px. La **versione a 4000 px** si scarica solo se serve: su schermi con più pixel
  dell'anteprima (4K, Retina) o appena si ingrandisce ("HD…" in un angolo mentre carica). Telefoni e schermi Full HD
  vedono già l'anteprima nitida, e così si risparmia il traffico mensile di Supabase (5 GB sul piano gratuito).
- **Zoom**: rotella o doppio clic con il mouse; pizzico o doppio tocco con le dita. Fino a 12×.
  Da ingrandita la foto **esce dalla cornice e riempie tutto lo schermo**, si sposta trascinandola fino ai suoi bordi
  e **tutti i comandi spariscono**. Si torna alla dimensione normale con doppio clic/tocco, pizzico, tasto `0` o `Esc`.
- **Tastiera**: `←` `→` cambia foto, `+` `-` `0` zoom, `Esc` riduce lo zoom o chiude.
- **Telefono**: la foto usa tutto lo schermo; titolo e miniature stanno sopra la foto; si cambia foto scorrendo col dito.
- **Desktop**: pulsante schermo intero; clic sullo sfondo chiude (solo a dimensione normale).

### Protezione delle foto

Sulle foto sono bloccati clic destro ("Salva immagine"), trascinamento e pressione lunga su telefono; al loro posto
compare "© RedOrHen — foto protette". È un deterrente: con gli strumenti del browser o uno screenshot una foto si può
comunque copiare. Per questo online c'è solo una versione a **4000 px** sul lato lungo, senza metadati (niente GPS
né dati della fotocamera): nitida su qualsiasi schermo, anche 4K, ma non l'originale da stampa, che resta solo sul tuo computer.

---

## 3. Struttura dei file

```
Website portfolio/
├─ index.html, lavori.html, listino.html, contatti.html   pagine pubbliche
├─ admin.html                                              area riservata
├─ style.css        stile di tutto il sito (token di colore, tipografia, componenti, visualizzatore)
├─ script.js        animazioni, effetto pixel, galleria, visualizzatore e zoom, modulo contatti
├─ admin.css        stile dell'area admin
├─ admin.js         login Supabase e calendario
├─ admin-gallery.js editor dei set (scheda Lavori dell'area admin)
├─ admin-promo.js   prezzi e sconti a tempo (scheda Listino dell'area admin)
├─ assets/
│  ├─ data/works.js         contatti del sito + set di riserva (vedi §4)
│  ├─ data/admin-config.js  indirizzo e chiave pubblica di Supabase
│  ├─ img/favicon.svg
│  └─ works/                immagini locali: hero.jpg, listino.jpg, contatti.jpg (immagini di riserva),
│                           fata-girasoli.jpg
├─ supabase/
│  ├─ setup.sql             tabelle, regole di sicurezza e spazio foto (da eseguire in Supabase)
│  └─ LEGGIMI.md            guida all'attivazione di Supabase
├─ docs/DOCUMENTAZIONE.md   questo file
└─ BUILD-PLAN.md            piano creativo iniziale (storico)
```

Restano solo sul computer e **non** vanno su GitHub (vedi `.gitignore`): `Media/`, `.taste-skill/`
(screenshot delle revisioni), `_upload/` (cartella temporanea di caricamento) e i file delle skill (`.claude/skills/`).

### Tecnologie

- HTML, CSS e JavaScript senza framework né build.
- Da CDN, con versioni fisse: GSAP 3.12.5 + ScrollTrigger (animazioni), Lenis 1.1.13 (scorrimento morbido),
  supabase-js 2.45.4 (solo nell'area admin).
- Font da Google Fonts: **Anton** (titoli), **Silkscreen** (dettagli pixel), **Manrope** (testo).
- Colori (in `style.css`, `:root`): nero caldo `#120B07`, arancione `#FF6A1A`, ambra `#FFB547`, ruggine `#B83A12`, crema `#F6E7D3`.
- Dati e foto: **Supabase** (database + spazio file). Modulo contatti: **Formspree**. Hosting: **GitHub Pages**.

---

## 4. Da dove arrivano i contenuti

### Set della galleria

1. **Supabase** (normale): tabella `gallery_sets` + spazio file `gallery`. Si gestiscono dall'area admin.
   Il sito pubblico legge solo i set **pubblicati** che hanno almeno una foto, nell'ordine scelto nell'editor.
2. **`assets/data/works.js`** (riserva): usato solo se Supabase non è configurato, non risponde entro 3,5 secondi
   o non contiene set pubblicati.
3. **Anteprima demo**: aggiungendo `?demo` all'indirizzo (es. `lavori.html?demo`) il sito usa i set creati in
   modalità demo e salvati solo in quel browser.

Ogni foto su Supabase ha due file nella cartella del suo set:
`<id>.jpg` (versione a 4000 px sul lato lungo, JPEG al 90%) e `<id>-anteprima.jpg` (1600 px, per griglia, miniature e pellicola).
Gli originali in alta risoluzione non vengono caricati.

### Foto della Home e della pagina Contatti

Si scelgono nell'editor dei set con gli interruttori **Hero** e **Contatti** sotto ogni foto (vedi §5).
Se non è scelta nessuna foto, o Supabase tarda più di circa un secondo, restano le immagini locali
`assets/works/hero.jpg` e `assets/works/contatti.jpg`. La foto della pagina Listino è sempre `assets/works/listino.jpg`.
La cornice di queste foto prende le proporzioni della foto scelta (verticale, orizzontale o quadrata), quindi la foto
non viene mai tagliata; nella Home una foto orizzontale occupa al massimo metà della larghezza dello schermo.

### Foto della storia e delle regole (Home)

Nell'editor dei set, sotto ogni foto, gli interruttori **Storia** e **Regole** scelgono le foto di queste due sezioni.
Se ne usano al massimo 3 per sezione, nell'ordine dei set e delle foto, e solo da set pubblicati.
Se ne scegli meno di 3 (o nessuna), i posti rimasti li riempie il sito con le copertine dei primi set.
Nella storia le cornici sono sempre verticali; nelle regole prendono le proporzioni della foto.

### Modulo contatti ed email di riepilogo

- Il pacchetto si sceglie tra LV.1, LV.2, Boss Fight per 2 o per 3 persone e Shooting in fiera
  (dal Listino arriva già selezionato). Il campo Instagram è facoltativo e finisce nel riepilogo dell'email. Sotto compaiono prezzo, eventuale sconto e, per la fiera, la caparra del 50%.
- L'email che arriva da Formspree ha l'oggetto "Nuova richiesta shooting · pacchetto · importo · nome" e il riepilogo
  in quest'ordine: pacchetto scelto, prezzo di listino, sconto applicato (con nome e scadenza), importo finale da pagare,
  caparra (solo fiera), poi nome, email, personaggio, data, messaggio e consenso privacy.
- Prezzi e sconti sono quelli della scheda Listino dell'area admin; se Supabase non risponde valgono i prezzi di riserva
  in `CHOICES` di `script.js` (uguali a quelli scritti nel Listino).

### Testi e contatti

- Testi delle pagine: direttamente nei file HTML.
- Email, Instagram e indirizzo Formspree: in `assets/data/works.js` → `window.SITE`.
  Se un campo è vuoto il link relativo viene nascosto.
- Il modulo contatti invia a Formspree (`formEndpoint`). Le email arrivano all'indirizzo collegato all'account Formspree;
  rispondendo all'email si risponde direttamente a chi ha scritto.

---

## 5. Area admin

Si entra con email e password dell'utente creato su Supabase (le iscrizioni pubbliche sono disattivate).
Il browser resta collegato finché non si preme **Esci**.

### Calendario

- Viste **Mese**, **Settimana**, **Giorno**; frecce e "Oggi".
- Appuntamenti con titolo, categoria colorata (Shooting, Evento, Editing, Consegna, Altro), data, orari o "tutto il giorno"
  (anche su più giorni), cosplayer/cliente, luogo e note.
- Clic su un giorno o un'ora per creare, clic su un appuntamento per modificarlo o eliminarlo.
- Trascinamento col mouse: nel mese su un altro giorno; in settimana/giorno per cambiare orario, e dal bordo in basso per cambiare durata.
- Scorciatoie: `N` nuovo, `T` oggi, `←` `→` periodo, `M` `S` `G` vista.
- Gli appuntamenti sono visibili solo dopo il login.

### Editor dei set (scheda Lavori)

- **+ Nuovo set**: personaggio, serie, categoria (diventa il filtro della pagina Lavori), **fiera** (secondo filtro della
  pagina Lavori; vuota per gli shooting fuori fiera), **anno**, cosplayer, pubblicato/bozza, "mostra nella pellicola della Home".
- Personaggio, serie, categoria, fiera e anno **suggeriscono i valori già usati** negli altri set. Se si scrive un valore
  che esiste già con maiuscole o spazi diversi (es. "lucca comics"), al salvataggio viene usato quello salvato ("Lucca Comics").
- **Set natalizi**: se la categoria contiene "Natal" (Natale, Natalizio, Natalizia), il set compare sul sito solo dal
  1° novembre al 6 gennaio compresi (galleria, filtri, Home e foto Hero/Contatti). Nell'area admin resta sempre visibile,
  con l'etichetta "Natale: 1 nov–6 gen".
- Il menu **Tutti gli anni** in alto mostra solo i set di un anno (o quelli senza anno); con un anno scelto ▲ ▼ sono disattivati.
- Anno e fiera richiedono le colonne `year` e `fair`: si creano una volta eseguendo `supabase/anno-fiera.sql`.
- **Foto**: si trascinano nel riquadro o si scelgono dal computer (JPG, PNG, WebP).
  - di qualsiasi peso: il browser le riduce a **4000 px** sul lato lungo (le più piccole restano come sono) e le salva
    in JPEG al 90%, togliendo i metadati; poi crea l'anteprima da 1600 px. Su Supabase non finisce mai l'originale.
  - durante il caricamento una barra e la **percentuale** mostrano l'avanzamento di tutte le foto scelte.
- **Riduci N foto a 4000 px** (compare solo se servono): converte le foto caricate prima di questa regola e
  **cancella definitivamente** da Supabase i loro originali in alta risoluzione, con barra e percentuale.
  Prima salva il set con i file nuovi (partendo dalla versione salvata in quel momento), poi cancella i vecchi. Le foto
  originali sul computer non vengono toccate. Durante la riduzione l'editor dei set non si apre: un salvataggio fatto
  nel frattempo annullerebbe la riduzione. Se una foto punta a un originale già cancellato ma la versione a 4000 px
  esiste, il pulsante la ricollega.
- **Ordine delle foto**: si trascinano le foto nella griglia. Col mouse basta prenderle e spostarle; sul telefono si tiene
  premuto un attimo e poi si sposta il dito (uno scorrimento veloce fa solo scorrere la finestra). Vicino al bordo
  la finestra scorre da sola. Da tastiera: Tab fino alla foto e frecce ← →. L'ordine si salva con **Salva**.
- Sotto ogni foto: ★ copertina (la prima foto è la copertina), ✕ togli,
  e gli interruttori **Hero** / **Contatti**: una sola foto per ciascuno in tutto il sito; scegliendone un'altra,
  quella di prima perde l'impostazione automaticamente (anche se sta in un altro set).
  La foto può stare anche in un set **non pubblicato**: il set non compare nei Lavori (etichetta "Solo Hero" / "Solo Contatti"),
  ma la foto scelta viene mostrata lo stesso nella Home o nella pagina Contatti.
- Nella lista: ▲ ▼ ordine dei set, **Modifica**, ✕ elimina (cancella anche le foto da Supabase).
  Le etichette sulla copertina indicano Hero, Contatti, ★ Home, Bozza, oppure "Solo Hero" / "Solo Contatti" per i set non pubblicati usati solo per quelle foto.
- **Importa da works.js**: copia su Supabase i set con foto vere presenti in `works.js`.
- **Vedi la pagina ↗** apre la pagina Lavori.

### Prezzi e sconti (scheda Listino)

**Prezzi.** In alto ci sono i prezzi dei pacchetti (LV.1, LV.2, Boss Fight per 2 e per 3 persone) e degli extra.
Si cambiano i numeri e si preme **Salva prezzi**: il Listino si aggiorna subito, senza push.
- Il prezzo "da" del Boss Fight è calcolato da solo: il più basso tra 2 e 3 persone.
- Accanto al prezzo di ogni pacchetto c'è il **numero di foto consegnate**: compare nella descrizione del pacchetto
  ("N foto ritoccate", "N foto consegnate", "N foto (di gruppo e singole)"). Si salva nella stessa tabella `price_items` con le chiavi `photos_*`.
- Negli extra il testo a destra viene scritto dopo il prezzo (es. "/ foto"); un prezzo vuoto mostra "Da concordare", un prezzo a 0 mostra "Inclusa".
- Serve la tabella `price_items`: si crea una volta eseguendo `supabase/prezzi.sql` (contiene già i prezzi di partenza).
  Se Supabase non risponde, il Listino mostra i prezzi scritti in `listino.html`.

**Sconti.** Sotto i prezzi, nella stessa scheda:

- Il modulo chiede: nome facoltativo (es. "Promo Halloween", si vede nel Listino), valore dello sconto in **%** o in **€**,
  primo e ultimo giorno (compresi), pacchetti a cui si applica (LV.1, LV.2, LV.3) e se è attivo.
  Sotto il modulo un esempio mostra subito i prezzi scontati.
- Nei giorni del periodo il Listino mostra una fascia con lo sconto, il prezzo pieno barrato e quello scontato
  (anche nei prezzi per 2 e 3 persone del Boss Fight). Gli extra non vengono scontati.
- Se più sconti valgono nello stesso giorno, per ogni pacchetto si applica quello più conveniente.
- Nella lista: **Modifica**, **Attiva/Disattiva** (lo sconto resta salvato ma non si vede), **Elimina**.
  Lo stato indica Attivo ora, Programmato, Scaduto o Disattivato.
- Serve la tabella `promotions`: si crea una volta eseguendo `supabase/sconti.sql` nell'SQL Editor di Supabase.
- Lo sconto si calcola sui prezzi salvati nella parte Prezzi.

---

## 6. Pubblicazione

- Ogni **push sul ramo `main`** avvia il workflow `.github/workflows/deploy.yml`, che copia i file del sito e li pubblica
  su GitHub Pages in circa un minuto (stato in <https://github.com/RedOrHen/redorhen/actions>).
- **Attenzione**: il workflow copia solo i file elencati nella riga `cp -r ...`. Se si aggiunge un nuovo file
  alla radice del sito (una nuova pagina o un nuovo script), va aggiunto anche lì, altrimenti non verrà pubblicato.
  La cartella `assets/` viene copiata tutta.
- Le modifiche ai **set e alle foto** fatte dall'area admin **non** richiedono push: sono su Supabase e il sito le legge subito.

### Cache e numero di versione

GitHub Pages fa conservare le pagine al browser per circa 10 minuti. Per questo i file CSS e JS sono richiamati con un
numero di versione, ad esempio `script.js?v=20261022d`.

- **Quando si modifica** `style.css`, `script.js`, `admin.css`, `admin.js`, `admin-gallery.js`, `admin-promo.js` o i file in `assets/data/`,
  aggiornare il numero `?v=` in **tutte** le pagine HTML (stesso valore ovunque), così i browser scaricano i file nuovi.
- Per vedere subito una pagina appena pubblicata senza aspettare la cache, aggiungere un parametro qualsiasi all'indirizzo,
  ad esempio `https://redorhen.github.io/redorhen/lavori.html?x=1`.

### Provare il sito sul computer

Serve un piccolo server locale (aprendo i file con doppio clic alcune funzioni non vanno). Per esempio, dalla cartella del repository:

```bash
npx --yes serve "Website portfolio"
```

oppure l'estensione **Live Server** di Visual Studio Code. Il sito locale legge gli stessi dati di Supabase del sito pubblicato.

---

## 7. Supabase in breve

Dettagli e procedura di attivazione in [`supabase/LEGGIMI.md`](../supabase/LEGGIMI.md); struttura in [`supabase/setup.sql`](../supabase/setup.sql).

| Risorsa | Contenuto | Chi può leggere | Chi può scrivere |
|---|---|---|---|
| tabella `appointments` | appuntamenti del calendario | solo il proprietario, dopo il login | solo il proprietario |
| tabella `gallery_sets` | set della galleria (testi, ordine, elenco foto, scelte Hero/Contatti) | i set pubblicati e quelli con la foto Hero/Contatti; le altre bozze solo il proprietario | solo il proprietario |
| tabella `price_items` | prezzi di pacchetti ed extra del Listino | tutti (servono al sito) | solo il proprietario |
| tabella `promotions` | sconti a tempo del Listino | gli sconti attivi nel periodo; tutti solo il proprietario | solo il proprietario |
| spazio file `gallery` | foto a 4000 px e anteprime | tutti (servono al sito) | solo il proprietario |

- La chiave in `admin-config.js` è quella **publishable/anon**, fatta per stare nel codice pubblico: la sicurezza
  è data dalle regole del database. **Mai** usare la chiave `secret` / `service_role` nel sito.
- Limite per file: 20 MB (una foto a 4000 px pesa circa 2–5 MB). Spazio del piano gratuito: 1 GB in tutto (Project Settings → Usage).
- Il piano gratuito mette in pausa il progetto dopo circa una settimana senza visite: riattivarlo da **Restore project**.
  Nel frattempo la pagina Lavori mostra i set di riserva di `works.js`.

---

## 8. Accessibilità e prestazioni

- Chi ha attivo "Riduci movimento" nel sistema vede il sito senza animazioni, con tutti i contenuti subito visibili.
- Se GSAP/Lenis non si caricano (blocco delle CDN), il sito funziona comunque senza animazioni.
- Titolo e foto della Home sono visibili entro il primo secondo; non c'è schermata di caricamento.
- Tutti i comandi sono raggiungibili da tastiera; il visualizzatore tiene il focus al suo interno; campi obbligatori segnalati con `*`.
- Pulsanti e comandi touch alti almeno 44 px; testi non sotto i 13 px.
- La griglia e la pellicola usano le anteprime leggere; le versioni a 4000 px si scaricano solo nel visualizzatore.

---

## 9. Problemi frequenti

| Problema | Causa probabile | Cosa fare |
|---|---|---|
| Dopo un push il sito sembra uguale | cache del browser / GitHub Pages | aspettare ~10 minuti o aprire l'indirizzo con `?x=1`; controllare di aver aggiornato `?v=` |
| La pagina Lavori mostra i vecchi set di riserva | Supabase in pausa, non raggiungibile o senza set pubblicati | dashboard Supabase → Restore project; controllare che i set siano "Pubblicati" |
| Caricamento foto rifiutato ("limite più basso di 20 MB") | limite del contenitore `gallery` | SQL: `update storage.buckets set file_size_limit = 20971520 where id = 'gallery';` |
| Login admin: "Email logins are disabled" | provider Email spento in Supabase | Authentication → Sign In / Providers → attivare Email (lasciando spente le iscrizioni) |
| Il modulo contatti non arriva | email Formspree non confermata | confermare l'indirizzo dall'email di Formspree, controllare lo spam |
| Lo sconto non compare nel Listino | tabella `promotions` mancante, sconto disattivato o fuori periodo | eseguire `supabase/sconti.sql`; controllare date e interruttore Attivo |
| Un nuovo file non è online | non è nell'elenco del workflow | aggiungerlo alla riga `cp -r` di `.github/workflows/deploy.yml` |

---

## 10. Storia delle modifiche principali

- **Ottobre 2026**
  - Sito statico che sostituisce il vecchio sito Astro: Home, Lavori, Listino, Contatti.
  - Galleria a set con visualizzatore; Instagram e modulo contatti collegati (Formspree).
  - Area admin con Supabase: calendario appuntamenti ed editor dei set; accesso nascosto con tre clic sul logo.
  - Foto originali fino a 20 MB con riduzione automatica oltre il limite; anteprime per la griglia; zoom e protezione delle foto.
  - Revisione di design e accessibilità (skill *taste* e *impeccable*): niente loader, titoli su due righe, meno etichette, campi obbligatori, pulsanti touch da 44 px.
  - Listino con i prezzi reali; 20 foto 2025–2026 caricate e divise per categoria.
  - Visualizzatore più grande; zoom a tutto schermo su telefono e desktop; comandi nascosti da ingrandita.
  - Scelta della foto della Home e della pagina Contatti dall'area admin (interruttori Hero / Contatti).
  - Seconda revisione: pilastri della Home con foto, filtri di Lavori in una riga su telefono, meno spazi vuoti.
  - Online solo foto a 4000 px senza metadati (originali da 20 MB cancellati); percentuale di caricamento nell'editor.
  - Campi Anno e Fiera con suggerimenti dai valori già salvati; filtro per fiera nella pagina Lavori; caparra del 50% per la fiera
    nel Listino; email di riepilogo con pacchetto, sconto e importo finale.
  - Extra del Listino aggiornati; prezzi e sconti a tempo modificabili dall'area admin (scheda Listino).
  - Revisione dei testi: tempi di consegna (provini in 2 settimane, foto ritoccate in un mese), trasferta inclusa,
    shooting in fiera di circa 30 minuti, caparra in contanti o PayPal, 4 nuove domande frequenti, campo Instagram
    facoltativo nel modulo, frasi neutre per genere.
  - Anteprima social: immagini dei meta tag con indirizzo completo (https://redorhen.github.io/redorhen/…) e descrizione
    propria per Lavori, Listino e Contatti.
  - Ordine delle foto di un set col trascinamento (mouse e touch) al posto delle frecce ◀ ▶.
