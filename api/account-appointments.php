<?php
require_once __DIR__ . '/supabase.php';

$user = requireCustomer();

$path = 'appointments?user_id=eq.' . urlencode($user['id']) . '&select=id,customer_name,service,notes,created_at,slots(slot_date,slot_time)&order=created_at.desc';
[$status, $data] = restRequest('GET', $path, null, true);

if ($status !== 200) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore nel caricamento delle prenotazioni']);
    exit;
}

echo json_encode(['appointments' => $data]);
