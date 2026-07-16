<?php
// ============================================
// CONFIG.PHP
// Legge le chiavi da Environment Variables di Vercel.
// NON scrivere mai le chiavi vere qui dentro: vanno impostate
// da Vercel Dashboard -> Project -> Settings -> Environment Variables
// ============================================

define('SUPABASE_URL', getenv('SUPABASE_URL') ?: '');
define('SUPABASE_ANON_KEY', getenv('SUPABASE_ANON_KEY') ?: '');
define('SUPABASE_SERVICE_KEY', getenv('SUPABASE_SERVICE_KEY') ?: '');
define('ICAL_SECRET_TOKEN', getenv('ICAL_SECRET_TOKEN') ?: '');

// Nome del cookie che conserva la sessione admin (stateless, no PHP session)
define('ADMIN_COOKIE_NAME', 'bs_admin_token');

// Sessione cliente (per "Il mio account")
define('CUSTOMER_COOKIE_NAME', 'bs_customer_token');

// Email transazionali (conferma prenotazione) via Gmail SMTP (PHPMailer)
// GMAIL_USER: il tuo indirizzo Gmail completo
// GMAIL_APP_PASSWORD: password per le app generata da Google (16 caratteri, NON la tua password normale)
define('GMAIL_USER', getenv('GMAIL_USER') ?: '');
define('GMAIL_APP_PASSWORD', getenv('GMAIL_APP_PASSWORD') ?: '');

// Dominio pubblico del sito, usato nei link dentro le email
define('APP_BASE_URL', getenv('APP_BASE_URL') ?: (isset($_SERVER['HTTP_HOST']) ? 'https://' . $_SERVER['HTTP_HOST'] : ''));

// Header CORS di base (utile se in futuro servi il frontend da un altro dominio)
header('Content-Type: application/json; charset=utf-8');
