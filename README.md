# Barber Shop App — Checklist di Setup

File pronti. Segui questo ordine per andare live.

## 1. Supabase — Database
1. Crea un progetto su https://supabase.com (piano Free).
2. Vai su **SQL Editor → New Query**, incolla tutto il contenuto di `supabase_setup.sql` ed esegui (**Run**).
3. Vai su **Authentication → Users → Add User**, crea il tuo utente barbiere (email + password).
4. Copia il suo **UUID**, torna su SQL Editor ed esegui:
   ```sql
   insert into admins (user_id) values ('INCOLLA-QUI-UUID-UTENTE');
   ```
5. Vai su **Project Settings → API** e copia:
   - **Project URL**
   - **anon public key**

## 2. Configura `config.js`
Apri `config.js` e sostituisci:
```javascript
const SUPABASE_URL = 'https://TUO-PROGETTO.supabase.co';
const SUPABASE_ANON_KEY = 'TUA-ANON-KEY-PUBBLICA';
const ICAL_SECRET_TOKEN = 'INSERISCI-QUI-LA-STESSA-STRINGA-SEGRETA'; // vedi step 3
```

## 3. Edge Function — Apple Calendar Sync
```bash
npm install -g supabase
supabase login
supabase link --project-ref TUO-PROJECT-REF
supabase secrets set ICAL_SECRET_TOKEN=una-stringa-casuale-lunga-e-sicura
supabase functions deploy ical-feed --no-verify-jwt
```
⚠️ Usa la **stessa identica stringa** sia nel comando `secrets set` sia in `ICAL_SECRET_TOKEN` dentro `config.js`.

## 4. Deploy su GitHub Pages
```bash
git init
git add .
git commit -m "Prima versione Barber Shop App"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/TUO-REPO.git
git push -u origin main
```
Poi su GitHub: **Settings → Pages → Source: Deploy from branch → main → / (root) → Save**.

Il sito sarà live su:
`https://TUO-USERNAME.github.io/TUO-REPO/`

## 5. Test rapido
- Apri il sito, inserisci il codice `BARBER2026` (o quello che hai impostato in `settings`).
- Vai su `/admin.html`, fai login con l'utente admin, apri qualche slot per oggi/domani.
- Torna sul sito principale e verifica che gli slot appaiano e che la prenotazione vada a buon fine.
- Copia il link iCal dalla dashboard admin e iscrivi il tuo iPhone/Mac.

## Struttura file
```
barbershop-app/
├── index.html              # Frontend cliente
├── admin.html               # Dashboard barbiere
├── style.css                 # Stile condiviso
├── app.js                     # Logica cliente
├── admin.js                  # Logica admin
├── config.js                 # Chiavi Supabase (da compilare)
├── supabase_setup.sql   # Script SQL da eseguire una volta
└── supabase/functions/ical-feed/index.ts   # Edge Function iCal
```
