<?php
require_once __DIR__ . '/supabase.php';

setcookie(CUSTOMER_COOKIE_NAME, '', [
    'expires' => time() - 3600,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Strict',
    'secure' => true
]);

echo json_encode(['success' => true]);
