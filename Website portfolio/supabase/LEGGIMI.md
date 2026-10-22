# Area admin: come attivarla con Supabase

> Documentazione completa del sito: [docs/DOCUMENTAZIONE.md](../docs/DOCUMENTAZIONE.md).

L'area admin ha due schede:

- **Calendario**: i tuoi appuntamenti (visibili solo a te).
- **Lavori**: crei, modifichi, riordini ed elimini i set di foto della pagina Lavori e carichi le foto
  dal browser. Appena c'è almeno un set pubblicato con foto, il sito pubblico mostra quelli al posto
  di `works.js`. Con **Importa da works.js** copi su Supabase i set che hai già nel file.

L'area admin è all'indirizzo `admin.html` del sito (es. `https://redorhen.github.io/redorhen/admin.html`).
Non è collegata dal menu e i motori di ricerca non la indicizzano.

Finché `assets/data/admin-config.js` è vuoto funziona in **modalità demo**: gli appuntamenti
restano solo nel browser che stai usando. Per avere login e appuntamenti salvati in modo sicuro
e visibili da qualsiasi dispositivo, segui questi passi (circa 10 minuti).

## 1. Crea il progetto

1. Vai su <https://supabase.com> e crea un account gratuito.
2. **New project** → dagli un nome (es. `redorhen`), scegli una password per il database
   (salvala in un posto sicuro, non serve al sito) e la regione **Europe** più vicina.
3. Aspetta un paio di minuti che il progetto sia pronto.

## 2. Crea la tabella degli appuntamenti

1. Nel menu a sinistra: **SQL Editor** → **New query**.
2. Copia tutto il contenuto di `supabase/setup.sql`, incollalo e premi **Run**.
   Se il progetto era già attivo prima della scheda **Sconti**, basta eseguire allo stesso modo `supabase/sconti.sql` e `supabase/prezzi.sql`.
3. Deve comparire "Success. No rows returned". Lo script crea anche la tabella dei set e lo spazio
   "gallery" per le foto (lettura pubblica, caricamento solo dopo il login).

## 3. Blocca le iscrizioni e crea il tuo utente

1. **Authentication** → **Sign In / Providers** (o **Providers** → **Email**):
   disattiva **Allow new users to sign up**. Così nessun altro può crearsi un account.
2. **Authentication** → **Users** → **Add user** → **Create new user**:
   inserisci la tua email e una password robusta, spunta **Auto Confirm User** e conferma.

## 4. Collega il sito

1. **Project Settings** → **API Keys** (o **API**).
2. Copia il **Project URL** e la chiave **anon / public** (oppure la **publishable key**).
   **Non usare mai la chiave `service_role` / `secret`**: darebbe accesso completo al database.
3. Incollali in `assets/data/admin-config.js`:

   ```js
   window.ADMIN_CONFIG = {
     supabaseUrl: 'https://xxxxxxxx.supabase.co',
     supabaseAnonKey: 'eyJhbGciOi...'
   };
   ```

4. Pubblica (push su `main`) e apri `admin.html`: ti chiederà email e password.

## Da sapere

- La chiave anon è pubblica per scelta di Supabase: la sicurezza è data dalle regole
  (Row Level Security) create da `setup.sql`. Senza login si possono solo leggere i set pubblicati
  della galleria (servono al sito); gli appuntamenti e i set in bozza restano invisibili.
- Appuntamenti e set creati in modalità demo restano nel browser e non vengono copiati su Supabase.
  In demo puoi vedere l'anteprima della galleria su `lavori.html?demo`.
- Le foto vengono caricate in una **versione a 4000 px** sul lato lungo (circa 2–5 MB l'una, senza metadati),
  più un'anteprima leggera per la griglia; gli originali restano solo sul tuo computer. Il piano gratuito
  include 1 GB di spazio: sono circa 200–400 foto. Se ti serve più spazio, il piano Pro di Supabase ne include 100 GB.
- Sul piano gratuito Supabase mette in pausa i progetti che non ricevono richieste per circa una
  settimana: se succede, riattivalo dalla dashboard con **Restore project**.
- Password dimenticata: cambiala da **Authentication** → **Users** → il tuo utente.
