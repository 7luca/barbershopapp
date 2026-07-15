<?php
require_once __DIR__ . '/supabase.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non consentito']);
    exit;
}

$date = $_GET['date'] ?? '';

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(['error' => 'Data non valida']);
    exit;
}

$path = 'slots?slot_date=eq.' . urlencode($date) . '&is_booked=eq.false&select=id,slot_time&order=slot_time.asc';
[$status, $data] = restRequest('GET', $path, null, true);

if ($status !== 200) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore nel caricamento degli slot']);
    exit;
}

echo json_encode(['slots' => $data]);
