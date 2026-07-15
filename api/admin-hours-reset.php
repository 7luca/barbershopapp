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

if ($dow < 1 || $dow > 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Giorno non valido']);
    exit;
}

// Cancella il template esistente per quel giorno
restRequest('DELETE', 'business_hours?day_of_week=eq.' . $dow, null, true);

// Ricostruisce i default: Lun-Ven 9-13/15-19, Sab 9-13/15-17 (slot da 30 minuti)
$rows = [];
$ranges = ($dow === 6) ? [['09:00', '13:00'], ['15:00', '17:00']] : [['09:00', '13:00'], ['15:00', '19:00']];

foreach ($ranges as [$start, $end]) {
    $t = new DateTime($start);
    $endT = new DateTime($end);
    while ($t < $endT) {
        $rows[] = ['day_of_week' => $dow, 'slot_time' => $t->format('H:i'), 'is_active' => true];
        $t->modify('+30 minutes');
    }
}

[$status, $data] = restRequest('POST', 'business_hours', $rows, true);

if ($status !== 201 && $status !== 200) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore nel ripristino']);
    exit;
}

echo json_encode(['success' => true]);
