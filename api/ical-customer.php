<?php
require_once __DIR__ . '/supabase.php';

$id = $_GET['id'] ?? '';

if (!preg_match('/^[0-9a-fA-F-]{36}$/', $id)) {
    http_response_code(400);
    header('Content-Type: text/plain');
    echo 'ID non valido';
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

$path = 'appointments?id=eq.' . urlencode($id) . '&select=id,customer_name,customer_phone,customer_email,service,notes,slots(slot_date,slot_time)';
[$status, $rows] = restRequest('GET', $path, null, true);

if ($status !== 200 || empty($rows)) {
    http_response_code(404);
    header('Content-Type: text/plain');
    echo 'Prenotazione non trovata';
    exit;
}

$appt = $rows[0];
$slot = $appt['slots'] ?? null;

if (!$slot) {
    http_response_code(404);
    header('Content-Type: text/plain');
    echo 'Slot non trovato';
    exit;
}

$dtStart = toIcalDateTime($slot['slot_date'], $slot['slot_time']);

$endDt = new DateTime($slot['slot_date'] . ' ' . $slot['slot_time'], new DateTimeZone('Europe/Rome'));
$endDt->modify('+30 minutes');
$endDt->setTimezone(new DateTimeZone('UTC'));
$dtEnd = $endDt->format('Ymd\THis\Z');

$dtStamp = gmdate('Ymd\THis\Z');

$descriptionParts = [];
if (!empty($appt['service'])) $descriptionParts[] = 'Servizio: ' . $appt['service'];
if (!empty($appt['notes'])) $descriptionParts[] = 'Note: ' . $appt['notes'];
$description = implode('\\n', array_map('escapeIcalText', $descriptionParts));

$lines = [];
$lines[] = 'BEGIN:VCALENDAR';
$lines[] = 'VERSION:2.0';
$lines[] = 'PRODID:-//BarberShop//Prenotazione//IT';
$lines[] = 'CALSCALE:GREGORIAN';
$lines[] = 'METHOD:PUBLISH';
$lines[] = 'BEGIN:VEVENT';
$lines[] = 'UID:' . $appt['id'] . '@barbershop-app';
$lines[] = 'DTSTAMP:' . $dtStamp;
$lines[] = 'DTSTART:' . $dtStart;
$lines[] = 'DTEND:' . $dtEnd;
$lines[] = 'SUMMARY:' . escapeIcalText('Appuntamento dal barbiere');
if ($description !== '') $lines[] = 'DESCRIPTION:' . $description;
$lines[] = 'STATUS:CONFIRMED';
$lines[] = 'END:VEVENT';
$lines[] = 'END:VCALENDAR';

header('Content-Type: text/calendar; charset=utf-8');
header('Content-Disposition: inline; filename="appuntamento.ics"');
echo implode("\r\n", $lines);