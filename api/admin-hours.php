<?php
require_once __DIR__ . '/supabase.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $dow = (int) ($_GET['dow'] ?? 0);
    if ($dow < 1 || $dow > 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Giorno non valido']);
        exit;
    }

    [$status, $data] = restRequest('GET', 'business_hours?day_of_week=eq.' . $dow . '&select=id,slot_time,is_active&order=slot_time.asc', null, true);

    if ($status !== 200) {
        http_response_code(500);
        echo json_encode(['error' => 'Errore nel caricamento']);
        exit;
    }

    echo json_encode(['hours' => $data]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = readJsonBody();
    $id = trim($body['id'] ?? '');
    $isActive = (bool) ($body['is_active'] ?? false);

    if ($id === '') {
        http_response_code(400);
        echo json_encode(['error' => 'ID mancante']);
        exit;
    }

    [$status, $data] = restRequest('PATCH', 'business_hours?id=eq.' . urlencode($id), ['is_active' => $isActive], true);

    if ($status !== 200 && $status !== 204) {
        http_response_code(500);
        echo json_encode(['error' => 'Errore nell\'aggiornamento']);
        exit;
    }

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Metodo non consentito']);