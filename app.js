/**
 * Gratuity — Tip Calculator & Bill Splitter
 *
 * Rounding policy:
 *   Per-person amounts are CEIL'd to the nearest paisa (2 decimal places).
 *   This ensures the group never underpays. When this creates a surplus
 *   (last person pays a bit less), we show the exact amount per person
 *   and note the remainder so the group can settle it.
 *
 *   e.g. Rs 100 / 3 people = 33.34 | 33.34 | 33.32  (last person saves 2 paisas)
 */

(function () {
  'use strict';

  /* ── DOM refs ─────────────────────────────────────────────────── */
  const billInput      = document.getElementById('bill');
  const tipInput       = document.getElementById('tip-custom');
  const peopleInput    = document.getElementById('people');
  const presetBtns     = document.querySelectorAll('.preset-btn');
  const decrementBtn   = document.getElementById('decrement');
  const incrementBtn   = document.getElementById('increment');
  const resetBtn       = document.getElementById('reset');

  const outTip         = document.getElementById('out-tip');
  const outTotal       = document.getElementById('out-total');
  const outPerPerson   = document.getElementById('out-per-person');
  const roundingNote   = document.getElementById('rounding-note');
  const splitBreakdown = document.getElementById('split-breakdown');

  const billError      = document.getElementById('bill-error');
  const tipError       = document.getElementById('tip-error');
  const peopleError    = document.getElementById('people-error');

  /* ── State ────────────────────────────────────────────────────── */
  let activePreset = null;   // number or null
  let lastValues   = { tip: null, total: null, per: null };

  /* ── Validation ───────────────────────────────────────────────── */
  const MAX_BILL   = 99_999_999;
  const MAX_TIP    = 100;          // sensible upper bound: 100%
  const MAX_PEOPLE = 999;

  function validateBill(raw) {
    if (raw === '' || raw === null || raw === undefined) return null; // empty → no error, no value
    const n = parseFloat(raw);
    if (isNaN(n))               return { error: 'Please enter a valid number.' };
    if (n < 0)                  return { error: 'Bill amount cannot be negative.' };
    if (n === 0)                return { error: 'Bill amount must be greater than zero.' };
    if (n > MAX_BILL)           return { error: `Amount seems too large (max Rs ${fmt(MAX_BILL)}).` };
    return { value: n };
  }

  function validateTip(raw) {
    if (raw === '' || raw === null || raw === undefined) return null;
    const n = parseFloat(raw);
    if (isNaN(n))               return { error: 'Please enter a valid percentage.' };
    if (n < 0)                  return { error: 'Tip percentage cannot be negative.' };
    if (n > MAX_TIP)            return { error: `Tip cannot exceed ${MAX_TIP}%.` };
    return { value: n };
  }

  function validatePeople(raw) {
    if (raw === '' || raw === null || raw === undefined) return null;
    const n = parseInt(raw, 10);
    if (isNaN(n) || !Number.isInteger(n) || String(raw).includes('.'))
                                return { error: 'Must be a whole number.' };
    if (n < 1)                  return { error: 'At least 1 person required.' };
    if (n > MAX_PEOPLE)         return { error: `Maximum ${MAX_PEOPLE} people.` };
    return { value: n };
  }

  /* ── Error display ────────────────────────────────────────────── */
  function showError(el, inputEl, msg) {
    el.textContent = msg;
    el.classList.toggle('visible', !!msg);
    if (inputEl) {
      inputEl.setAttribute('aria-invalid', msg ? 'true' : 'false');
      inputEl.closest('.input-wrap').classList.toggle('has-error', !!msg);
    }
  }

  function clearError(el, inputEl) {
    showError(el, inputEl, '');
  }

  /* ── Number formatting ────────────────────────────────────────── */
  function fmt(n, decimals = 2) {
    return n.toLocaleString('en-PK', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  /* ── Core calculation ─────────────────────────────────────────── */
  function compute() {
    const billRaw   = billInput.value;
    const tipRaw    = tipInput.value;
    const peopleRaw = peopleInput.value;

    const billResult   = validateBill(billRaw);
    const tipResult    = validateTip(tipRaw);
    const peopleResult = validatePeople(peopleRaw);

    // Show / clear errors
    if (billRaw !== '') {
      if (billResult && billResult.error) showError(billError, billInput, billResult.error);
      else clearError(billError, billInput);
    } else {
      clearError(billError, billInput);
    }

    if (tipRaw !== '') {
      if (tipResult && tipResult.error) showError(tipError, tipInput, tipResult.error);
      else clearError(tipError, tipInput);
    } else {
      clearError(tipError, tipInput);
    }

    if (peopleRaw !== '') {
      if (peopleResult && peopleResult.error) showError(peopleError, peopleInput, peopleResult.error);
      else clearError(peopleError, peopleInput);
    } else {
      clearError(peopleError, peopleInput);
    }

    // Need valid bill + at least tip ≥ 0 + people ≥ 1 to show output
    const hasValidBill   = billResult   && billResult.value   !== undefined;
    const hasValidTip    = tipResult    && tipResult.value    !== undefined;
    const hasValidPeople = peopleResult && peopleResult.value !== undefined;

    if (!hasValidBill || !hasValidTip || !hasValidPeople) {
      resetOutputs();
      return;
    }

    const bill   = billResult.value;
    const tipPct = tipResult.value;
    const people = peopleResult.value;

    const tipAmt   = bill * (tipPct / 100);
    const grandTotal = bill + tipAmt;

    // Rounding policy: ceil each person's share to 2 decimal places.
    // The last person pays slightly less to absorb the rounding remainder.
    const rawPerPerson = grandTotal / people;
    const ceiledPer    = Math.ceil(rawPerPerson * 100) / 100;
    const remainder    = parseFloat(((ceiledPer * people) - grandTotal).toFixed(2));

    // Last person pays less by the remainder
    const lastPerson = parseFloat((ceiledPer - remainder).toFixed(2));

    updateValue(outTip,       `Rs ${fmt(tipAmt)}`);
    updateValue(outTotal,     `Rs ${fmt(grandTotal)}`);
    updateValue(outPerPerson, `Rs ${fmt(ceiledPer)}`);

    // Rounding note
    if (remainder > 0 && people > 1) {
      roundingNote.textContent =
        `Person ${people} pays Rs ${fmt(lastPerson)} (Rs ${fmt(remainder)} less due to rounding)`;
    } else {
      roundingNote.textContent = '';
    }

    // Split breakdown for > 1 people
    renderSplitBreakdown(people, ceiledPer, lastPerson, remainder);
  }

  function updateValue(el, newText) {
    if (el.textContent === newText) return;
    el.textContent = newText;
    el.classList.remove('updated');
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add('updated');
    // Clean up class after animation
    el.addEventListener('animationend', () => el.classList.remove('updated'), { once: true });
  }

  function resetOutputs() {
    outTip.textContent       = 'Rs —';
    outTotal.textContent     = 'Rs —';
    outPerPerson.textContent = 'Rs —';
    roundingNote.textContent = '';
    splitBreakdown.classList.remove('visible');
    splitBreakdown.innerHTML = '';
  }

  /* ── Split breakdown list ─────────────────────────────────────── */
  function renderSplitBreakdown(people, ceiledPer, lastPerson, remainder) {
    if (people <= 1) {
      splitBreakdown.classList.remove('visible');
      splitBreakdown.innerHTML = '';
      return;
    }

    const MAX_SHOW = 20;
    const html = [`<div class="split-breakdown-header">Per-person breakdown</div>`];

    for (let i = 1; i <= Math.min(people, MAX_SHOW); i++) {
      const isLast    = i === people && remainder > 0;
      const amount    = isLast ? lastPerson : ceiledPer;
      const diffHtml  = isLast
        ? `<span class="split-item-diff">−Rs ${fmt(remainder)}</span>`
        : '';

      html.push(`
        <div class="split-item" role="listitem">
          <span class="split-item-person">Person ${i}</span>
          <span>
            <span class="split-item-amt">Rs ${fmt(amount)}</span>
            ${diffHtml}
          </span>
        </div>
      `);
    }

    if (people > MAX_SHOW) {
      html.push(`
        <div class="split-item" style="color:var(--text-faint);font-size:0.65rem;">
          … and ${people - MAX_SHOW} more people, each Rs ${fmt(ceiledPer)}
        </div>
      `);
    }

    splitBreakdown.innerHTML = html.join('');
    splitBreakdown.classList.add('visible');
  }

  /* ── Preset buttons ───────────────────────────────────────────── */
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseFloat(btn.dataset.tip);
      const wasActive = activePreset === val;

      // Deactivate all
      presetBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });

      if (wasActive) {
        // Toggle off
        activePreset = null;
        tipInput.value = '';
      } else {
        activePreset = val;
        tipInput.value = val;
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      }

      clearError(tipError, tipInput);
      compute();
    });
  });

  /* Typing in custom tip clears active preset */
  tipInput.addEventListener('input', () => {
    activePreset = null;
    presetBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    compute();
  });

  /* ── Stepper buttons ──────────────────────────────────────────── */
  decrementBtn.addEventListener('click', () => {
    const cur = parseInt(peopleInput.value, 10) || 1;
    if (cur > 1) {
      peopleInput.value = cur - 1;
      compute();
    }
    decrementBtn.disabled = (parseInt(peopleInput.value, 10) <= 1);
  });

  incrementBtn.addEventListener('click', () => {
    const cur = parseInt(peopleInput.value, 10) || 0;
    if (cur < MAX_PEOPLE) {
      peopleInput.value = cur + 1;
      compute();
    }
    decrementBtn.disabled = false;
  });

  /* Disable decrement at 1 */
  function syncStepperState() {
    const v = parseInt(peopleInput.value, 10);
    decrementBtn.disabled = (!v || v <= 1);
  }

  /* ── Live input listeners ─────────────────────────────────────── */
  billInput.addEventListener('input', compute);
  peopleInput.addEventListener('input', () => {
    syncStepperState();
    compute();
  });

  /* Catch paste + programmatic changes */
  [billInput, tipInput, peopleInput].forEach(el => {
    el.addEventListener('paste', () => setTimeout(compute, 0));
    el.addEventListener('change', compute);
  });

  /* ── Reset ────────────────────────────────────────────────────── */
  resetBtn.addEventListener('click', () => {
    billInput.value   = '';
    tipInput.value    = '';
    peopleInput.value = '1';

    activePreset = null;
    presetBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });

    [billInput, tipInput, peopleInput].forEach(inp => {
      clearError(
        document.getElementById(inp.id === 'tip-custom' ? 'tip-error' :
          inp.id === 'bill' ? 'bill-error' : 'people-error'),
        inp
      );
    });

    resetOutputs();
    syncStepperState();
    billInput.focus();
  });

  /* ── Enter key: move focus forward naturally ──────────────────── */
  [billInput, tipInput, peopleInput].forEach((el, i, arr) => {
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const next = arr[i + 1];
        if (next) next.focus();
      }
    });
  });

  /* ── Init ─────────────────────────────────────────────────────── */
  syncStepperState();
  compute();

})();