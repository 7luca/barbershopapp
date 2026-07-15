<?php
require_once __DIR__ . '/supabase.php';

requireAdmin();

$year = (int) ($_GET['year'] ?? 0);
$month = (int) ($_GET['month'] ?? 0);

if ($year < 2020 || $month < 1 || $month > 12) {
    http_response_code(400);
    echo json_encode(['error' => 'Parametri non validi']);
    exit;
}

[$status, $active] = restRequest('GET', 'business_hours?is_active=eq.true&select=day_of_week', null, true);
$activeDows = [];
if ($status === 200) {
    foreach ($active as $row) $activeDows[(int) $row['day_of_week']] = true;
}

$firstDay = sprintf('%04d-%02d-01', $year, $month);
$lastDay = sprintf('%04d-%02d-%02d', $year, $month, (int) (new DateTime($firstDay))->format('t'));

[$slotsStatus, $monthSlots] = restRequest(
    'GET',
    'slots?slot_date=gte.' . urlencode($firstDay) . '&slot_date=lte.' . urlencode($lastDay) . '&select=slot_date,is_open',
    null,
    true
);

$byDate = [];
if ($slotsStatus === 200) {
    foreach ($monthSlots as $s) {
        $byDate[$s['slot_date']][] = $s['is_open'];
    }
}

$daysInMonth = (int) (new DateTime($firstDay))->format('t');
$result = [];

for ($d = 1; $d <= $daysInMonth; $d++) {
    $date = sprintf('%04d-%02d-%02d', $year, $month, $d);
    $dow = (int) (new DateTime($date))->format('N');

    if ($dow === 7 || !isset($activeDows[$dow])) {
        $result[$date] = 'closed';
        continue;
    }

    if (isset($byDate[$date])) {
        $openFlags = $byDate[$date];
        $allClosed = !in_array(true, $openFlags, true);
        $allOpen = !in_array(false, $openFlags, true);
        $result[$date] = $allClosed ? 'closed' : ($allOpen ? 'open' : 'partial');
    } else {
        $result[$date] = 'open'; // non ancora generato: segue il template
    }
}

echo json_encode(['days' => $result]);
