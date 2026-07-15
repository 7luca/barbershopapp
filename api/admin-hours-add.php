<?php
require_once __DIR__ . '/supabase.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non consentito']);
    exit;
}

$body = readJsonBody();
$dow = (int) ($body['dow'] ?? 0);
$time = trim($body['time'] ?? '');

if ($dow < 1 || $dow > 6 || $time === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Giorno o orario non validi']);
    exit;
}

[$status, $data] = restRequest('POST', 'business_hours', ['day_of_week' => $dow, 'slot_time' => $time, 'is_active' => true], true);

if ($status === 409 || ($status >= 400 && isset($data['code']) && $data['code'] === '23505')) {
    http_response_code(409);
    echo json_encode(['error' => 'Questo orario esiste già per questo giorno']);
    exit;
}

if ($status !== 201 && $status !== 200) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore nella creazione']);
    exit;
}

echo json_encode(['success' => true]);