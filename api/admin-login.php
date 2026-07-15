<?php
require_once __DIR__ . '/supabase.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non consentito']);
    exit;
}

$body = readJsonBody();
$email = trim($body['email'] ?? '');
$password = $body['password'] ?? '';

if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Email e password sono obbligatori']);
    exit;
}

// 1. Login su Supabase Auth
[$status, $data] = authRequest('token?grant_type=password', ['email' => $email, 'password' => $password]);

if ($status >= 400 || !isset($data['access_token'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Credenziali non valide']);
    exit;
}

$accessToken = $data['access_token'];
$userId = $data['user']['id'];

// 2. Verifica che l'utente sia nella tabella admins (con service key, bypassa RLS)
[$adminStatus, $adminData] = restRequest(
    'GET',
    'admins?user_id=eq.' . urlencode($userId) . '&select=id',
    null,
    true
);

if ($adminStatus !== 200 || empty($adminData)) {
    http_response_code(403);
    echo json_encode(['error' => 'Questo account non ha permessi di amministrazione']);
    exit;
}

// 3. Imposta cookie httpOnly con l'access_token (scade con il token, ~1 ora)
setcookie(ADMIN_COOKIE_NAME, $accessToken, [
    'expires' => time() + 3600,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Strict',
    'secure' => true
]);

echo json_encode(['success' => true]);
