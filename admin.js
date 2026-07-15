async function apiCall(endpoint, method = 'GET', body = null) {
  const options = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(endpoint, options);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

// ============================================
// SESSIONE
// ============================================
(async function init() {
  const { data } = await apiCall('/api/admin-check.php');
  if (data.authenticated) await enterDashboard();
})();

document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';

  const { ok, data } = await apiCall('/api/admin-login.php', 'POST', { email, password });
  if (!ok) { errEl.textContent = data.error || 'Accesso non riuscito.'; return; }
  await enterDashboard();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await apiCall('/api/admin-logout.php', 'POST');
  location.reload();
});

async function enterDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('admin-panel').classList.remove('hidden');
  document.getElementById('admin-date-display').textContent = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  setupTabs();
  setupIcalLink();
  await loadAppointments('upcoming');
  initAvailabilityTab();
  initHoursTab();
}

// ============================================
// TABS
// ============================================
function setupTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.remove('hidden');
    });
  });
}

// ============================================
// TAB PRENOTAZIONI
// ============================================
async function loadAppointments(scope = 'upcoming', date = '') {
  const loading = document.getElementById('table-loading');
  const errorEl = document.getElementById('table-error');
  const wrap = document.getElementById('table-wrap');

  loading.classList.remove('hidden');
  errorEl.classList.add('hidden');

  let url = `/api/admin-appointments.php?scope=${scope}`;
  if (date) url += `&date=${encodeURIComponent(date)}`;

  const { ok, data } = await apiCall(url);
  loading.classList.add('hidden');

  if (!ok) {
    errorEl.textContent = data.error || 'Errore nel caricamento.';
    errorEl.classList.remove('hidden');
    return;
  }

  document.getElementById('stat-total').textContent = data.stats?.total ?? '—';
  document.getElementById('stat-today').textContent = data.stats?.today ?? '—';

  const tbody = document.getElementById('appointments-tbody');
  const appts = data.appointments || [];

  if (appts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="admin-empty">Nessuna prenotazione.</td></tr>';
    return;
  }

  tbody.innerHTML = appts.map(a => {
    const slot = a.slots || {};
    return `<tr>
      <td>${slot.slot_date || '—'}</td>
      <td>${(slot.slot_time || '').slice(0,5)}</td>
      <td>${escapeHtml(a.customer_name)}</td>
      <td>${escapeHtml(a.service || '—')}</td>
      <td>${escapeHtml(a.customer_phone)}</td>
      <td>${escapeHtml(a.customer_email || '—')}</td>
      <td>${escapeHtml(a.notes || '—')}</td>
    </tr>`;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

document.getElementById('filter-btn').addEventListener('click', () => {
  const date = document.getElementById('filter-date').value;
  if (date) loadAppointments('all', date);
});
document.getElementById('upcoming-btn').addEventListener('click', () => {
  document.getElementById('filter-date').value = '';
  loadAppointments('upcoming');
});
document.getElementById('all-btn').addEventListener('click', () => {
  document.getElementById('filter-date').value = '';
  loadAppointments('all');
});

function setupIcalLink() {
  const icalInput = document.getElementById('ical-url');
  const ICAL_TOKEN = '5jN1VOQ1WN'; // deve combaciare con ICAL_SECRET_TOKEN su Vercel
  icalInput.textContent = `${window.location.origin}/api/ical.php?token=${ICAL_TOKEN}`;

  document.getElementById('copy-ical-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(icalInput.textContent);
    alert('Link copiato!');
  });
}

// ============================================
// TAB DISPONIBILITÀ
// ============================================
const availState = { month: new Date().getMonth(), year: new Date().getFullYear(), dayStatus: {} };

function initAvailabilityTab() {
  renderAvailCalendar();
  document.getElementById('avail-cal-prev').addEventListener('click', () => {
    availState.month--; if (availState.month < 0) { availState.month = 11; availState.year--; }
    renderAvailCalendar();
  });
  document.getElementById('avail-cal-next').addEventListener('click', () => {
    availState.month++; if (availState.month > 11) { availState.month = 0; availState.year++; }
    renderAvailCalendar();
  });
}

async function renderAvailCalendar() {
  document.getElementById('avail-cal-title').textContent = `${MESI[availState.month]} ${availState.year}`;

  const { data } = await apiCall(`/api/admin-availability-month.php?year=${availState.year}&month=${availState.month + 1}`);
  availState.dayStatus = data.days || {};

  const grid = document.getElementById('avail-cal-grid');
  grid.innerHTML = '';

  const firstDay = new Date(availState.year, availState.month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(availState.year, availState.month + 1, 0).getDate();

  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.classList.add('calendar__day', 'calendar__day--empty');
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${availState.year}-${String(availState.month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.classList.add('calendar__day', 'avail-dot-wrap');
    cell.textContent = d;

    const status = availState.dayStatus[dateStr];
    const dot = document.createElement('div');
    dot.classList.add('avail-cal-dot', 'avail-dot--' + (status || 'closed'));
    cell.appendChild(dot);

    cell.addEventListener('click', () => loadDayDetail(dateStr));
    grid.appendChild(cell);
  }
}

async function loadDayDetail(dateStr) {
  const col = document.getElementById('avail-detail-col');
  col.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px 0">Caricamento...</p>';

  const { ok, data } = await apiCall(`/api/admin-day-detail.php?date=${encodeURIComponent(dateStr)}`);

  if (!ok) { col.innerHTML = '<p style="color:var(--danger)">Errore nel caricamento.</p>'; return; }

  const slots = data.slots || [];
  const dateObj = new Date(dateStr + 'T00:00:00');
  const label = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  const allOpen = slots.length > 0 && slots.every(s => s.is_open);

  col.innerHTML = `
    <div class="avail-day-header">
      <span class="avail-day-title">${label}</span>
      <button class="btn btn--outline" id="toggle-day-btn" style="padding:8px 16px;font-size:.82rem">
        ${allOpen ? '🔒 Chiudi giornata' : '🔓 Apri giornata'}
      </button>
    </div>
    <div class="avail-slot-grid" id="avail-slot-grid"></div>
  `;

  document.getElementById('toggle-day-btn').addEventListener('click', async () => {
    await apiCall('/api/admin-toggle-day.php', 'POST', { date: dateStr, is_open: !allOpen });
    await loadDayDetail(dateStr);
    await renderAvailCalendar();
  });

  const slotGrid = document.getElementById('avail-slot-grid');

  if (slots.length === 0) {
    slotGrid.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem">Nessun orario configurato per questo giorno della settimana (vedi tab "Orari Apertura").</p>';
    return;
  }

  slots.forEach(slot => {
    const div = document.createElement('div');
    const cls = slot.is_booked ? 'avail-slot--booked' : (slot.is_open ? 'avail-slot--open' : 'avail-slot--closed');
    div.classList.add('avail-slot', cls);
    div.innerHTML = `${slot.slot_time.slice(0,5)}${slot.customer_name ? `<small>${escapeHtml(slot.customer_name)}</small>` : ''}`;

    if (!slot.is_booked) {
      div.addEventListener('click', async () => {
        await apiCall('/api/admin-toggle-slot.php', 'POST', { slot_id: slot.id, is_open: !slot.is_open });
        await loadDayDetail(dateStr);
        await renderAvailCalendar();
      });
    }
    slotGrid.appendChild(div);
  });
}

// ============================================
// TAB ORARI APERTURA
// ============================================
const hoursState = { dow: 1 };

function initHoursTab() {
  loadHoursForDow(1);
  document.querySelectorAll('.hours-dow-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.hours-dow-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      hoursState.dow = parseInt(tab.dataset.dow);
      loadHoursForDow(hoursState.dow);
    });
  });

  document.getElementById('add-slot-btn').addEventListener('click', async () => {
    const time = document.getElementById('new-slot-time').value;
    const feedback = document.getElementById('hours-feedback');
    if (!time) { feedback.textContent = 'Seleziona un orario.'; feedback.style.color = 'var(--danger)'; return; }

    const { ok, data } = await apiCall('/api/admin-hours-add.php', 'POST', { dow: hoursState.dow, time });
    feedback.style.color = ok ? 'var(--success)' : 'var(--danger)';
    feedback.textContent = ok ? 'Slot aggiunto ✓' : (data.error || 'Errore.');
    if (ok) {
      document.getElementById('new-slot-time').value = '';
      await loadHoursForDow(hoursState.dow);
    }
  });

  document.getElementById('reset-hours-btn').addEventListener('click', async () => {
    if (!confirm('Ripristinare gli orari di default per questo giorno? Le personalizzazioni andranno perse.')) return;
    await apiCall('/api/admin-hours-reset.php', 'POST', { dow: hoursState.dow });
    await loadHoursForDow(hoursState.dow);
  });
}

async function loadHoursForDow(dow) {
  const loading = document.getElementById('hours-loading');
  const grid = document.getElementById('hours-grid');
  loading.classList.remove('hidden');

  const { ok, data } = await apiCall(`/api/admin-hours.php?dow=${dow}`);
  loading.classList.add('hidden');

  if (!ok) { grid.innerHTML = '<p style="color:var(--danger)">Errore nel caricamento.</p>'; return; }

  const hours = data.hours || [];
  if (hours.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem">Nessun orario configurato. Aggiungine uno sopra o ripristina i default.</p>';
    return;
  }

  grid.innerHTML = '';
  hours.forEach(h => {
    const div = document.createElement('div');
    div.classList.add('hours-slot');
    if (h.is_active) div.classList.add('active');
    div.textContent = h.slot_time.slice(0, 5);
    div.addEventListener('click', async () => {
      await apiCall('/api/admin-hours.php', 'POST', { id: h.id, is_active: !h.is_active });
      await loadHoursForDow(dow);
    });
    grid.appendChild(div);
  });
}
