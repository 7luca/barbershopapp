# Barber Shop App — Versione PHP + Vercel

Il database Supabase (tabelle + RLS) resta quello già creato in precedenza: **non serve rifare nulla lì**.

Cambia solo il modo in cui il sito parla con Supabase: ora lo fa un backend PHP (in `/api`),
non più il browser direttamente. Frontend statico invariato nell'aspetto.

## 1. Variabili d'ambiente su Vercel
Vai su **Vercel → il tuo progetto → Settings → Environment Variables** e aggiungi:

| Nome | Valore | Dove trovarlo |
|---|---|---|
| `SUPABASE_URL` | `https://TUO-PROGETTO.supabase.co` | Supabase → Project Settings → API |
| `SUPABASE_ANON_KEY` | la anon public key | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_KEY` | la **service_role** key (segreta!) | Supabase → Project Settings → API |
| `ICAL_SECRET_TOKEN` | una stringa a caso, lunga e casuale | generala tu (es. da un password manager) |

⚠️ `SUPABASE_SERVICE_KEY` bypassa tutte le RLS: non deve MAI arrivare al browser.
Qui resta solo lato server (dentro le funzioni PHP), quindi è sicura.

Dopo aver aggiunto le variabili, fai un **redeploy** del progetto perché vengano applicate.

## 2. Aggiorna il token iCal nel codice
Apri `admin.js` e sostituisci:
```javascript
const ICAL_TOKEN = 'INSERISCI-QUI-LA-STESSA-STRINGA-SEGRETA';
```
con lo stesso valore che hai messo in `ICAL_SECRET_TOKEN` su Vercel.

## 3. Deploy
Dato che Vercel è già collegato al tuo GitHub:
```bash
git init
git add .
git commit -m "Versione PHP su Vercel"
git branch -M main
git remote add origin https://github.com/7luca/barbershopapp.git
git push -u origin main
```
Poi su Vercel: **Add New → Project → Import** il repo (se non l'hai già collegato) — il deploy parte da solo grazie a `vercel.json`.

Ad ogni push su `main`, Vercel farà il deploy automaticamente.

## 4. Crea l'utente admin (se non l'hai già fatto)
Su Supabase → Authentication → Users → Add User, poi:
```sql
insert into admins (user_id) values ('UUID-DEL-TUO-UTENTE');
```

## 5. Test
- Apri `https://TUO-PROGETTO.vercel.app`, inserisci il codice di accesso.
- Vai su `/admin.html`, fai login, apri qualche slot.
- Prova una prenotazione da `index.html` e verifica che compaia in dashboard.
- Copia il link iCal e iscrivilo su iPhone/Mac.

## Struttura file
```
barbershop-php/
├── index.html              # Frontend cliente (statico)
├── admin.html               # Dashboard barbiere (statico)
├── style.css                 # Stile condiviso
├── app.js                     # Logica cliente → chiama /api/*.php
├── admin.js                  # Logica admin → chiama /api/*.php
├── vercel.json                # Config runtime PHP
└── api/
    ├── config.php             # Legge le env vars
    ├── supabase.php          # Helper cURL verso Supabase REST/Auth
    ├── check-access.php     # Verifica codice di accesso
    ├── get-slots.php          # Slot disponibili per una data
    ├── create-appointment.php # Salva una prenotazione
    ├── auth.php                # Login/signup cliente
    ├── admin-login.php       # Login admin (imposta cookie httpOnly)
    ├── admin-check.php       # Verifica sessione admin
    ├── admin-logout.php     # Elimina il cookie
    ├── admin-slots.php       # Elenco/creazione slot (admin)
    ├── admin-delete-slot.php # Eliminazione slot (admin)
    ├── admin-appointments.php # Elenco prenotazioni (admin)
    └── ical.php                 # Feed .ics per Apple Calendar
```

## Note tecniche importanti
- **Niente `$_SESSION` PHP**: Vercel è serverless, ogni richiesta può girare su un'istanza diversa,
  quindi le sessioni file-based non sono affidabili. L'autenticazione admin usa invece un
  **cookie httpOnly** con l'access_token di Supabase, verificato ad ogni richiesta.
- Il cookie scade dopo ~1 ora (durata del token Supabase): se l'admin resta loggato più a lungo,
  dovrà rifare il login. Per un uso quotidiano da parte di un singolo barbiere è sufficiente;
  se vuoi sessioni più lunghe, si può implementare il refresh_token in un secondo momento.
- Il database e le RLS **non sono stati toccati**: restano quelli già funzionanti.
