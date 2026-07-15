<?php
require_once __DIR__ . '/supabase.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non consentito']);
    exit;
}

$body = readJsonBody();
$action = $body['action'] ?? ''; // "login" oppure "signup"
$email = trim($body['email'] ?? '');
$password = $body['password'] ?? '';

if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Email e password sono obbligatori']);
    exit;
}

if ($action === 'signup') {
    [$status, $data] = authRequest('signup', ['email' => $email, 'password' => $password]);

    if ($status >= 400) {
        http_response_code($status);
        echo json_encode(['error' => $data['msg'] ?? $data['error_description'] ?? 'Registrazione fallita']);
        exit;
    }

    // Se "Confirm email" è disattivato su Supabase, la risposta include già un access_token:
    // l'utente è di fatto loggato e può procedere subito con la prenotazione.
    if (isset($data['access_token']) && isset($data['user'])) {
        echo json_encode([
            'success' => true,
            'session' => true,
            'user' => [
                'id' => $data['user']['id'],
                'email' => $data['user']['email'],
                'name' => explode('@', $email)[0]
            ]
        ]);
        exit;
    }

    echo json_encode(['success' => true, 'session' => false, 'message' => 'Registrazione effettuata. Controlla la tua email per confermare, poi accedi.']);
    exit;
}

if ($action === 'login') {
    $url = 'token?grant_type=password';
    [$status, $data] = authRequest($url, ['email' => $email, 'password' => $password]);

    if ($status >= 400 || !isset($data['access_token'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Credenziali non valide']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $data['user']['id'],
            'email' => $data['user']['email'],
            'name' => $data['user']['user_metadata']['full_name'] ?? explode('@', $email)[0]
        ]
    ]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Azione non valida']);
