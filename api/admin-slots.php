<?php
require_once __DIR__ . '/supabase.php';

requireAdmin(); // termina la richiesta se non autorizzato

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $date = $_GET['date'] ?? '';

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        http_response_code(400);
        echo json_encode(['error' => 'Data non valida']);
        exit;
    }

    $path = 'slots?slot_date=eq.' . urlencode($date) . '&select=id,slot_time,is_booked&order=slot_time.asc';
    [$status, $data] = restRequest('GET', $path, null, true);

    if ($status !== 200) {
        http_response_code(500);
        echo json_encode(['error' => 'Errore nel caricamento degli slot']);
        exit;
    }

    echo json_encode(['slots' => $data]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = readJsonBody();
    $date = trim($body['date'] ?? '');
    $time = trim($body['time'] ?? '');

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || $time === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Data o orario non validi']);
        exit;
    }

    [$status, $data] = restRequest('POST', 'slots', ['slot_date' => $date, 'slot_time' => $time], true);

    if ($status === 409 || ($status >= 400 && isset($data['code']) && $data['code'] === '23505')) {
        http_response_code(409);
        echo json_encode(['error' => 'Questo slot esiste già']);
        exit;
    }

    if ($status !== 201 && $status !== 200) {
        http_response_code(500);
        echo json_encode(['error' => 'Errore nella creazione dello slot']);
        exit;
    }

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Metodo non consentito']);
