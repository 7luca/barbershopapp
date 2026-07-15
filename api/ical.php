<?php
require_once __DIR__ . '/supabase.php';

// Verifica token segreto passato come query param
$providedToken = $_GET['token'] ?? '';

if (empty(ICAL_SECRET_TOKEN) || $providedToken !== ICAL_SECRET_TOKEN) {
    http_response_code(401);
    header('Content-Type: text/plain');
    echo 'Unauthorized';
    exit;
}

function escapeIcalText(string $text): string {
    $text = str_replace('\\', '\\\\', $text);
    $text = str_replace(';', '\\;', $text);
    $text = str_replace(',', '\\,', $text);
    $text = str_replace("\n", '\\n', $text);
    return $text;
}

function toIcalDateTime(string $date, string $time): string {
    $dt = new DateTime($date . ' ' . $time, new DateTimeZone('Europe/Rome'));
    $dt->setTimezone(new DateTimeZone('UTC'));
    return $dt->format('Ymd\THis\Z');
}

$today = date('Y-m-d');
$path = 'appointments?select=id,customer_name,customer_phone,customer_email,slots(slot_date,slot_time)&slots.slot_date=gte.' . urlencode($today);
[$status, $appointments] = restRequest('GET', $path, null, true);

if ($status !== 200) {
    http_response_code(500);
    header('Content-Type: text/plain');
    echo 'Errore nel recupero dei dati';
    exit;
}

$lines = [];
$lines[] = 'BEGIN:VCALENDAR';
$lines[] = 'VERSION:2.0';
$lines[] = 'PRODID:-//BarberShop//Prenotazioni//IT';
$lines[] = 'CALSCALE:GREGORIAN';
$lines[] = 'METHOD:PUBLISH';
$lines[] = 'X-WR-CALNAME:Prenotazioni Barber Shop';
$lines[] = 'X-WR-TIMEZONE:Europe/Rome';
$lines[] = 'REFRESH-INTERVAL;VALUE=DURATION:PT15M';

foreach (($appointments ?? []) as $appt) {
    $slot = $appt['slots'] ?? null;
    if (!$slot) continue;

    $dtStart = toIcalDateTime($slot['slot_date'], $slot['slot_time']);

    $endDt = new DateTime($slot['slot_date'] . ' ' . $slot['slot_time'], new DateTimeZone('Europe/Rome'));
    $endDt->modify('+30 minutes'); // durata appuntamento: 30 minuti
    $endDt->setTimezone(new DateTimeZone('UTC'));
    $dtEnd = $endDt->format('Ymd\THis\Z');

    $dtStamp = gmdate('Ymd\THis\Z');

    $descriptionParts = ['Telefono: ' . $appt['customer_phone']];
    if (!empty($appt['customer_email'])) {
        $descriptionParts[] = 'Email: ' . $appt['customer_email'];
    }
    $description = implode('\\n', array_map('escapeIcalText', $descriptionParts));

    $lines[] = 'BEGIN:VEVENT';
    $lines[] = 'UID:' . $appt['id'] . '@barbershop-app';
    $lines[] = 'DTSTAMP:' . $dtStamp;
    $lines[] = 'DTSTART:' . $dtStart;
    $lines[] = 'DTEND:' . $dtEnd;
    $lines[] = 'SUMMARY:' . escapeIcalText('Appuntamento: ' . $appt['customer_name']);
    $lines[] = 'DESCRIPTION:' . $description;
    $lines[] = 'STATUS:CONFIRMED';
    $lines[] = 'END:VEVENT';
}

$lines[] = 'END:VCALENDAR';

header('Content-Type: text/calendar; charset=utf-8');
header('Content-Disposition: inline; filename="prenotazioni.ics"');
header('Cache-Control: no-cache');

echo implode("\r\n", $lines);
