<?php
require_once __DIR__ . '/supabase.php';

// Prova una chiamata reale a Supabase e mostra cosa risponde davvero,
// senza esporre le chiavi API.

$url = rtrim(SUPABASE_URL, '/') . '/rest/v1/settings?id=eq.1&select=access_code';

$headers = [
    'apikey: ' . SUPABASE_SERVICE_KEY,
    'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
    'Content-Type: application/json'
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

$response = curl_exec($ch);
$statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErrno = curl_errno($ch);
$curlError = curl_error($ch);
curl_close($ch);

echo json_encode([
    'target_url_masked' => preg_replace('/https:\/\/([a-z0-9]+)\..*/', 'https://$1.supabase.co/rest/v1/settings...', $url),
    'curl_extension_loaded' => extension_loaded('curl'),
    'http_status' => $statusCode,
    'curl_errno' => $curlErrno,
    'curl_error' => $curlError,
    'raw_response' => $response
]);
