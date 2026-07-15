// ============================================
// HELPER: chiamata generica agli endpoint PHP (con cookie di sessione)
// ============================================
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin' // include il cookie httpOnly
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(endpoint, options);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ============================================
// CONTROLLO SESSIONE ALL'AVVIO
// ============================================
(async function initAdmin() {
  const { data } = await apiCall('/api/admin-check.php');
  if (data.authenticated) {
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

  const { ok, data } = await apiCall('/api/admin-login.php', 'POST', { email, password });

  if (!ok) {
    errorEl.textContent = data.error || 'Accesso non riuscito.';
    return;
  }

  await enterDashboard();
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await apiCall('/api/admin-logout.php', 'POST');
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

  const { ok, data } = await apiCall('/api/admin-slots.php', 'POST', { date, time });

  if (!ok) {
    msgEl.textContent = data.error || 'Errore nella creazione dello slot.';
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

  const { ok, data } = await apiCall(`/api/admin-slots.php?date=${encodeURIComponent(date)}`);

  if (!ok) {
    container.innerHTML = '<p>Errore nel caricamento.</p>';
    return;
  }

  const slots = data.slots || [];

  if (slots.length === 0) {
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
    delBtn.disabled = slot.is_booked;
    delBtn.addEventListener('click', async () => {
      if (!confirm('Eliminare questo slot?')) return;
      const { ok, data } = await apiCall('/api/admin-delete-slot.php', 'POST', { slot_id: slot.id });
      if (!ok) {
        alert(data.error || 'Errore nella eliminazione.');
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

  const { ok, data } = await apiCall('/api/admin-appointments.php');

  if (!ok) {
    container.innerHTML = '<p>Errore nel caricamento delle prenotazioni.</p>';
    return;
  }

  const appointments = data.appointments || [];

  if (appointments.length === 0) {
    container.innerHTML = '<p style="color:#999">Nessuna prenotazione ancora.</p>';
    return;
  }

  container.innerHTML = '';
  appointments.forEach(appt => {
    const row = document.createElement('div');
    row.classList.add('appointment-row');

    const slot = appt.slots;
    const dateLabel = slot
      ? `${slot.slot_date} · ${slot.slot_time.slice(0, 5)}`
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
// LINK ICAL
// ============================================
function setupIcalLink() {
  const icalInput = document.getElementById('ical-link');
  // Il token va inserito manualmente qui una volta (stesso valore di ICAL_SECRET_TOKEN su Vercel)
  const ICAL_TOKEN = 'vodazmmhfu';
  icalInput.value = `${window.location.origin}/api/ical.php?token=${ICAL_TOKEN}`;

  document.getElementById('btn-copy-ical').addEventListener('click', () => {
    icalInput.select();
    document.execCommand('copy');
    alert('Link copiato!');
  });
}
