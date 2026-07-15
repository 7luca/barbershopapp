/**
 * script.js — Logica frontend del flusso di prenotazione
 * Gestisce: Calendario → Orari → Form → Successo
 */

'use strict';

// ─────────────────────────────────────────
// STATO GLOBALE dell'applicazione
// ─────────────────────────────────────────
const state = {
    selectedDate: null,   // 'YYYY-MM-DD'
    selectedTime: null,   // 'HH:MM'
    selectedService: null,
    currentMonth: null,   // oggetto Date puntato al primo del mese corrente
};

// ─────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────
const MONTHS_IT = [
    'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
    'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
];

// ─────────────────────────────────────────
// RIFERIMENTI AL DOM
// ─────────────────────────────────────────
const $ = id => document.getElementById(id);

const els = {
    // Step panels
    step1: $('step-1'),
    step2: $('step-2'),
    step3: $('step-3'),
    step4: $('step-4'),

    // Step indicator items
    indicators: document.querySelectorAll('.step-indicator__item'),

    // Calendario
    calTitle: $('cal-title'),
    calGrid:  $('cal-grid'),
    calPrev:  $('cal-prev'),
    calNext:  $('cal-next'),

    // Slot orari
    slotsContainer:  $('slots-container'),
    slotsMorning:    $('slots-morning'),
    slotsAfternoon:  $('slots-afternoon'),
    slotsLoading:    $('slots-loading'),
    slotsError:      $('slots-error'),
    selectedDateDisplay: $('selected-date-display'),

    // Servizio
    serviceSelect: $('service'),

    // Form
    bookingForm: $('booking-form'),
    nameInput:  $('name'),
    phoneInput: $('phone'),
    emailInput: $('email'),
    notesInput: $('notes'),
    errName:    $('err-name'),
    errPhone:   $('err-phone'),
    errEmail:   $('err-email'),
    errGlobal:  $('err-global'),
    submitBtn:  $('submit-btn'),
    submitText: $('submit-text'),
    submitSpinner: $('submit-spinner'),

    // Riepilogo step 3
    bookingSummary: $('booking-summary'),

    // Successo
    successMessage: $('success-message'),
    successDetails: $('success-details'),
    newBookingBtn:  $('new-booking-btn'),
};

