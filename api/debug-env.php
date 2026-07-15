<?php
require_once __DIR__ . '/config.php';

// Nessun valore reale esposto: solo true/false se la variabile è impostata
echo json_encode([
    'SUPABASE_URL_set' => SUPABASE_URL !== '',
    'SUPABASE_ANON_KEY_set' => SUPABASE_ANON_KEY !== '',
    'SUPABASE_SERVICE_KEY_set' => SUPABASE_SERVICE_KEY !== '',
    'ICAL_SECRET_TOKEN_set' => ICAL_SECRET_TOKEN !== '',
    'php_version' => phpversion()
]);
