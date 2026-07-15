<?php
require_once __DIR__ . '/supabase.php';

$token = $_COOKIE[ADMIN_COOKIE_NAME] ?? null;

if (!$token) {
    echo json_encode(['authenticated' => false]);
    exit;
}

$user = getUserFromToken($token);
if (!$user) {
    echo json_encode(['authenticated' => false]);
    exit;
}

[$status, $admins] = restRequest('GET', 'admins?user_id=eq.' . urlencode($user['id']) . '&select=id', null, true);

echo json_encode(['authenticated' => ($status === 200 && !empty($admins))]);
