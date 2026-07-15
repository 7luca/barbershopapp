// ============================================
// CONFIGURAZIONE SUPABASE
// Sostituisci questi due valori con quelli del tuo progetto
// (li trovi in: Supabase Dashboard -> Project Settings -> API)
// ============================================

const SUPABASE_URL = 'https://tapivvkrbbkljsfrzqky.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcGl2dmtyYmJrbGpzZnJ6cWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDI2ODksImV4cCI6MjA5OTY3ODY4OX0.xLB8XfC7JCmlF-zhjqeCdkBjedU1ynGKsXkGeNyXJTU';

// ============================================
// TOKEN SEGRETO PER IL LINK ICAL (Apple Calendar)
// Deve essere IDENTICO a quello impostato con:
// supabase secrets set ICAL_SECRET_TOKEN=...
// ============================================
const ICAL_SECRET_TOKEN = 'INSERISCI-QUI-LA-STESSA-STRINGA-SEGRETA';