// ─────────────────────────────────────────
// NAVIGAZIONE TRA STEP
// ─────────────────────────────────────────
function goToStep(n) {
    [els.step1, els.step2, els.step3, els.step4].forEach((el, i) => {
        el.classList.toggle('hidden', i + 1 !== n);
    });

    els.indicators.forEach((el, i) => {
        const stepNum = i / 2 + 1; // Gli elementi pari sono le linee
        if (el.dataset.step) {
            const s = parseInt(el.dataset.step);
            el.classList.remove('active', 'completed');
            if (s === n) el.classList.add('active');
            if (s < n)  el.classList.add('completed');
        }
    });

    // Scroll alla card
    document.querySelector('.booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─────────────────────────────────────────
// CALENDARIO
// ─────────────────────────────────────────
function initCalendar() {
    const now = new Date();
    state.currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    renderCalendar();
}

function renderCalendar() {
    const year  = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();

    els.calTitle.textContent = `${MONTHS_IT[month]} ${year}`;

    // Calcola il giorno della settimana del primo del mese (0=domenica)
    let firstDow = state.currentMonth.getDay(); // 0=Dom, 1=Lun...
    // Converti a lunedì=0
    firstDow = (firstDow === 0) ? 6 : firstDow - 1;

    // Ultimo giorno del mese
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    els.calGrid.innerHTML = '';

    // Celle vuote per il padding iniziale
    for (let i = 0; i < firstDow; i++) {
        const empty = document.createElement('button');
        empty.className = 'calendar__day calendar__day--empty';
        empty.disabled = true;
        empty.setAttribute('aria-hidden', 'true');
        els.calGrid.appendChild(empty);
    }

    // Giorni del mese
    for (let d = 1; d <= daysInMonth; d++) {
        const btn = document.createElement('button');
        const thisDate = new Date(year, month, d);
        const dateStr  = formatDate(thisDate);
        const dow      = thisDate.getDay(); // 0=Dom

        btn.className = 'calendar__day';
        btn.textContent = d;
        btn.dataset.date = dateStr;
        btn.setAttribute('aria-label', `${d} ${MONTHS_IT[month]} ${year}`);

        if (dow === 0) {
            btn.classList.add('calendar__day--sunday');
            btn.disabled = true;
            btn.title = 'Chiuso la domenica';
        } else if (thisDate < today) {
            btn.classList.add('calendar__day--past');
            btn.disabled = true;
        } else {
            if (thisDate.toDateString() === today.toDateString()) {
                btn.classList.add('calendar__day--today');
            }
            if (dateStr === state.selectedDate) {
                btn.classList.add('calendar__day--selected');
            }
            btn.addEventListener('click', () => selectDate(dateStr, btn));
        }

        els.calGrid.appendChild(btn);
    }

    // Disabilita pulsante "precedente" se siamo nel mese corrente
    const nowMonth = new Date();
    const isCurrentMonth = year === nowMonth.getFullYear() && month === nowMonth.getMonth();
    els.calPrev.disabled = isCurrentMonth;
    els.calPrev.style.opacity = isCurrentMonth ? '.3' : '1';
}

function selectDate(dateStr, btn) {
    state.selectedDate = dateStr;
    state.selectedTime = null;

    // Visual feedback
    document.querySelectorAll('.calendar__day--selected').forEach(el =>
        el.classList.remove('calendar__day--selected')
    );
    btn.classList.add('calendar__day--selected');

    // Vai allo step 2 e carica gli slot
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    els.selectedDateDisplay.textContent = `${MONTHS_IT[dateObj.getMonth()]} ${day}, ${year}`;

    goToStep(2);
    loadSlots(dateStr);
}

els.calPrev.addEventListener('click', () => {
    state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
    renderCalendar();
});

els.calNext.addEventListener('click', () => {
    state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
    renderCalendar();
});

// ─────────────────────────────────────────
// CARICAMENTO SLOT ORARI
// ─────────────────────────────────────────
async function loadSlots(dateStr) {
    // Reset UI
    els.slotsLoading.classList.remove('hidden');
    els.slotsContainer.classList.add('hidden');
    els.slotsError.classList.add('hidden');
    els.slotsMorning.innerHTML = '';
    els.slotsAfternoon.innerHTML = '';

    try {
        const res  = await fetch(`api/slots.php?date=${encodeURIComponent(dateStr)}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Errore nel caricamento degli orari');

        els.slotsLoading.classList.add('hidden');

        if (data.closed) {
            els.slotsError.textContent = data.message;
            els.slotsError.classList.remove('hidden');
            return;
        }

        if (!data.slots || data.slots.length === 0) {
            els.slotsError.textContent = 'Nessun orario disponibile per questo giorno.';
            els.slotsError.classList.remove('hidden');
            return;
        }

        // Separa mattina (< 13:00) da pomeriggio
        const morning   = data.slots.filter(s => s.time < '13:00');
        const afternoon = data.slots.filter(s => s.time >= '13:00');

        renderSlots(morning, els.slotsMorning);
        renderSlots(afternoon, els.slotsAfternoon);
        els.slotsContainer.classList.remove('hidden');

    } catch (err) {
        els.slotsLoading.classList.add('hidden');
        els.slotsError.textContent = `⚠ ${err.message}`;
        els.slotsError.classList.remove('hidden');
    }
}

function renderSlots(slots, container) {
    if (slots.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:8px 0">Nessun orario disponibile</p>';
        return;
    }

    slots.forEach(slot => {
        const btn = document.createElement('button');
        btn.className = 'slot' + (slot.available ? '' : ' slot--booked');
        btn.textContent = slot.time;
        btn.dataset.time = slot.time;
        btn.disabled = !slot.available;
        btn.title = slot.available ? `Prenota alle ${slot.time}` : 'Già prenotato';

        if (slot.available) {
            btn.addEventListener('click', () => selectTime(slot.time, btn));
        }

        container.appendChild(btn);
    });
}

function selectTime(time, btn) {
    state.selectedTime = time;

    // Visual feedback
    document.querySelectorAll('.slot--selected').forEach(el =>
        el.classList.remove('slot--selected')
    );
    btn.classList.add('slot--selected');

    // Piccolo ritardo per far vedere la selezione prima di passare allo step
    setTimeout(() => goToStep(3), 250);

    // Aggiorna riepilogo nello step 3
    const [year, month, day] = state.selectedDate.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    els.bookingSummary.textContent =
        `${MONTHS_IT[dateObj.getMonth()]} ${day}, ${year} — ore ${time}`;
}

// ─────────────────────────────────────────
// NAVIGAZIONE INDIETRO
// ─────────────────────────────────────────
$('back-to-1').addEventListener('click', () => goToStep(1));
$('back-to-2').addEventListener('click', () => {
    state.selectedTime = null;
    goToStep(2);
});

// ─────────────────────────────────────────
// INVIO FORM — STEP 3
// ─────────────────────────────────────────
function validateForm() {
    let valid = true;

    // Reset errori
    els.errName.textContent = '';
    els.errPhone.textContent = '';
    els.errEmail.textContent = '';
    els.nameInput.classList.remove('invalid');
    els.phoneInput.classList.remove('invalid');
    els.emailInput.classList.remove('invalid');

    const name  = els.nameInput.value.trim();
    const phone = els.phoneInput.value.trim();
    const email = els.emailInput.value.trim();

    if (name.length < 2) {
        els.errName.textContent = 'Inserisci il tuo nome (min. 2 caratteri)';
        els.nameInput.classList.add('invalid');
        valid = false;
    }

    if (!/^[\d\s\+\-\(\)]{7,20}$/.test(phone)) {
        els.errPhone.textContent = 'Numero di telefono non valido';
        els.phoneInput.classList.add('invalid');
        valid = false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        els.errEmail.textContent = 'Indirizzo email non valido';
        els.emailInput.classList.add('invalid');
        valid = false;
    }

    return valid;
}

els.submitBtn.addEventListener('click', async () => {
    if (!validateForm()) return;

    // UI: loading state
    els.submitText.textContent = 'Invio in corso...';
    els.submitSpinner.classList.remove('hidden');
    els.submitBtn.disabled = true;
    els.errGlobal.classList.add('hidden');

    const payload = {
        name:    els.nameInput.value.trim(),
        phone:   els.phoneInput.value.trim(),
        email:   els.emailInput.value.trim(),
        date:    state.selectedDate,
        time:    state.selectedTime,
        service: els.serviceSelect.value,
        notes:   els.notesInput.value.trim(),
    };

    try {
        const res  = await fetch('api/book.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Errore nella prenotazione');

        // Successo → Step 4
        showSuccess(data, payload);

    } catch (err) {
        els.errGlobal.textContent = `⚠ ${err.message}`;
        els.errGlobal.classList.remove('hidden');
    } finally {
        els.submitText.textContent = 'Conferma Prenotazione →';
        els.submitSpinner.classList.add('hidden');
        els.submitBtn.disabled = false;
    }
});

function showSuccess(data, payload) {
    const [year, month, day] = payload.date.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dateReadable = `${day} ${MONTHS_IT[dateObj.getMonth()]} ${year}`;

    els.successMessage.textContent =
        `Ciao ${payload.name}! Il tuo appuntamento è confermato.`;

    els.successDetails.innerHTML = `
        <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:4px 0;color:var(--text-muted);width:40%"> Data</td><td><strong>${dateReadable}</strong></td></tr>
            <tr><td style="padding:4px 0;color:var(--text-muted)"> Orario</td><td><strong>${payload.time}</strong></td></tr>
            <tr><td style="padding:4px 0;color:var(--text-muted)"> Servizio</td><td><strong>${payload.service}</strong></td></tr>
            <tr><td style="padding:4px 0;color:var(--text-muted)"> Telefono</td><td><strong>${payload.phone}</strong></td></tr>
        </table>
    `;

    goToStep(4);
}

// ─────────────────────────────────────────
// NUOVA PRENOTAZIONE
// ─────────────────────────────────────────
els.newBookingBtn.addEventListener('click', () => {
    // Reset stato
    state.selectedDate = null;
    state.selectedTime = null;

    // Reset form
    els.nameInput.value  = '';
    els.phoneInput.value = '';
    els.emailInput.value = '';
    els.notesInput.value = '';

    // Torna allo step 1
    goToStep(1);
    renderCalendar();
});

// ─────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initCalendar();
    goToStep(1);
});