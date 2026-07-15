<?php
require_once __DIR__ . '/supabase.php';

requireAdmin();

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

$slots = ensureSlotsForDate($date);

// Recupera i nomi dei clienti per gli slot prenotati di questa data
$bookedIds = array_values(array_filter(array_map(function ($s) {
    return $s['is_booked'] ? $s['id'] : null;
}, $slots)));

$namesBySlot = [];
if (!empty($bookedIds)) {
    $idsFilter = implode(',', array_map('urlencode', $bookedIds));
    [$apStatus, $appts] = restRequest('GET', 'appointments?slot_id=in.(' . $idsFilter . ')&select=slot_id,customer_name', null, true);
    if ($apStatus === 200) {
        foreach ($appts as $a) {
            $namesBySlot[$a['slot_id']] = $a['customer_name'];
        }
    }
}

$result = array_map(function ($s) use ($namesBySlot) {
    return [
        'id' => $s['id'],
        'slot_time' => $s['slot_time'],
        'is_open' => $s['is_open'],
        'is_booked' => $s['is_booked'],
        'customer_name' => $namesBySlot[$s['id']] ?? null
    ];
}, $slots);

echo json_encode(['slots' => $result, 'day_of_week' => dayOfWeekFor($date)]);
