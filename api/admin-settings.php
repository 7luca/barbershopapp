<?php
require_once __DIR__ . '/supabase.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    [$status, $data] = restRequest('GET', 'settings?id=eq.1&select=access_code', null, true);

    if ($status !== 200 || empty($data)) {
        http_response_code(500);
        echo json_encode(['error' => 'Errore nel caricamento']);
        exit;
    }

    echo json_encode(['access_code' => $data[0]['access_code']]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = readJsonBody();
    $newCode = trim($body['access_code'] ?? '');

    if ($newCode === '' || strlen($newCode) < 4) {
        http_response_code(400);
        echo json_encode(['error' => 'Il codice deve avere almeno 4 caratteri']);
        exit;
    }

    [$status, $data] = restRequest('PATCH', 'settings?id=eq.1', ['access_code' => $newCode], true);

    if ($status !== 200 && $status !== 204) {
        http_response_code(500);
        echo json_encode(['error' => 'Errore nel salvataggio']);
        exit;
    }

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Metodo non consentito']);
