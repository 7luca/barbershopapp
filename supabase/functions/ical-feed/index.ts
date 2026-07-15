// ============================================
// EDGE FUNCTION: ical-feed
// Genera un feed .ics con le prenotazioni per Apple Calendar
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Token segreto per proteggere l'endpoint (impostato come secret)
const ICAL_SECRET_TOKEN = Deno.env.get('ICAL_SECRET_TOKEN') ?? '';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Client con service_role: bypassa RLS perché gira solo lato server
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------
// Helper: formatta una data/ora in formato iCal (UTC)
// Esempio: 2026-07-15 09:00:00 -> 20260715T090000Z
// ---------------------------------------------
function toIcalDateTime(dateStr: string, timeStr: string): string {
  const dt = new Date(`${dateStr}T${timeStr}`);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    dt.getUTCFullYear().toString() +
    pad(dt.getUTCMonth() + 1) +
    pad(dt.getUTCDate()) +
    'T' +
    pad(dt.getUTCHours()) +
    pad(dt.getUTCMinutes()) +
    pad(dt.getUTCSeconds()) +
    'Z'
  );
}

// ---------------------------------------------
// Helper: aggiunge N minuti a un time-string "HH:MM:SS"
// (per calcolare la fine appuntamento, es. +30 min)
// ---------------------------------------------
function addMinutesToTime(dateStr: string, timeStr: string, minutes: number): string {
  const dt = new Date(`${dateStr}T${timeStr}`);
  dt.setMinutes(dt.getMinutes() + minutes);
  return dt.toISOString().slice(11, 19); // HH:MM:SS
}

// ---------------------------------------------
// Helper: escape caratteri speciali richiesti dallo standard iCal
// ---------------------------------------------
function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

Deno.serve(async (req: Request) => {
  try {
    // -----------------------------------------
    // 1. VERIFICA TOKEN SEGRETO NELL'URL
    // -----------------------------------------
    const url = new URL(req.url);
    const providedToken = url.searchParams.get('token');

    if (!ICAL_SECRET_TOKEN || providedToken !== ICAL_SECRET_TOKEN) {
      return new Response('Unauthorized', { status: 401 });
    }

    // -----------------------------------------
    // 2. RECUPERA TUTTE LE PRENOTAZIONI FUTURE
    //    (con join sullo slot per data/ora)
    // -----------------------------------------
    const today = new Date().toISOString().split('T')[0];

    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        customer_name,
        customer_phone,
        customer_email,
        created_at,
        slots ( slot_date, slot_time )
      `)
      .gte('slots.slot_date', today);

    if (error) {
      console.error(error);
      return new Response('Errore nel recupero dati', { status: 500 });
    }

    // -----------------------------------------
    // 3. COSTRUISCI IL CONTENUTO .ics
    // -----------------------------------------
    const lines: string[] = [];

    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//BarberShop//Prenotazioni//IT');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    lines.push('X-WR-CALNAME:Prenotazioni Barber Shop');
    lines.push('X-WR-TIMEZONE:Europe/Rome');
    lines.push('REFRESH-INTERVAL;VALUE=DURATION:PT15M');

    for (const appt of appointments ?? []) {
      const slot = appt.slots as unknown as { slot_date: string; slot_time: string } | null;
      if (!slot) continue; // salta prenotazioni con slot orfano

      const dtStart = toIcalDateTime(slot.slot_date, slot.slot_time);
      const endTime = addMinutesToTime(slot.slot_date, slot.slot_time, 30); // durata appuntamento: 30 min
      const dtEnd = toIcalDateTime(slot.slot_date, endTime);
      const dtStamp = toIcalDateTime(
        new Date().toISOString().split('T')[0],
        new Date().toISOString().slice(11, 19)
      );

      const description = [
        `Telefono: ${appt.customer_phone}`,
        appt.customer_email ? `Email: ${appt.customer_email}` : null
      ].filter(Boolean).join('\\n');

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${appt.id}@barbershop-app`);
      lines.push(`DTSTAMP:${dtStamp}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${escapeIcalText('Appuntamento: ' + appt.customer_name)}`);
      lines.push(`DESCRIPTION:${escapeIcalText(description)}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    // iCal richiede line-ending CRLF
    const icsContent = lines.join('\r\n');

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="prenotazioni.ics"',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (err) {
    console.error(err);
    return new Response('Errore interno', { status: 500 });
  }
});
