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

$allSlots = ensureSlotsForDate($date);

$available = array_values(array_filter($allSlots, function ($s) {
    return $s['is_open'] === true && $s['is_booked'] === false;
}));

echo json_encode(['slots' => array_map(function ($s) {
    return ['id' => $s['id'], 'slot_time' => $s['slot_time']];
}, $available)]);