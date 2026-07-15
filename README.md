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
Restano le stesse di prima — nessuna nuova variabile richiesta:
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `ICAL_SECRET_TOKEN`.

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
