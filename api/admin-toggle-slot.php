<?php
require_once __DIR__ . '/supabase.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non consentito']);
    exit;
}

$body = readJsonBody();
$slotId = trim($body['slot_id'] ?? '');
$isOpen = (bool) ($body['is_open'] ?? true);

if ($slotId === '') {
    http_response_code(400);
    echo json_encode(['error' => 'ID slot mancante']);
    exit;
}

[$status, $data] = restRequest('PATCH', 'slots?id=eq.' . urlencode($slotId), ['is_open' => $isOpen], true);

if ($status !== 200 && $status !== 204) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore nell\'aggiornamento dello slot']);
    exit;
}

echo json_encode(['success' => true]);
