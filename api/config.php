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

// Header CORS di base (utile se in futuro servi il frontend da un altro dominio)
header('Content-Type: application/json; charset=utf-8');
