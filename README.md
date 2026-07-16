# Barber Shop App — v2 (nuovo design + orari settimanali)

## Cosa è cambiato rispetto alla versione precedente
- **Design**: nuovo tema scuro/oro, calendario visuale, servizio e note nella prenotazione.
- **Orari**: invece di aggiungere manualmente ogni slot per ogni data, ora configuri un
  **template settimanale** (tab "Orari Apertura") che genera automaticamente gli slot
  quando un cliente (o tu in "Disponibilità") apre una certa data per la prima volta.
- **Disponibilità**: puoi chiudere singoli slot o un'intera giornata per una data specifica,
  senza toccare il template settimanale.
- **iCal cliente**: dopo la conferma, il cliente ha un pulsante "Aggiungi al tuo calendario"
  per la sua singola prenotazione (oltre al feed admin con tutte le prenotazioni, invariato).
- **Autenticazione invariata**: codice di accesso per i clienti, guest o login/registrazione,
  login admin con email+password (tabella `admins` su Supabase, come prima).

## 1. Migrazione database
Vai su Supabase → SQL Editor → New Query, incolla ed esegui **`supabase_migration_v2.sql`**.
Le tabelle esistenti (`settings`, `slots`, `appointments`, `admins`) restano intatte:
questo script aggiunge solo nuove colonne (`slots.is_open`, `appointments.service`,
`appointments.notes`) e la nuova tabella `business_hours` con i default già precompilati
(Lun–Ven 9–13/15–19, Sab 9–13/15–17).

## 2. Environment Variables su Vercel
Oltre a `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `ICAL_SECRET_TOKEN`, aggiungi:

| Nome | Valore | Dove trovarlo |
|---|---|---|
| `GMAIL_USER` | il tuo indirizzo Gmail completo | es. `tuobarbiere@gmail.com` |
| `GMAIL_APP_PASSWORD` | una "password per le app" di 16 caratteri | vedi istruzioni sotto |
| `APP_BASE_URL` | `https://TUO-PROGETTO.vercel.app` | il dominio reale del tuo sito |

Senza `GMAIL_USER`/`GMAIL_APP_PASSWORD` l'invio email viene semplicemente saltato
(nessun errore, la prenotazione funziona comunque).

### Come generare la "password per le app" di Gmail
Gmail non accetta la tua password normale per l'invio via SMTP da un'app esterna. Serve una
password dedicata:
1. Vai su https://myaccount.google.com/security
2. Attiva la **verifica in due passaggi** se non è già attiva (obbligatoria per il passo successivo)
3. Vai su https://myaccount.google.com/apppasswords
4. Crea una nuova app password (dagli un nome a piacere, es. "Barber Shop App")
5. Copia il codice di 16 caratteri che ti viene mostrato (senza spazi) e usalo come `GMAIL_APP_PASSWORD`

Gmail permette circa 500 email al giorno con un account gratuito — più che sufficiente per un
singolo barbiere. Se in futuro cresci e ti serve un dominio email personalizzato/professionale,
si può passare a un servizio come Resend o Brevo senza cambiare il resto del codice (basta
riscrivere `api/emails.php`).

### Configurazione Supabase per la registrazione clienti
Vai su Supabase → Authentication → URL Configuration e imposta Site URL/Redirect URLs col dominio reale.
Poi su Authentication → Providers → Email, valuta se disattivare "Confirm email" per permettere
il login immediato dopo la registrazione (consigliato per questo tipo di app).

## Nuova area "Il mio account"
In alto a destra nella pagina cliente (dopo aver inserito il codice di accesso) compare un link
"🔑 Il mio account": permette a un cliente già registrato di accedere in qualsiasi momento
(non solo durante una prenotazione) e vedere l'elenco delle proprie prenotazioni, ciascuna con
il proprio link per aggiungerla al calendario personale.

## 3. Aggiorna il token iCal nel codice
In `admin.js`, cerca `ICAL_TOKEN` e sostituiscilo con lo stesso valore di `ICAL_SECRET_TOKEN`.

## 4. Deploy
```bash
git add .
git commit -m "v2: nuovo design + orari settimanali + iCal cliente"
git push
```
Vercel farà il deploy automaticamente.

## 5. Personalizzare gli orari
Vai su `/admin.html` → tab **Orari Apertura**, seleziona un giorno della settimana,
clicca sugli slot per attivarli/disattivarli, oppure aggiungine di nuovi con l'orario custom.
Il tab **Disponibilità** ti permette invece di chiudere un giorno o uno slot specifico
(es. per una data di ferie), senza cambiare il template settimanale.

## Nota sul file caricato
Nel tuo `index.html` originale, le sezioni hero/servizi/footer erano racchiuse dentro
un unico commento HTML (il tag `<!--` si apre prima dell'header e si chiude solo dopo il
footer), quindi non venivano renderizzate. Le ho lasciate fuori per coerenza con quel file;
se le vuoi visibili, dimmelo e le riattivo — bastano pochi minuti.
