// ============================================
// INIZIALIZZAZIONE SUPABASE
// ============================================
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentSession = null;

// ============================================
// CONTROLLO SESSIONE ALL'AVVIO
// ============================================
(async function initAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentSession = session;
    await enterDashboard();
  }
})();

// ============================================
// LOGIN ADMIN
// ============================================
document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const errorEl = document.getElementById('admin-login-error');
  errorEl.textContent = '';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorEl.textContent = 'Credenziali non valide.';
    return;
  }

  // Verifica che l'utente sia effettivamente admin (tabella admins + RLS)
  const { data: adminCheck, error: adminError } = await supabase
    .from('admins')
    .select('id')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (adminError || !adminCheck) {
    errorEl.textContent = 'Questo account non ha permessi di amministrazione.';
    await supabase.auth.signOut();
    return;
  }

  currentSession = data.session;
  await enterDashboard();
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

// ============================================
// INGRESSO DASHBOARD
// ============================================
async function enterDashboard() {
  document.getElementById('admin-login').classList.remove('active');
  document.getElementById('admin-dashboard').classList.add('active');

  const dateInput = document.getElementById('admin-date-picker');
  dateInput.min = new Date().toISOString().split('T')[0];
  dateInput.value = new Date().toISOString().split('T')[0];
  dateInput.addEventListener('change', () => loadSlotsForDate(dateInput.value));

  await loadSlotsForDate(dateInput.value);
  await loadAppointments();
  setupIcalLink();
}

// ============================================
// GESTIONE SLOT — AGGIUNTA
// ============================================
document.getElementById('btn-add-slot').addEventListener('click', async () => {
  const date = document.getElementById('admin-date-picker').value;
  const time = document.getElementById('admin-time-picker').value;
  const msgEl = document.getElementById('add-slot-msg');
  msgEl.textContent = '';
  msgEl.style.color = '#c0392b';

  if (!date || !time) {
    msgEl.textContent = 'Seleziona data e orario.';
    return;
  }

  const { error } = await supabase.from('slots').insert({
    slot_date: date,
    slot_time: time
  });

  if (error) {
    msgEl.textContent = error.code === '23505'
      ? 'Questo slot esiste già.'
      : 'Errore: ' + error.message;
    return;
  }

  msgEl.style.color = '#2e7d32';
  msgEl.textContent = 'Slot aggiunto ✓';
  document.getElementById('admin-time-picker').value = '';
  await loadSlotsForDate(date);
});

// ============================================
// GESTIONE SLOT — VISUALIZZAZIONE / ELIMINAZIONE
// ============================================
async function loadSlotsForDate(date) {
  const container = document.getElementById('admin-slots-list');
  container.innerHTML = '<p>Caricamento...</p>';

  const { data: slots, error } = await supabase
    .from('slots')
    .select('id, slot_time, is_booked')
    .eq('slot_date', date)
    .order('slot_time', { ascending: true });

  if (error) {
    container.innerHTML = '<p>Errore nel caricamento.</p>';
    return;
  }

  if (!slots || slots.length === 0) {
    container.innerHTML = '<p style="color:#999">Nessuno slot per questa data.</p>';
    return;
  }

  container.innerHTML = '';
  slots.forEach(slot => {
    const row = document.createElement('div');
    row.classList.add('slot-row');

    const label = document.createElement('span');
    label.textContent = slot.slot_time.slice(0, 5);
    if (slot.is_booked) {
      const badge = document.createElement('span');
      badge.classList.add('badge-booked');
      badge.textContent = 'Prenotato';
      label.appendChild(document.createTextNode(' '));
      label.appendChild(badge);
    }

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Elimina';
    delBtn.disabled = slot.is_booked; // non permettere di eliminare slot già prenotati
    delBtn.addEventListener('click', async () => {
      if (!confirm('Eliminare questo slot?')) return;
      const { error } = await supabase.from('slots').delete().eq('id', slot.id);
      if (error) {
        alert('Errore: ' + error.message);
        return;
      }
      await loadSlotsForDate(date);
    });

    row.appendChild(label);
    row.appendChild(delBtn);
    container.appendChild(row);
  });
}

// ============================================
// VISUALIZZAZIONE PRENOTAZIONI
// ============================================
async function loadAppointments() {
  const container = document.getElementById('appointments-list');
  container.innerHTML = '<p>Caricamento...</p>';

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      customer_name,
      customer_phone,
      customer_email,
      created_at,
      slots ( slot_date, slot_time )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<p>Errore nel caricamento delle prenotazioni.</p>';
    console.error(error);
    return;
  }

  if (!appointments || appointments.length === 0) {
    container.innerHTML = '<p style="color:#999">Nessuna prenotazione ancora.</p>';
    return;
  }

  container.innerHTML = '';
  appointments.forEach(appt => {
    const row = document.createElement('div');
    row.classList.add('appointment-row');

    const dateLabel = appt.slots
      ? `${appt.slots.slot_date} · ${appt.slots.slot_time.slice(0, 5)}`
      : 'Slot rimosso';

    row.innerHTML = `
      <div>
        <strong>${appt.customer_name}</strong><br>
        <small>${dateLabel} — ${appt.customer_phone}</small>
      </div>
    `;
    container.appendChild(row);
  });
}

// ============================================
// LINK ICAL (Apple Calendar Sync tramite Edge Function)
// ============================================
function setupIcalLink() {
  const icalInput = document.getElementById('ical-link');
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
  icalInput.value = `https://${projectRef}.supabase.co/functions/v1/ical-feed?token=${ICAL_SECRET_TOKEN}`;

  document.getElementById('btn-copy-ical').addEventListener('click', () => {
    icalInput.select();
    document.execCommand('copy');
    alert('Link copiato!');
  });
}
