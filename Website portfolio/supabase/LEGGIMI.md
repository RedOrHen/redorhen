# Area admin: come attivarla con Supabase

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
3. Deve comparire "Success. No rows returned".

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
  (Row Level Security) create da `setup.sql`. Senza login il database non restituisce nulla.
- Gli appuntamenti creati in modalità demo restano nel browser e non vengono copiati su Supabase.
- Sul piano gratuito Supabase mette in pausa i progetti che non ricevono richieste per circa una
  settimana: se succede, riattivalo dalla dashboard con **Restore project**.
- Password dimenticata: cambiala da **Authentication** → **Users** → il tuo utente.
