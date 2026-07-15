<?php
require_once __DIR__ . '/supabase.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non consentito']);
    exit;
}

$body = readJsonBody();
$code = trim($body['code'] ?? '');

if ($code === '') {
    http_response_code(400);
    echo json_encode(['valid' => false, 'error' => 'Codice mancante']);
    exit;
}

[$status, $data] = restRequest('GET', 'settings?id=eq.1&select=access_code', null, true);

if ($status !== 200 || empty($data)) {
    http_response_code(500);
    echo json_encode(['valid' => false, 'error' => 'Errore di connessione al database']);
    exit;
}

$realCode = $data[0]['access_code'] ?? '';
$isValid = strtoupper($realCode) === strtoupper($code);

echo json_encode(['valid' => $isValid]);
