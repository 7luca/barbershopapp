<?php
require_once __DIR__ . '/supabase.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non consentito']);
    exit;
}

$scope = $_GET['scope'] ?? 'upcoming'; // upcoming | all
$date = $_GET['date'] ?? '';
$today = date('Y-m-d');

$select = 'select=id,customer_name,customer_phone,customer_email,service,notes,created_at,slots(slot_date,slot_time)';
$path = 'appointments?' . $select . '&order=created_at.desc';

if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    $path .= '&slots.slot_date=eq.' . urlencode($date);
} elseif ($scope === 'upcoming') {
    $path .= '&slots.slot_date=gte.' . urlencode($today);
}

[$status, $appointments] = restRequest('GET', $path, null, true);

if ($status !== 200) {
    http_response_code(500);
    echo json_encode(['error' => 'Errore nel caricamento delle prenotazioni']);
    exit;
}

// Filtra via eventuali righe con slot nullo dovute al filtro embedded di PostgREST
$appointments = array_values(array_filter($appointments ?? [], fn($a) => !empty($a['slots'])));

// Ordina per data/ora dello slot (più utile per l'admin di created_at)
usort($appointments, function ($a, $b) {
    $da = $a['slots']['slot_date'] . $a['slots']['slot_time'];
    $db = $b['slots']['slot_date'] . $b['slots']['slot_time'];
    return strcmp($da, $db);
});

[$totalStatus, $totalData] = restRequest('GET', 'appointments?select=id', null, true, ['Prefer: count=exact']);
$total = is_array($totalData) ? count($totalData) : 0;

$todayCount = 0;
foreach ($appointments as $a) {
    if (($a['slots']['slot_date'] ?? '') === $today) $todayCount++;
}
if ($scope !== 'upcoming' || $date === $today) {
    // ricalcola separatamente per essere sicuri di contare tutte le prenotazioni di oggi
    [$tStatus, $tData] = restRequest('GET', 'appointments?select=id&slots.slot_date=eq.' . urlencode($today), null, true);
    if ($tStatus === 200) $todayCount = count(array_filter($tData, fn($a) => !empty($a)));
}

echo json_encode([
    'appointments' => $appointments,
    'stats' => ['total' => $total, 'today' => $todayCount]
]);
