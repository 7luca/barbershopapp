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

if ($slotId === '') {
    http_response_code(400);
    echo json_encode(['error' => 'ID slot mancante']);
    exit;
}

// Non permettere di eliminare slot già prenotati
[$checkStatus, $slotData] = restRequest('GET', 'slots?id=eq.' . urlencode($slotId) . '&select=is_booked', null, true);

if ($checkStatus === 200 && !empty($slotData) && $slotData[0]['is_booked'] === true) {
    http_response_code(409);
    echo json_encode(['error' => 'Non puoi eliminare uno slot già prenotato']);
    exit;
}

[$status, $data] = restRequest('DELETE', 'slots?id=eq.' . urlencode($slotId), null, true);

if ($status !== 204 && $status !== 200) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore nell\'eliminazione dello slot']);
    exit;
}

echo json_encode(['success' => true]);
