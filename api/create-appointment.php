<?php
require_once __DIR__ . '/supabase.php';
require_once __DIR__ . '/emails.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non consentito']);
    exit;
}

$body = readJsonBody();

$slotId = trim($body['slot_id'] ?? '');
$name = trim($body['name'] ?? '');
$phone = trim($body['phone'] ?? '');
$email = trim($body['email'] ?? '');
$service = trim($body['service'] ?? '');
$notes = trim($body['notes'] ?? '');
$userId = trim($body['user_id'] ?? '');

if ($slotId === '' || $name === '' || $phone === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Dati mancanti (nome, telefono e slot sono obbligatori)']);
    exit;
}

[$checkStatus, $slotData] = restRequest('GET', 'slots?id=eq.' . urlencode($slotId) . '&select=id,is_booked,is_open,slot_date,slot_time', null, true);

if ($checkStatus !== 200 || empty($slotData) || $slotData[0]['is_booked'] === true || $slotData[0]['is_open'] === false) {
    http_response_code(409);
    echo json_encode(['error' => 'Questo orario non è più disponibile, scegline un altro']);
    exit;
}

$slot = $slotData[0];

$insertBody = [
    'slot_id' => $slotId,
    'customer_name' => $name,
    'customer_phone' => $phone,
    'customer_email' => $email !== '' ? $email : null,
    'service' => $service !== '' ? $service : null,
    'notes' => $notes !== '' ? $notes : null,
    'user_id' => $userId !== '' ? $userId : null
];

[$status, $data] = restRequest('POST', 'appointments', $insertBody, true);

if ($status !== 201 && $status !== 200) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore nel salvataggio della prenotazione']);
    exit;
}

$appointmentId = $data[0]['id'] ?? null;

// Invio email di conferma (best-effort: se fallisce non blocca la prenotazione)
if ($email !== '' && $appointmentId) {
    $icsUrl = APP_BASE_URL . '/api/ical-customer.php?id=' . $appointmentId;
    try {
        sendBookingConfirmationEmail($email, $name, $slot['slot_date'], $slot['slot_time'], $service, $icsUrl);
    } catch (Throwable $e) {
        // ignorato volutamente
    }
}

echo json_encode([
    'success' => true,
    'appointment_id' => $appointmentId
]);
