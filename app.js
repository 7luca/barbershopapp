// ============================================
// STATO APPLICAZIONE
// ============================================
const state = {
  accessGranted: false,
  selectedDate: null,
  selectedSlot: null, // { id, time }
  loggedUser: null
};

// ============================================
// HELPER: cambio step (nessun reload di pagina)
// ============================================
function goToStep(stepId) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
}

// ============================================
// HELPER: chiamata generica agli endpoint PHP
// ============================================
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(endpoint, options);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
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

  const { ok, data } = await apiCall('/api/check-access.php', 'POST', { code: input });

  if (!ok) {
    errorEl.textContent = 'Errore di connessione. Riprova.';
    return;
  }

  if (data.valid) {
    state.accessGranted = true;
    goToStep('step-calendar');
    const dateInput = document.getElementById('date-picker');
    dateInput.min = new Date().toISOString().split('T')[0];
  } else {
    errorEl.textContent = 'Codice non valido.';
  }
});

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

  const dateObj = new Date(date + 'T00:00:00');
  const label = dateObj.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  document.getElementById('selected-date-label').textContent = label;

  const { ok, data } = await apiCall(`/api/get-slots.php?date=${encodeURIComponent(date)}`);

  if (!ok) {
    container.innerHTML = '<p class="no-slots-msg">Errore nel caricamento.</p>';
    return;
  }

  const slots = data.slots || [];

  if (slots.length === 0) {
    container.innerHTML = '<p class="no-slots-msg">Nessun orario disponibile per questa data.</p>';
    return;
  }

  container.innerHTML = '';
  slots.forEach(slot => {
    const btn = document.createElement('div');
    btn.classList.add('time-slot-btn');
    btn.textContent = slot.slot_time.slice(0, 5);
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.selectedSlot = { id: slot.id, time: slot.slot_time };

      document.getElementById('recap-label').textContent =
        `${label} alle ${slot.slot_time.slice(0, 5)}`;

      setTimeout(() => goToStep('step-details'), 200);
    });
    container.appendChild(btn);
  });
}

document.getElementById('btn-back-to-calendar').addEventListener('click', () => goToStep('step-calendar'));
document.getElementById('btn-back-to-time').addEventListener('click', () => goToStep('step-time'));

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

  const { ok, data } = await apiCall('/api/auth.php', 'POST', { action: 'login', email, password });

  if (!ok) {
    alert('Accesso fallito: ' + (data.error || 'errore sconosciuto'));
    return;
  }

  state.loggedUser = data.user;
  await createAppointment({
    name: data.user.name,
    phone: 'N/D',
    email: data.user.email,
    userId: data.user.id
  });
});

// --- REGISTRAZIONE ---
document.getElementById('btn-signup').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    alert('Inserisci email e password per registrarti.');
    return;
  }

  const { ok, data } = await apiCall('/api/auth.php', 'POST', { action: 'signup', email, password });

  if (!ok) {
    alert('Registrazione fallita: ' + (data.error || 'errore sconosciuto'));
    return;
  }

  alert(data.message || 'Registrazione effettuata. Controlla la tua email.');
});

// --- GUEST ---
document.getElementById('guest-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('guest-name').value.trim();
  const phone = document.getElementById('guest-phone').value.trim();
  const email = document.getElementById('guest-email').value.trim();

  await createAppointment({ name, phone, email, userId: null });
});

// ============================================
// SALVATAGGIO PRENOTAZIONE
// ============================================
async function createAppointment({ name, phone, email, userId }) {
  if (!state.selectedSlot) {
    alert('Errore: nessuno slot selezionato. Ricomincia.');
    goToStep('step-calendar');
    return;
  }

  const { ok, data } = await apiCall('/api/create-appointment.php', 'POST', {
    slot_id: state.selectedSlot.id,
    name,
    phone,
    email,
    user_id: userId
  });

  if (!ok) {
    alert('Errore nel salvataggio: ' + (data.error || 'riprova più tardi'));
    if (data.error && data.error.includes('non è più disponibile')) {
      await loadAvailableSlots(state.selectedDate);
      goToStep('step-time');
    }
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
