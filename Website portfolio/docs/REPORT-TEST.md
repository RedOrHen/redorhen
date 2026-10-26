# RedOrHen — report dei test

Risultati dei controlli fatti sul sito pubblicato (<https://redorhen.github.io/redorhen/>).
Per come è fatto il sito vedi [DOCUMENTAZIONE.md](DOCUMENTAZIONE.md).

---

## 1. Test di carico — 23 ottobre 2026

**Domanda:** se più persone usano il sito insieme (consultano i set, scorrono le pagine, inviano richieste) ci sono problemi?

**Risposta breve:** no. Pagine, dati e foto hanno retto tutte le prove. Il limite vero sono le quote mensili dei piani
gratuiti di Supabase (traffico delle foto) e di Formspree (richieste dal modulo).

### Cosa è stato simulato

Il test è partito da un solo computer, con richieste vere al sito online. Nessun invio dal modulo contatti durante il
test di carico (ogni invio è un'email vera e consuma la quota). Traffico usato dal test: circa 120 MB.

| Prova | Richieste | Esito | Tempi |
|---|---|---|---|
| 50 visitatori insieme aprono tutte le pagine e leggono set, prezzi e sconti | 550 | tutte ok | dati da Supabase circa 0,12 s; pagine circa 1 s (massimo 3,8 s) |
| 20 visitatori sfogliano la galleria (8 anteprime ciascuno, tutte insieme) | 160 | 142 ok, 18 errori di connessione | — |
| Stessa prova in modo realistico (ogni visitatore scarica le sue anteprime una dopo l'altra) | 80 | tutte ok | circa 1 s; una anteprima da sola 0,2 s |
| 10 visitatori aprono il visualizzatore (2 foto grandi ciascuno) | 20 | tutte ok | — |
| 100 richieste di dati nello stesso istante | 100 | tutte ok | circa 1,2 s |

Gli errori della seconda prova dipendevano dal test e non dal sito: 160 download partivano nello stesso istante da un
solo computer, su una linea da circa 30 Mbit/s. I visitatori veri hanno ognuno la propria connessione. Per lo stesso
motivo i tempi delle foto misurano la linea di chi ha fatto il test.

### Perché il sito regge

- Le pagine sono file statici su GitHub Pages, fatti per reggere moltissime visite.
- Ogni visitatore lavora nel proprio browser: scroll, filtri, zoom e visualizzatore non si influenzano tra loro.
- Supabase riceve solo letture leggere (set, prezzi, sconti), che hanno sempre risposto subito.

### Limiti da tenere d'occhio

| Servizio | Limite del piano gratuito | Cosa succede se si supera | Dove controllare |
|---|---|---|---|
| Supabase, traffico | 5 GB al mese | Supabase può limitare il progetto: le foto potrebbero non caricarsi | Supabase → Project Settings → Usage |
| Formspree | 50 richieste al mese | il modulo smette di inviare; il visitatore vede l'invito a scrivere su Instagram. Avvisi via email al 50%, 75% e 90% | dashboard di Formspree |

Peso delle foto al momento del test: anteprime circa 270 KB, foto grandi circa 2 MB (mediana 1,9 MB).

### Cosa è stato fatto dopo il test

- **Meno traffico dal visualizzatore:** la foto da 4000 px si scarica solo su schermi molto definiti (4K, Retina) o quando
  si ingrandisce; telefoni e schermi Full HD vedono l'anteprima da 1600 px, già nitida. Una visita che apre 2–3 set passa
  da circa 15–20 MB a circa 5–8 MB, quindi le visite possibili ogni mese più che raddoppiano.
- **Due foto di "Gotham City Sirens" rotte:** puntavano a file originali già cancellati. La riduzione a 4000 px era stata
  annullata da un salvataggio del set fatto mentre la riduzione era in corso. Il pulsante **Riduci foto a 4000 px**
  ora ricollega la versione a 4000 px se l'originale manca, e durante la riduzione l'editor dei set non si apre.
  **Da fare:** area admin → Lavori → premere **Riduci 2 foto a 4000 px**.
- **Email di prova:** inviata una richiesta vera dal sito (pacchetto LV.2, sconto "Promo Halloween"); Formspree l'ha accettata.

---

## 2. Controllo di sicurezza — 26 ottobre 2026

**Domanda:** il sito è protetto contro gli attacchi?

Il controllo è stato fatto solo con letture, usando la chiave pubblica che sta nel codice del sito: è quello che può
fare chiunque. Nessun tentativo di scrittura sul database.

### Cosa è già protetto

| Controllo | Esito |
|---|---|
| Un estraneo può leggere gli appuntamenti del calendario? | No: Supabase risponde "permission denied" |
| Può creare un account per entrare nell'area admin? | No: le iscrizioni sono disattivate |
| Può elencare i file dell'archivio foto? | No: l'elenco risulta vuoto |
| Può modificare set, prezzi o sconti? | No: le regole del database permettono di scrivere solo al proprietario dopo il login |
| Ci sono chiavi segrete nel codice pubblico? | No: c'è solo la chiave pubblica (publishable), fatta per stare nel sito |
| I testi presi dal database finiscono nella pagina senza filtri? | No: vengono ripuliti prima di essere mostrati |

Cosa un estraneo **può** leggere, ed è voluto: i set pubblicati (e quelli con la foto Hero/Contatti), i prezzi del
Listino e gli sconti attivi nel loro periodo.

### Miglioramenti proposti (non ancora fatti)

Nel codice del sito:

1. **Controllo di integrità delle librerie esterne (SRI):** le librerie caricate da cdnjs e jsdelivr avrebbero una loro
   "impronta"; se venissero manomesse sul server esterno, il browser non le eseguirebbe.
2. **Regole su cosa può caricare la pagina (Content Security Policy):** script solo dal sito e dai servizi usati; dati
   inviati solo a Supabase e Formspree.
3. **Area admin protetta dalle pagine trappola (clickjacking):** l'area admin non si apre dentro un altro sito.
4. **Codice a 6 cifre per entrare nell'area admin (facoltativo):** oltre alla password, il codice di un'app come
   Google Authenticator.

Da fare negli account (la protezione più importante: chi controlla questi account controlla il sito):

- verifica in due passaggi su GitHub, Supabase, Formspree e sulla casella email;
- password dell'area admin lunga e usata solo lì;
- se arriva spam dal modulo, attivare il controllo anti-bot nelle impostazioni di Formspree (il modulo ha già un campo nascosto anti-spam);
- controllare ogni tanto i consumi di Supabase: scaricare molte volte le foto è un modo per esaurire i 5 GB mensili.
