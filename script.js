// ============================================
// STATO
// ============================================
const state = {
  calMonth: new Date().getMonth(),
  calYear: new Date().getFullYear(),
  closedDates: [],
  selectedDate: null,
  selectedSlot: null,
  appointmentId: null
};

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

async function apiCall(endpoint, method = 'GET', body = null) {
  const options = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(endpoint, options);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function goToStep(stepId) {
  document.querySelectorAll('.step').forEach(el => el.classList.add('hidden'));
  document.getElementById(stepId).classList.remove('hidden');

  const indicator = document.getElementById('step-indicator');
  const stepNum = { 'step-1': 1, 'step-2': 2, 'step-3': 3, 'step-4': 4 }[stepId];
  if (stepNum) {
    indicator.classList.remove('hidden');
    indicator.querySelectorAll('.step-indicator__item').forEach(item => {
      item.classList.toggle('active', parseInt(item.dataset.step) <= stepNum);
    });
  } else {
    indicator.classList.add('hidden');
  }
}

// ============================================
// STEP 0 — ACCESSO
// ============================================
document.getElementById('access-submit-btn').addEventListener('click', async () => {
  const code = document.getElementById('access-code').value.trim();
  const errEl = document.getElementById('err-access');
  errEl.textContent = '';

  if (!code) { errEl.textContent = 'Inserisci un codice.'; return; }

  const { ok, data } = await apiCall('/api/check-access.php', 'POST', { code });

  if (!ok) { errEl.textContent = 'Errore di connessione. Riprova.'; return; }

  if (data.valid) {
    goToStep('step-1');
    await loadMonthAvailability();
    renderCalendar();
  } else {
    errEl.textContent = 'Codice non valido.';
  }
});
document.getElementById('access-code').addEventListener('keypress', e => {
  if (e.key === 'Enter') document.getElementById('access-submit-btn').click();
});

// ============================================
// STEP 1 — CALENDARIO
// ============================================
async function loadMonthAvailability() {
  const { data } = await apiCall(`/api/get-month-availability.php?year=${state.calYear}&month=${state.calMonth + 1}`);
  state.closedDates = data.closed_dates || [];
}

function renderCalendar() {
  const title = document.getElementById('cal-title');
  title.textContent = `${MESI[state.calMonth]} ${state.calYear}`;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const firstDay = new Date(state.calYear, state.calMonth, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Lun=0
  const daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.classList.add('calendar__day', 'calendar__day--empty');
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${state.calYear}-${String(state.calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.classList.add('calendar__day');
    cell.textContent = d;

    const isPast = dateStr < todayStr;
    const isClosed = state.closedDates.includes(dateStr);

    if (dateStr === todayStr) cell.classList.add('calendar__day--today');

    if (isPast || isClosed) {
      cell.classList.add('calendar__day--disabled');
    } else {
      cell.addEventListener('click', () => selectDate(dateStr, d));
    }

    grid.appendChild(cell);
  }
}

document.getElementById('cal-prev').addEventListener('click', async () => {
  state.calMonth--;
  if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
  await loadMonthAvailability();
  renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', async () => {
  state.calMonth++;
  if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
  await loadMonthAvailability();
  renderCalendar();
});

async function selectDate(dateStr, dayNum) {
  state.selectedDate = dateStr;
  document.querySelectorAll('.calendar__day').forEach(c => c.classList.remove('calendar__day--selected'));
  event.target.classList.add('calendar__day--selected');

  const dateObj = new Date(dateStr + 'T00:00:00');
  const label = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('selected-date-display').textContent = label;

  goToStep('step-2');
  await loadSlots(dateStr, label);
}

document.getElementById('back-to-1').addEventListener('click', () => goToStep('step-1'));

// ============================================
// STEP 2 — SLOT
// ============================================
async function loadSlots(date, label) {
  const loading = document.getElementById('slots-loading');
  const errorEl = document.getElementById('slots-error');
  const container = document.getElementById('slots-container');

  loading.classList.remove('hidden');
  errorEl.classList.add('hidden');
  container.classList.add('hidden');

  const { ok, data } = await apiCall(`/api/get-slots.php?date=${encodeURIComponent(date)}`);
  loading.classList.add('hidden');

  if (!ok) {
    errorEl.textContent = 'Errore nel caricamento degli orari.';
    errorEl.classList.remove('hidden');
    return;
  }

  const slots = data.slots || [];
  const morning = slots.filter(s => s.slot_time < '13:00:00');
  const afternoon = slots.filter(s => s.slot_time >= '13:00:00');

  if (slots.length === 0) {
    errorEl.textContent = 'Nessun orario disponibile per questa data.';
    errorEl.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  renderSlotGroup('slots-morning', morning, label);
  renderSlotGroup('slots-afternoon', afternoon, label);
}

function renderSlotGroup(containerId, slots, label) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  if (slots.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:.8rem">Nessuno slot</p>';
    return;
  }
  slots.forEach(slot => {
    const btn = document.createElement('div');
    btn.classList.add('slot-btn');
    btn.textContent = slot.slot_time.slice(0, 5);
    btn.addEventListener('click', () => {
      document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.selectedSlot = { id: slot.id, time: slot.slot_time };
      document.getElementById('booking-summary').textContent = `${label} alle ${slot.slot_time.slice(0, 5)}`;
      setTimeout(() => goToStep('step-3'), 200);
    });
    el.appendChild(btn);
  });
}

document.getElementById('back-to-2').addEventListener('click', () => goToStep('step-2'));

// ============================================
// STEP 3 — DATI
// ============================================
document.getElementById('btn-guest').addEventListener('click', () => {
  document.getElementById('auth-choice').classList.add('hidden');
  document.getElementById('guest-form').classList.remove('hidden');
});
document.getElementById('btn-show-login').addEventListener('click', () => {
  document.getElementById('auth-choice').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
});
document.getElementById('back-to-choice-from-login').addEventListener('click', () => {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('auth-choice').classList.remove('hidden');
});
document.getElementById('back-to-choice-from-guest').addEventListener('click', () => {
  document.getElementById('guest-form').classList.add('hidden');
  document.getElementById('auth-choice').classList.remove('hidden');
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('err-login');
  errEl.classList.add('hidden');

  const { ok, data } = await apiCall('/api/auth.php', 'POST', { action: 'login', email, password });

  if (!ok) {
    errEl.textContent = data.error || 'Accesso fallito';
    errEl.classList.remove('hidden');
    return;
  }

  await submitAppointment({
    name: data.user.name,
    phone: 'N/D',
    email: data.user.email,
    userId: data.user.id
  });
});

document.getElementById('btn-signup').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('err-login');
  errEl.classList.add('hidden');

  if (!email || !password) {
    errEl.textContent = 'Inserisci email e password per registrarti.';
    errEl.classList.remove('hidden');
    return;
  }

  const { ok, data } = await apiCall('/api/auth.php', 'POST', { action: 'signup', email, password });

  if (!ok) {
    errEl.textContent = data.error || 'Registrazione fallita';
    errEl.classList.remove('hidden');
    return;
  }

  if (data.session) {
    // Conferma email disattivata su Supabase: l'utente è già loggato, si procede subito
    await submitAppointment({ name: data.user.name, phone: 'N/D', email: data.user.email, userId: data.user.id });
  } else {
    alert(data.message || 'Registrazione effettuata. Controlla la tua email.');
  }
});

document.getElementById('guest-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();

  await submitAppointment({ name, phone, email, userId: null });
});

