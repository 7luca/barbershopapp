<?php
// ============================================
// SUPABASE.PHP
// Funzioni helper per parlare con Supabase via REST API (PostgREST + Auth)
// usando cURL. Nessuna libreria esterna necessaria.
// ============================================

require_once __DIR__ . '/config.php';

/**
 * Esegue una richiesta HTTP generica e restituisce [statusCode, bodyDecoded]
 */
function httpRequest(string $method, string $url, array $headers, $body = null): array {
    $ch = curl_init($url);

    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $response = curl_exec($ch);
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        return [0, ['error' => $curlError]];
    }

    $decoded = json_decode($response, true);
    return [$statusCode, $decoded];
}

/**
 * Chiamata a PostgREST (tabelle del database)
 * $path esempio: "slots?slot_date=eq.2026-07-15&is_booked=eq.false"
 */
function restRequest(string $method, string $path, $body = null, bool $useServiceKey = false, array $extraHeaders = []): array {
    $apiKey = $useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;

    $headers = array_merge([
        'apikey: ' . $apiKey,
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
        'Prefer: return=representation'
    ], $extraHeaders);

    $url = rtrim(SUPABASE_URL, '/') . '/rest/v1/' . $path;
    return httpRequest($method, $url, $headers, $body);
}

/**
 * Chiamata a Supabase Auth (login, signup, recupero utente)
 */
function authRequest(string $endpoint, $body, string $accessToken = null): array {
    $headers = [
        'apikey: ' . SUPABASE_ANON_KEY,
        'Content-Type: application/json'
    ];

    if ($accessToken) {
        $headers[] = 'Authorization: Bearer ' . $accessToken;
    } else {
        $headers[] = 'Authorization: Bearer ' . SUPABASE_ANON_KEY;
    }

    $url = rtrim(SUPABASE_URL, '/') . '/auth/v1/' . $endpoint;
    return httpRequest('POST', $url, $headers, $body);
}

/**
 * Recupera i dati dell'utente a partire da un access_token (per verificarne la validità)
 */
function getUserFromToken(string $accessToken): ?array {
    $headers = [
        'apikey: ' . SUPABASE_ANON_KEY,
        'Authorization: Bearer ' . $accessToken
    ];
    $url = rtrim(SUPABASE_URL, '/') . '/auth/v1/user';
    [$status, $data] = httpRequest('GET', $url, $headers);

    if ($status === 200 && isset($data['id'])) {
        return $data;
    }
    return null;
}

/**
 * Verifica che l'utente (dato il token nel cookie) sia admin.
 * Termina la richiesta con 401 se non lo è.
 */
function requireAdmin(): array {
    $token = $_COOKIE[ADMIN_COOKIE_NAME] ?? null;

    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Non autenticato']);
        exit;
    }

    $user = getUserFromToken($token);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Sessione scaduta, effettua di nuovo il login']);
        exit;
    }

    // Verifica appartenenza alla tabella admins (con service key, bypassa RLS)
    [$status, $admins] = restRequest(
        'GET',
        'admins?user_id=eq.' . urlencode($user['id']) . '&select=id',
        null,
        true
    );

    if ($status !== 200 || empty($admins)) {
        http_response_code(403);
        echo json_encode(['error' => 'Utente non autorizzato come admin']);
        exit;
    }

    return $user;
}

/**
 * Legge il body JSON di una richiesta POST
 */
function readJsonBody(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}
