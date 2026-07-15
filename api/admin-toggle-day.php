<?php
require_once __DIR__ . '/supabase.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non consentito']);
    exit;
}

$body = readJsonBody();
$date = trim($body['date'] ?? '');
$isOpen = (bool) ($body['is_open'] ?? true);

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(['error' => 'Data non valida']);
    exit;
}

// Genera gli slot se non esistono ancora, poi applica il toggle a tutti
ensureSlotsForDate($date);

[$status, $data] = restRequest('PATCH', 'slots?slot_date=eq.' . urlencode($date), ['is_open' => $isOpen], true);

if ($status !== 200 && $status !== 204) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore nell\'aggiornamento del giorno']);
    exit;
}

echo json_encode(['success' => true]);