async function submitAppointment({ name, phone, email, userId }) {
  if (!state.selectedSlot) { alert('Seleziona di nuovo uno slot.'); goToStep('step-1'); return; }

  const submitBtn = document.getElementById('submit-btn');
  const submitText = document.getElementById('submit-text');
  const spinner = document.getElementById('submit-spinner');
  if (submitBtn) { submitBtn.disabled = true; }
  if (spinner) spinner.classList.remove('hidden');

  const service = document.getElementById('service').value;
  const notes = document.getElementById('notes') ? document.getElementById('notes').value.trim() : '';
  const globalErr = document.getElementById('err-global');
  globalErr.classList.add('hidden');

  const { ok, data } = await apiCall('/api/create-appointment.php', 'POST', {
    slot_id: state.selectedSlot.id, name, phone, email, service, notes, user_id: userId
  });

  if (submitBtn) submitBtn.disabled = false;
  if (spinner) spinner.classList.add('hidden');

  if (!ok) {
    globalErr.textContent = data.error || 'Errore nel salvataggio.';
    globalErr.classList.remove('hidden');
    if (data.error && data.error.includes('non è più disponibile')) {
      goToStep('step-2');
      await loadSlots(state.selectedDate, document.getElementById('selected-date-display').textContent);
    }
    return;
  }

  state.appointmentId = data.appointment_id;
  document.getElementById('success-message').textContent = `${name}, ti aspettiamo il ${document.getElementById('booking-summary').textContent}`;
  document.getElementById('success-details').textContent = `Servizio: ${service}`;
  document.getElementById('add-to-calendar-btn').href = `/api/ical-customer.php?id=${state.appointmentId}`;

  goToStep('step-4');
}

// ============================================
// NUOVA PRENOTAZIONE
// ============================================
document.getElementById('new-booking-btn').addEventListener('click', () => {
  state.selectedDate = null;
  state.selectedSlot = null;
  state.appointmentId = null;

  document.getElementById('guest-form').reset();
  document.getElementById('login-form').reset();
  document.getElementById('guest-form').classList.add('hidden');
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('auth-choice').classList.remove('hidden');

  goToStep('step-1');
  renderCalendar();
});
