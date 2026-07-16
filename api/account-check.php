<?php
require_once __DIR__ . '/supabase.php';

$token = $_COOKIE[CUSTOMER_COOKIE_NAME] ?? null;

if (!$token) {
    echo json_encode(['authenticated' => false]);
    exit;
}

$user = getUserFromToken($token);

if (!$user) {
    echo json_encode(['authenticated' => false]);
    exit;
}

echo json_encode([
    'authenticated' => true,
    'user' => [
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['user_metadata']['full_name'] ?? explode('@', $user['email'])[0]
    ]
]);
