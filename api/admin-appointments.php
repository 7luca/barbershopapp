<?php
require_once __DIR__ . '/supabase.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non consentito']);
    exit;
}

// select con embedding per ottenere data/ora dello slot collegato
$path = 'appointments?select=id,customer_name,customer_phone,customer_email,created_at,slots(slot_date,slot_time)&order=created_at.desc';
[$status, $data] = restRequest('GET', $path, null, true);

if ($status !== 200) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore nel caricamento delle prenotazioni']);
    exit;
}

echo json_encode(['appointments' => $data]);
