# Guida ai file del progetto — Barber Shop App

## 📁 File in radice

| File | Cosa fa |
|---|---|
| `index.html` | Pagina cliente: codice di accesso, calendario, scelta orario, servizio, dati (guest o login), conferma, area "Il mio account". |
| `admin.html` | Pagina admin: login email+password, dashboard con 3 tab (Prenotazioni, Disponibilità, Orari Apertura). |
| `style.css` | Unico foglio di stile per entrambe le pagine. Tema scuro/oro, font Playfair Display (titoli) + DM Sans (testo). |
| `script.js` | Tutta la logica JS della pagina cliente: calendario, step, chiamate agli endpoint `/api/*.php`. |
| `admin.js` | Tutta la logica JS della dashboard admin: login, tab, tabelle, calendario disponibilità, editor orari. |
| `vercel.json` | Dice a Vercel di eseguire i file `api/*.php` col runtime PHP (`vercel-php`). Senza questo, Vercel non saprebbe come far girare PHP. |
| `composer.json` | Dichiara la dipendenza PHPMailer (per l'invio email via Gmail). Vercel esegue `composer install` da solo durante il deploy, leggendo questo file. |
| `.vercelignore` | Dice a Vercel di non caricare la cartella `/vendor` (viene rigenerata in automatico da Composer ad ogni deploy). |
| `.gitignore` | File/cartelle che Git non deve tracciare (es. `.DS_Store`, `node_modules`). |
| `README.md` | Istruzioni di setup: migrazioni SQL, environment variables, Gmail, deploy. |
| `supabase_migration_v2.sql` | Script SQL da eseguire una volta su Supabase: aggiunge le colonne/tabelle della v2 (`business_hours`, `slots.is_open`, `appointments.service/notes`). |

---

## 🗄️ Database (Supabase)

Tabelle principali (create dalla migrazione originale + v2):

| Tabella | Cosa contiene |
|---|---|
| `settings` | Riga singola con `access_code` (il codice che i clienti inseriscono per entrare nel sito). |
| `admins` | Elenco degli `user_id` di Supabase Auth autorizzati come admin. |
| `business_hours` | Il "template" settimanale: per ogni giorno (1=Lun...6=Sab) e ogni orario, se è attivo o no. Da qui vengono generati gli slot delle date future. |
| `slots` | Gli slot concreti per una data specifica (generati automaticamente dal template la prima volta che qualcuno apre quella data). Ha `is_open` (l'admin può disattivarlo) e `is_booked` (diventa `true` quando qualcuno prenota). |
| `appointments` | Le prenotazioni: nome, telefono, email, servizio, note, collegate a uno `slot_id`. |

---

## 🔧 `api/config.php` e `api/supabase.php` — le fondamenta

**`config.php`**: legge tutte le chiavi/segreti dalle Environment Variables di Vercel (mai scritte nel codice). Definisce anche i nomi dei cookie di sessione (admin e cliente).

**`supabase.php`**: la "cassetta degli attrezzi" usata da quasi tutti gli altri file PHP:
- `restRequest()` — parla con le tabelle Supabase (PostgREST) via cURL
- `authRequest()` / `getUserFromToken()` — parla con Supabase Auth (login/signup/verifica token)
- `requireAdmin()` — blocca la richiesta con errore 401/403 se chi chiama non è admin
- `requireCustomer()` — blocca la richiesta se il cliente non è loggato
- `ensureSlotsForDate($data)` — **funzione chiave**: se per una data non esistono ancora slot, li genera leggendo `business_hours` per quel giorno della settimana
- `readJsonBody()` — legge il body JSON di una richiesta POST

Ogni altro file in `api/` fa `require_once` di questi due, quindi se cambi qualcosa qui si riflette ovunque.

**`emails.php`**: costruisce e invia l'email di conferma prenotazione via Gmail SMTP (libreria PHPMailer). Se `GMAIL_USER`/`GMAIL_APP_PASSWORD` non sono impostate, non fa nulla (nessun errore).

---

## 🌐 Endpoint pubblici (li chiama `script.js`, nessun login richiesto)

| File | Cosa fa |
|---|---|
| `check-access.php` | Riceve un codice, lo confronta con `settings.access_code`, risponde `{valid: true/false}`. |
| `get-month-availability.php` | Per un mese, dice quali giorni sono chiusi (per disabilitarli nel calendario cliente). |
| `get-slots.php` | Per una data, restituisce gli slot liberi (aperti e non prenotati). Genera gli slot al volo se non esistono ancora. |
| `create-appointment.php` | Salva una prenotazione. Ricontrolla che lo slot sia ancora libero (evita doppie prenotazioni), poi invia l'email di conferma. |
| `auth.php` | Login e registrazione cliente (parla con Supabase Auth). Su successo, imposta il cookie di sessione cliente. |
| `ical-customer.php` | Genera il file `.ics` della singola prenotazione di un cliente (link "Aggiungi al calendario"). |
| `ical.php` | Genera il file `.ics` con **tutte** le prenotazioni, protetto da `?token=...` — è quello che il barbiere iscrive su Apple Calendar. |

---

## 🔒 Endpoint area cliente ("Il mio account")

| File | Cosa fa |
|---|---|
| `account-check.php` | Dice se il cookie del cliente corrisponde a una sessione valida. |
| `account-appointments.php` | Restituisce tutte le prenotazioni fatte da quel cliente loggato. |
| `account-logout.php` | Cancella il cookie di sessione cliente. |

---

## 🔐 Endpoint admin (richiedono login admin, tutti passano da `requireAdmin()`)

| File | Cosa fa |
|---|---|
| `admin-login.php` | Login con email+password via Supabase Auth, verifica che l'utente sia nella tabella `admins`, imposta il cookie di sessione admin. |
| `admin-settings.php` | GET/POST del codice di accesso clienti (tab "Orari Apertura" → card in alto). |
| `admin-check.php` | Dice se il cookie admin è valido (usato all'apertura della dashboard). |
| `admin-logout.php` | Cancella il cookie admin. |
| `admin-appointments.php` | Elenco prenotazioni per la tab "Prenotazioni", con filtri (prossime/tutte/per data) e statistiche (totale, oggi). |
| `admin-hours.php` | GET: orari del template settimanale per un giorno. POST: attiva/disattiva un singolo orario. |
| `admin-hours-add.php` | Aggiunge un nuovo orario personalizzato al template di un giorno. |
| `admin-hours-reset.php` | Cancella il template di un giorno e lo ricrea con i valori di default (9-13/15-19 o 9-13/15-17 per sabato). |
| `admin-availability-month.php` | Per la tab "Disponibilità": stato di ogni giorno del mese (aperto/chiuso/parziale) per colorare i puntini nel calendario. |
| `admin-day-detail.php` | Dettaglio di tutti gli slot di una data specifica, incluso il nome del cliente se lo slot è prenotato. |
| `admin-toggle-slot.php` | Apre/chiude un singolo slot. |
| `admin-toggle-day.php` | Apre/chiude tutti gli slot di un'intera giornata in un colpo solo. |

---

## 🔁 Come si collegano le cose (flusso tipico)

**Cliente prenota:**
`index.html` + `script.js` → `check-access.php` → `get-month-availability.php` + `get-slots.php` (che internamente chiama `ensureSlotsForDate()` in `supabase.php`) → `create-appointment.php` (che chiama `emails.php` per la conferma) → il cliente riceve un link a `ical-customer.php`.

**Barbiere gestisce gli orari:**
`admin.html` + `admin.js` → `admin-login.php` (imposta cookie) → tab "Orari Apertura" usa `admin-hours*.php` per modificare il template → tab "Disponibilità" usa `admin-availability-month.php` + `admin-day-detail.php` + `admin-toggle-*.php` per eccezioni su date specifiche → tab "Prenotazioni" usa `admin-appointments.php`.

**Sincronizzazione calendario:**
il barbiere si iscrive a `ical.php?token=...` da iPhone/Mac; il cliente clicca il pulsante che punta a `ical-customer.php?id=...` per la sua singola prenotazione.
