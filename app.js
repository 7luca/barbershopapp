// ============================================
// INIZIALIZZAZIONE SUPABASE
// ============================================
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Stato dell'applicazione (in memoria, nessun reload)
const state = {
  accessGranted: false,
  selectedDate: null,
  selectedSlot: null, // { id, time }
  userSession: null
};

// ============================================
// HELPER: cambio step
// ============================================
function goToStep(stepId) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
}

// ============================================
// STEP 0 — VERIFICA CODICE DI ACCESSO
// ============================================
document.getElementById('btn-access-submit').addEventListener('click', async () => {
  const input = document.getElementById('access-code-input').value.trim();
  const errorEl = document.getElementById('access-error');
  errorEl.textContent = '';

  if (!input) {
    errorEl.textContent = 'Inserisci un codice.';
    return;
  }

  const { data, error } = await supabase
    .from('settings')
    .select('access_code')
    .eq('id', 1)
    .single();

  if (error) {
    errorEl.textContent = 'Errore di connessione. Riprova.';
    console.error(error);
    return;
  }

  if (data.access_code.toUpperCase() === input.toUpperCase()) {
    state.accessGranted = true;
    goToStep('step-calendar');
    // Data minima selezionabile = oggi
    const dateInput = document.getElementById('date-picker');
    dateInput.min = new Date().toISOString().split('T')[0];
  } else {
    errorEl.textContent = 'Codice non valido.';
  }
});

// Permetti invio con tasto Enter
document.getElementById('access-code-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-access-submit').click();
});

// ============================================
// STEP 1 — SELEZIONE DATA → CARICA ORARI
// ============================================
document.getElementById('btn-date-submit').addEventListener('click', async () => {
  const dateValue = document.getElementById('date-picker').value;

  if (!dateValue) {
    alert('Seleziona una data.');
    return;
  }

  state.selectedDate = dateValue;
  await loadAvailableSlots(dateValue);
  goToStep('step-time');
});

async function loadAvailableSlots(date) {
  const container = document.getElementById('time-slots-container');
  container.innerHTML = '<p class="no-slots-msg">Caricamento...</p>';

  // Etichetta data leggibile (es. "martedì 15 luglio 2026")
  const dateObj = new Date(date + 'T00:00:00');
  const label = dateObj.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  document.getElementById('selected-date-label').textContent = label;

  const { data: slots, error } = await supabase
    .from('slots')
    .select('id, slot_time, is_booked')
    .eq('slot_date', date)
    .eq('is_booked', false)
    .order('slot_time', { ascending: true });

  if (error) {
    container.innerHTML = '<p class="no-slots-msg">Errore nel caricamento.</p>';
    console.error(error);
    return;
  }

  if (!slots || slots.length === 0) {
    container.innerHTML = '<p class="no-slots-msg">Nessun orario disponibile per questa data.</p>';
    return;
  }

  container.innerHTML = '';
  slots.forEach(slot => {
    const btn = document.createElement('div');
    btn.classList.add('time-slot-btn');
    btn.textContent = slot.slot_time.slice(0, 5); // "09:00:00" -> "09:00"
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.selectedSlot = { id: slot.id, time: slot.slot_time };

      // Aggiorna recap e passa allo step successivo dopo breve delay
      document.getElementById('recap-label').textContent =
        `${label} alle ${slot.slot_time.slice(0, 5)}`;

      setTimeout(() => goToStep('step-details'), 200);
    });
    container.appendChild(btn);
  });
}

document.getElementById('btn-back-to-calendar').addEventListener('click', () => {
  goToStep('step-calendar');
});

document.getElementById('btn-back-to-time').addEventListener('click', () => {
  goToStep('step-time');
});

// ============================================
// STEP 2 — ANAGRAFICA: SCELTA OSPITE O LOGIN
// ============================================
document.getElementById('btn-guest').addEventListener('click', () => {
  document.getElementById('auth-choice').classList.add('hidden');
  document.getElementById('guest-form').classList.remove('hidden');
});

document.getElementById('btn-show-login').addEventListener('click', () => {
  document.getElementById('auth-choice').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
});

// --- LOGIN ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert('Accesso fallito: ' + error.message);
    return;
  }

  state.userSession = data.session;
  await createAppointment({
    name: data.user.user_metadata?.full_name || email.split('@')[0],
    phone: data.user.user_metadata?.phone || 'N/D',
    email: email,
    userId: data.user.id
  });
});

// --- REGISTRAZIONE RAPIDA (dal form di login) ---
document.getElementById('btn-signup').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    alert('Inserisci email e password per registrarti.');
    return;
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    alert('Registrazione fallita: ' + error.message);
    return;
  }

  alert('Registrazione effettuata! Controlla la tua email per confermare, poi effettua il login.');
});

// --- GUEST ---
document.getElementById('guest-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('guest-name').value.trim();
  const phone = document.getElementById('guest-phone').value.trim();
  const email = document.getElementById('guest-email').value.trim();

  await createAppointment({ name, phone, email: email || null, userId: null });
});

// ============================================
// SALVATAGGIO PRENOTAZIONE (comune a guest e utenti loggati)
// ============================================
async function createAppointment({ name, phone, email, userId }) {
  if (!state.selectedSlot) {
    alert('Errore: nessuno slot selezionato. Ricomincia.');
    goToStep('step-calendar');
    return;
  }

  const { error } = await supabase.from('appointments').insert({
    slot_id: state.selectedSlot.id,
    customer_name: name,
    customer_phone: phone,
    customer_email: email,
    user_id: userId
  });

  if (error) {
    alert('Errore nel salvataggio della prenotazione: ' + error.message);
    console.error(error);
    return;
  }

  document.getElementById('success-recap').textContent =
    `${name}, ti aspettiamo il ${document.getElementById('recap-label').textContent}`;

  goToStep('step-success');
}

// ============================================
// NUOVA PRENOTAZIONE (reset stato)
// ============================================
document.getElementById('btn-new-booking').addEventListener('click', () => {
  state.selectedDate = null;
  state.selectedSlot = null;

  document.getElementById('date-picker').value = '';
  document.getElementById('guest-form').reset();
  document.getElementById('login-form').reset();
  document.getElementById('guest-form').classList.add('hidden');
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('auth-choice').classList.remove('hidden');

  goToStep('step-calendar');
});
