<?php
require_once __DIR__ . '/supabase.php';

$year = (int) ($_GET['year'] ?? 0);
$month = (int) ($_GET['month'] ?? 0);

if ($year < 2020 || $month < 1 || $month > 12) {
    http_response_code(400);
    echo json_encode(['error' => 'Parametri non validi']);
    exit;
}

// Legge il template settimanale attivo: quali giorni della settimana hanno almeno uno slot attivo
[$status, $active] = restRequest('GET', 'business_hours?is_active=eq.true&select=day_of_week', null, true);

$activeDows = [];
if ($status === 200) {
    foreach ($active as $row) {
        $activeDows[(int) $row['day_of_week']] = true;
    }
}

$daysInMonth = (int) (new DateTime("$year-$month-01"))->format('t');
$closedDates = [];

for ($d = 1; $d <= $daysInMonth; $d++) {
    $date = sprintf('%04d-%02d-%02d', $year, $month, $d);
    $dow = (int) (new DateTime($date))->format('N');
    if ($dow === 7 || !isset($activeDows[$dow])) {
        $closedDates[] = $date;
    }
}

echo json_encode(['closed_dates' => $closedDates]);