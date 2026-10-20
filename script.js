/* ==========================================================================
   NutriTrack – script.js
   Plain vanilla JavaScript. No libraries, no backend, no API keys.

   Sections:
     1. Constants and sample data
     2. Date helpers
     3. State and localStorage
     4. DOM references
     5. Utilities (formatting, element builder, toasts, confirm dialog)
     6. Rendering (dashboard, log, weekly chart)
     7. Form handling (validate, add, edit, delete)
     8. Other actions (target, dates, filters, clear day, reset demo)
     9. Event listeners and start-up
   ========================================================================== */
(function () {
  'use strict';

  /* ======================================================================
     1. CONSTANTS AND SAMPLE DATA
     ====================================================================== */
  var STORAGE_KEY = 'nutritrack.v1';
  var MEALS = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
  var MEAL_ICONS = { Breakfast: '🌅', Lunch: '🍛', Snack: '🍎', Dinner: '🌙' };

  var DEFAULT_TARGET = 2000;
  var TARGET_MIN = 1000;
  var TARGET_MAX = 5000;
  var MAX_NAME_LENGTH = 60;
  var QTY_MIN = 0.25;
  var QTY_MAX = 100;
  var CAL_MIN = 0;
  var CAL_MAX = 5000;

  // Circumference of the progress ring (radius 52 in the SVG)
  var RING_CIRCUMFERENCE = 2 * Math.PI * 52;

  // Sections that the navigation links point to
  var NAV_SECTIONS = ['dashboard', 'add', 'log', 'weekly', 'settings'];

  // Approximate calories per serving. These are estimates, not exact values.
  var SAMPLE_FOODS = [
    { id: 'rice',    name: 'Cooked rice',             serving: '1 cup (about 160 g)',    calories: 205 },
    { id: 'idli',    name: 'Idli',                    serving: '1 piece (medium)',       calories: 58 },
    { id: 'dosa',    name: 'Plain dosa',              serving: '1 medium dosa',          calories: 135 },
    { id: 'chapati', name: 'Chapati (roti)',          serving: '1 medium piece',         calories: 104 },
    { id: 'egg',     name: 'Boiled egg',              serving: '1 large egg',            calories: 78 },
    { id: 'banana',  name: 'Banana',                  serving: '1 medium banana',        calories: 105 },
    { id: 'apple',   name: 'Apple',                   serving: '1 medium apple',         calories: 95 },
    { id: 'milk',    name: 'Milk (whole)',            serving: '1 glass (240 ml)',       calories: 149 },
    { id: 'oats',    name: 'Oats porridge (cooked)',  serving: '1 cup (about 240 g)',    calories: 165 },
    { id: 'chicken', name: 'Chicken breast (cooked)', serving: '100 g',                  calories: 165 },
    { id: 'salad',   name: 'Vegetable salad',         serving: '1 bowl (no dressing)',   calories: 50 }
  ];

  // Demo week used on first run and by "Reset demo data".
  // Index 0 = today, 1 = yesterday, and so on. Each item: [food id, servings, meal]
  var DEMO_DAYS = [
    [['idli', 3, 'Breakfast'], ['milk', 1, 'Breakfast'], ['rice', 1.5, 'Lunch'], ['chicken', 1.5, 'Lunch'], ['salad', 1, 'Lunch'], ['apple', 1, 'Snack']],
    [['dosa', 2, 'Breakfast'], ['egg', 1, 'Breakfast'], ['rice', 2, 'Lunch'], ['chicken', 1.5, 'Lunch'], ['salad', 1, 'Lunch'], ['banana', 1, 'Snack'], ['milk', 1, 'Snack'], ['chapati', 3, 'Dinner'], ['egg', 2, 'Dinner'], ['salad', 1, 'Dinner']],
    [['oats', 1.5, 'Breakfast'], ['banana', 1, 'Breakfast'], ['rice', 2, 'Lunch'], ['chicken', 2, 'Lunch'], ['salad', 1, 'Lunch'], ['apple', 1, 'Snack'], ['chapati', 4, 'Dinner'], ['egg', 2, 'Dinner']],
    [['idli', 4, 'Breakfast'], ['milk', 1, 'Breakfast'], ['rice', 2.5, 'Lunch'], ['egg', 2, 'Lunch'], ['salad', 1, 'Lunch'], ['banana', 1, 'Snack'], ['apple', 1, 'Snack'], ['dosa', 3, 'Dinner'], ['chicken', 1, 'Dinner']],
    [['dosa', 2, 'Breakfast'], ['milk', 1, 'Breakfast'], ['rice', 3, 'Lunch'], ['chicken', 2, 'Lunch'], ['salad', 1, 'Lunch'], ['banana', 2, 'Snack'], ['milk', 1, 'Snack'], ['chapati', 4, 'Dinner'], ['egg', 3, 'Dinner'], ['apple', 1, 'Dinner']],
    [['oats', 1, 'Breakfast'], ['banana', 1, 'Breakfast'], ['egg', 1, 'Breakfast'], ['rice', 1.5, 'Lunch'], ['chicken', 1.5, 'Lunch'], ['salad', 1, 'Lunch'], ['apple', 1, 'Snack'], ['idli', 5, 'Dinner'], ['salad', 1, 'Dinner']],
    [['idli', 3, 'Breakfast'], ['egg', 2, 'Breakfast'], ['rice', 2, 'Lunch'], ['chicken', 1, 'Lunch'], ['salad', 1, 'Lunch'], ['milk', 1, 'Snack'], ['banana', 1, 'Snack'], ['chapati', 3, 'Dinner'], ['egg', 2, 'Dinner']]
  ];

  /* ======================================================================
     2. DATE HELPERS
     Dates are stored as local calendar keys like "2026-10-20".
     We never use toISOString() because it converts to UTC and can shift the day.
     ====================================================================== */
  function pad(n) { return String(n).padStart(2, '0'); }

  function toDateKey(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function fromDateKey(key) {
    var parts = key.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function isValidDateKey(key) {
    if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    return toDateKey(fromDateKey(key)) === key; // rejects things like 2026-02-31
  }

  function todayKey() { return toDateKey(new Date()); }

  function addDays(key, n) {
    var d = fromDateKey(key);
    d.setDate(d.getDate() + n);
    return toDateKey(d);
  }

  // Monday of the week that contains the given date
  function startOfWeekKey(key) {
    var d = fromDateKey(key);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return toDateKey(d);
  }

  /* ======================================================================
     3. STATE AND LOCAL STORAGE
     entries is an object keyed by date: { "2026-10-20": [entry, entry, ...] }
     entry = { id, name, meal, quantity, calories (per serving), serving }
     ====================================================================== */
  var state = {
    target: DEFAULT_TARGET,
    entries: {},
    selectedDate: todayKey(),
    filter: 'All',
    editingId: null,
    formServing: '' // serving description of the chosen sample food
  };

  var lastKnownToday = todayKey();

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function makeEntryFromSample(foodId, quantity, meal) {
    var food = SAMPLE_FOODS.find(function (f) { return f.id === foodId; });
    return { id: newId(), name: food.name, meal: meal, quantity: quantity, calories: food.calories, serving: food.serving };
  }

  function buildDemoEntries() {
    var today = todayKey();
    var result = {};
    DEMO_DAYS.forEach(function (items, offset) {
      result[addDays(today, -offset)] = items.map(function (item) {
        return makeEntryFromSample(item[0], item[1], item[2]);
      });
    });
    return result;
  }

  // Validate one entry read from storage (protects against corrupted data)
  function sanitizeEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var name = typeof raw.name === 'string' ? raw.name.trim().slice(0, MAX_NAME_LENGTH) : '';
    var quantity = Number(raw.quantity);
    var calories = Number(raw.calories);
    if (!name || MEALS.indexOf(raw.meal) === -1) return null;
    if (!isFinite(quantity) || quantity <= 0 || quantity > QTY_MAX) return null;
    if (!isFinite(calories) || calories < CAL_MIN || calories > CAL_MAX) return null;
    return {
      id: typeof raw.id === 'string' && raw.id && raw.id.length <= 40 ? raw.id : newId(),
      name: name,
      meal: raw.meal,
      quantity: quantity,
      calories: calories,
      serving: typeof raw.serving === 'string' ? raw.serving.slice(0, 40) : ''
    };
  }

  function sanitizeData(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var target = Number(raw.target);
    if (!isFinite(target) || target < TARGET_MIN || target > TARGET_MAX) target = DEFAULT_TARGET;
    var entries = {};
    var source = raw.entries && typeof raw.entries === 'object' ? raw.entries : {};
    Object.keys(source).forEach(function (key) {
      if (!isValidDateKey(key) || !Array.isArray(source[key])) return;
      var clean = source[key].map(sanitizeEntry).filter(Boolean);
      if (clean.length) entries[key] = clean;
    });
    return { target: Math.round(target), entries: entries };
  }

  // Returns saved data, or null when nothing is saved (or it cannot be read)
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      return sanitizeData(JSON.parse(raw));
    } catch (err) {
      return null;
    }
  }

  function persist() {
    var ok = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, target: state.target, entries: state.entries }));
    } catch (err) {
      ok = false; // private mode, storage full or blocked
    }
    dom.storageWarning.hidden = ok;
    return ok;
  }

  function getEntries(key) { return state.entries[key] || []; }
  function entryTotal(entry) { return Math.round(entry.quantity * entry.calories); }
  function dayTotal(key) {
    return getEntries(key).reduce(function (sum, e) { return sum + entryTotal(e); }, 0);
  }
  function sortedEntries(key) {
    // Breakfast, Lunch, Snack, Dinner. Array.sort is stable, so insertion order is kept inside a meal.
    return getEntries(key).slice().sort(function (a, b) { return MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal); });
  }

  /* ======================================================================
     4. DOM REFERENCES
     ====================================================================== */
  function $(id) { return document.getElementById(id); }

  var dom = {
    addSection: $('add'),
    greeting: $('greeting'),
    pageTitle: $('pageTitle'),
    selectedDateLabel: $('selectedDateLabel'),
    prevDayBtn: $('prevDayBtn'),
    nextDayBtn: $('nextDayBtn'),
    todayBtn: $('todayBtn'),
    dateInput: $('dateInput'),
    storageWarning: $('storageWarning'),

    heroCard: $('heroCard'),
    ringWrap: $('ringWrap'),
    ringProgress: $('ringProgress'),
    progressPercent: $('progressPercent'),
    intakeLabel: $('intakeLabel'),
    totalCalories: $('totalCalories'),
    targetDisplay: $('targetDisplay'),
    statusMessage: $('statusMessage'),
    targetForm: $('targetForm'),
    targetInput: $('targetInput'),
    targetError: $('targetError'),
    mealBreakdown: $('mealBreakdown'),
    remainingLabel: $('remainingLabel'),
    remainingValue: $('remainingValue'),
    entryCount: $('entryCount'),
    averageCalories: $('averageCalories'),

    formTitle: $('formTitle'),
    formDateLabel: $('formDateLabel'),
    editBadge: $('editBadge'),
    foodForm: $('foodForm'),
    foodPreset: $('foodPreset'),
    presetHint: $('presetHint'),
    foodName: $('foodName'),
    foodNameError: $('foodNameError'),
    mealCategory: $('mealCategory'),
    quantity: $('quantity'),
    quantityError: $('quantityError'),
    caloriesPerServing: $('caloriesPerServing'),
    caloriesError: $('caloriesError'),
    formTotal: $('formTotal'),
    submitBtn: $('submitBtn'),
    clearFormBtn: $('clearFormBtn'),
    cancelEditBtn: $('cancelEditBtn'),

    logHeading: $('logHeading'),
    logSubtitle: $('logSubtitle'),
    clearDayBtn: $('clearDayBtn'),
    mealFilters: $('mealFilters'),
    emptyState: $('emptyState'),
    emptyTitle: $('emptyTitle'),
    emptyText: $('emptyText'),
    emptyActionBtn: $('emptyActionBtn'),
    tableWrap: $('tableWrap'),
    logBody: $('logBody'),
    logSummary: $('logSummary'),

    weekRange: $('weekRange'),
    weekTotal: $('weekTotal'),
    weekAverage: $('weekAverage'),
    weekOnTarget: $('weekOnTarget'),
    chartCols: $('chartCols'),
    targetLine: $('targetLine'),
    targetLabel: $('targetLabel'),

    resetDemoBtn: $('resetDemoBtn'),
    toastRegion: $('toastRegion'),
    confirmDialog: $('confirmDialog'),
    confirmTitle: $('confirmTitle'),
    confirmMessage: $('confirmMessage'),
    confirmOkBtn: $('confirmOkBtn')
  };

  // Which input and error element belong to each validated form field
  var FIELDS = {
    name:     { input: dom.foodName,           error: dom.foodNameError },
    quantity: { input: dom.quantity,           error: dom.quantityError },
    calories: { input: dom.caloriesPerServing, error: dom.caloriesError }
  };

  /* ======================================================================
     5. UTILITIES
     ====================================================================== */
  var numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  function fmt(n) { return numberFormat.format(Math.round(n)); }
  function fmtQty(q) { return String(Math.round(q * 100) / 100); }

  function formatLong(key) {
    return fromDateKey(key).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function formatShort(key) {
    return fromDateKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function relativeLabel(key) {
    var t = todayKey();
    if (key === t) return 'Today';
    if (key === addDays(t, -1)) return 'Yesterday';
    if (key === addDays(t, 1)) return 'Tomorrow';
    return formatShort(key);
  }
  function timeGreeting() {
    var h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }
  function defaultMealForNow() {
    var h = new Date().getHours();
    if (h < 11) return 'Breakfast';
    if (h < 15) return 'Lunch';
    if (h < 18) return 'Snack';
    return 'Dinner';
  }

  /*
   * Safe element builder. All text is added with textContent / text nodes,
   * never innerHTML, so user input can never be interpreted as HTML.
   */
  function el(tag, props, children) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      else node.setAttribute(k, v === true ? '' : v);
    });
    [].concat(children || []).forEach(function (child) {
      if (child !== null && child !== undefined) node.append(child);
    });
    return node;
  }

  /* ---- Toast messages ---- */
  function showToast(message, options) {
    var opts = options || {};
    var type = opts.type || 'success';
    var icon = type === 'error' ? '⚠️' : (type === 'info' ? 'ℹ️' : '✅');
    var toast = el('div', { class: 'toast toast-' + type }, [
      el('span', { 'aria-hidden': 'true', text: icon }),
      el('span', { class: 'toast-msg', text: message })
    ]);
    var timer = null;

    function dismiss() {
      clearTimeout(timer);
      toast.classList.add('is-leaving');
      setTimeout(function () { toast.remove(); }, 220);
    }

    if (opts.actionLabel && typeof opts.onAction === 'function') {
      var actionBtn = el('button', { type: 'button', class: 'toast-action', text: opts.actionLabel });
      actionBtn.addEventListener('click', function () { opts.onAction(); dismiss(); });
      toast.append(actionBtn);
    }
    var closeBtn = el('button', { type: 'button', class: 'toast-close', 'aria-label': 'Dismiss message', text: '×' });
    closeBtn.addEventListener('click', dismiss);
    toast.append(closeBtn);

    dom.toastRegion.append(toast);
    while (dom.toastRegion.children.length > 3) dom.toastRegion.firstElementChild.remove();
    timer = setTimeout(dismiss, opts.duration || 3800);
  }

  /* ---- Confirmation dialog (returns a Promise<boolean>) ---- */
  function confirmAction(config) {
    return new Promise(function (resolve) {
      var dialog = dom.confirmDialog;

      // Very old browsers without <dialog>: fall back to the built-in confirm box
      if (typeof dialog.showModal !== 'function') {
        resolve(window.confirm(config.message));
        return;
      }

      dom.confirmTitle.textContent = config.title;
      dom.confirmMessage.textContent = config.message;
      dom.confirmOkBtn.textContent = config.confirmLabel || 'Confirm';
      dialog.returnValue = '';

      function onClose() {
        dialog.removeEventListener('close', onClose);
        resolve(dialog.returnValue === 'confirm');
      }
      dialog.addEventListener('close', onClose);
      dialog.showModal();
    });
  }

  /* ======================================================================
     6. RENDERING
     ====================================================================== */
  function renderAll() {
    renderHeader();
    renderDashboard();
    renderFormContext();
    renderFilters();
    renderLog();
    renderWeek();
  }

  function renderHeader() {
    var key = state.selectedDate;
    var today = todayKey();
    var isToday = key === today;

    dom.greeting.textContent = isToday ? timeGreeting() + ' 👋' : 'Daily log';
    dom.pageTitle.textContent = isToday ? "Today's overview" : 'Daily overview';
    var note = isToday ? '' : (key < today ? ' · Viewing a previous day' : ' · Viewing an upcoming day');
    dom.selectedDateLabel.textContent = formatLong(key) + note;

    if (dom.dateInput.value !== key) dom.dateInput.value = key;
    dom.todayBtn.disabled = isToday;
  }

  function renderDashboard() {
    var key = state.selectedDate;
    var list = getEntries(key);
    var total = dayTotal(key);
    var target = state.target;
    var pct = target > 0 ? (total / target) * 100 : 0;
    var remaining = target - total;
    var isToday = key === todayKey();

    dom.intakeLabel.textContent = isToday ? "Today's intake" : 'Intake on ' + formatShort(key);
    dom.totalCalories.textContent = fmt(total);
    dom.targetDisplay.textContent = fmt(target);
    dom.progressPercent.textContent = Math.round(pct) + '%';
    dom.ringWrap.setAttribute('aria-label', Math.round(pct) + ' percent of the daily target used');
    dom.ringProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - Math.min(pct, 100) / 100));
    dom.heroCard.classList.toggle('is-over', total > target);

    dom.remainingLabel.textContent = remaining >= 0 ? 'Remaining' : 'Over target by';
    dom.remainingValue.textContent = fmt(Math.abs(remaining));
    dom.entryCount.textContent = String(list.length);
    dom.averageCalories.textContent = list.length ? fmt(total / list.length) : '0';

    // Friendly status line
    var message;
    if (list.length === 0) message = 'No food logged for this day yet.';
    else if (pct < 50) message = 'Well under the target.';
    else if (pct < 90) message = 'On track with the daily target.';
    else if (pct <= 100) message = 'Right around the target.';
    else message = 'Over the target by ' + fmt(total - target) + ' kcal.';
    dom.statusMessage.textContent = message;

    // Do not overwrite the target box while the user is typing in it
    if (document.activeElement !== dom.targetInput) dom.targetInput.value = String(target);

    // Calories by meal
    var rows = MEALS.map(function (meal) {
      var mealTotal = list.reduce(function (sum, e) { return e.meal === meal ? sum + entryTotal(e) : sum; }, 0);
      var share = total > 0 ? (mealTotal / total) * 100 : 0;
      var bar = el('span');
      bar.style.width = share + '%';
      return el('li', { class: 'meal-row' }, [
        el('span', { text: MEAL_ICONS[meal] + ' ' + meal }),
        el('span', { class: 'meal-kcal', text: fmt(mealTotal) + ' kcal' }),
        el('span', { class: 'meal-bar', 'aria-hidden': 'true' }, bar)
      ]);
    });
    dom.mealBreakdown.replaceChildren.apply(dom.mealBreakdown, rows);
  }

  function renderFormContext() {
    var key = state.selectedDate;
    var rel = relativeLabel(key);
    var short = formatShort(key);
    dom.formDateLabel.textContent = rel === short ? short : rel + ' (' + short + ')';
  }

  function renderFilters() {
    var list = getEntries(state.selectedDate);
    document.querySelectorAll('[data-count]').forEach(function (badge) {
      var meal = badge.getAttribute('data-count');
      badge.textContent = String(meal === 'All' ? list.length : list.filter(function (e) { return e.meal === meal; }).length);
    });
    document.querySelectorAll('[data-filter]').forEach(function (chip) {
      var active = chip.getAttribute('data-filter') === state.filter;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function buildRow(entry) {
    var total = entryTotal(entry);
    var qtyText = fmtQty(entry.quantity) + (entry.quantity === 1 ? ' serving' : ' servings');

    var editBtn = el('button', {
      type: 'button', class: 'btn btn-soft btn-sm', text: 'Edit',
      'aria-label': 'Edit ' + entry.name, dataset: { action: 'edit', id: entry.id }
    });
    var deleteBtn = el('button', {
      type: 'button', class: 'btn btn-danger-soft btn-sm', text: 'Delete',
      'aria-label': 'Delete ' + entry.name, dataset: { action: 'delete', id: entry.id }
    });

    return el('tr', { role: 'row', class: entry.id === state.editingId ? 'is-editing' : '' }, [
      el('td', { role: 'cell', class: 'cell-food', dataset: { label: 'Food' } }, [
        el('span', { class: 'food-name', text: entry.name }),
        el('span', { class: 'food-sub', text: fmt(entry.calories) + ' kcal per ' + (entry.serving || 'serving') })
      ]),
      el('td', { role: 'cell', dataset: { label: 'Quantity' }, text: qtyText }),
      el('td', { role: 'cell', dataset: { label: 'Meal' } },
        el('span', { class: 'meal-badge', dataset: { meal: entry.meal }, text: MEAL_ICONS[entry.meal] + ' ' + entry.meal })),
      el('td', { role: 'cell', class: 'cell-cal', dataset: { label: 'Calories' } },
        [el('strong', { text: fmt(total) }), ' kcal']),
      el('td', { role: 'cell', class: 'cell-actions' }, [editBtn, deleteBtn])
    ]);
  }

  function renderLog() {
    var key = state.selectedDate;
    var all = sortedEntries(key);
    var visible = state.filter === 'All' ? all : all.filter(function (e) { return e.meal === state.filter; });

    dom.logSubtitle.textContent = formatLong(key);
    dom.clearDayBtn.disabled = all.length === 0;

    if (all.length === 0) {
      dom.emptyTitle.textContent = 'Nothing logged yet';
      dom.emptyText.textContent = 'Add your first meal and your calories will start adding up.';
      dom.emptyActionBtn.textContent = 'Add food';
      dom.emptyActionBtn.dataset.mode = 'add';
    } else if (visible.length === 0) {
      dom.emptyTitle.textContent = 'No ' + state.filter.toLowerCase() + ' entries';
      dom.emptyText.textContent = 'Nothing is logged for ' + state.filter.toLowerCase() + ' on this day.';
      dom.emptyActionBtn.textContent = 'Show all meals';
      dom.emptyActionBtn.dataset.mode = 'filter';
    }

    dom.emptyState.hidden = visible.length > 0;
    dom.tableWrap.hidden = visible.length === 0;

    var rows = visible.map(buildRow);
    dom.logBody.replaceChildren.apply(dom.logBody, rows);

    if (visible.length > 0) {
      var visibleTotal = visible.reduce(function (sum, e) { return sum + entryTotal(e); }, 0);
      dom.logSummary.textContent = 'Showing ' + visible.length + ' of ' + all.length +
        (all.length === 1 ? ' entry' : ' entries') + ' · ' + fmt(visibleTotal) + ' kcal';
    } else {
      dom.logSummary.textContent = '';
    }
  }

  // Weekly chart: Monday to Sunday of the week that contains the selected date
  function renderWeek() {
    var selected = state.selectedDate;
    var start = startOfWeekKey(selected);
    var days = [];
    for (var i = 0; i < 7; i++) days.push(addDays(start, i));
    var totals = days.map(dayTotal);
    var target = state.target;

    var weekSum = totals.reduce(function (a, b) { return a + b; }, 0);
    var daysLogged = totals.filter(function (t) { return t > 0; }).length;
    var daysOnTarget = totals.filter(function (t) { return t > 0 && t <= target; }).length;

    dom.weekRange.textContent = formatShort(days[0]) + ' – ' + formatShort(days[6]);
    dom.weekTotal.textContent = fmt(weekSum);
    dom.weekAverage.textContent = daysLogged ? fmt(weekSum / daysLogged) : '0';
    dom.weekOnTarget.textContent = daysLogged ? daysOnTarget + ' of ' + daysLogged : '–';

    // Scale so the tallest bar (or the target line) leaves headroom for its value label
    var scaleMax = Math.max(target, Math.max.apply(null, totals)) * 1.15;
    dom.targetLine.style.setProperty('--t', String(target / scaleMax));
    dom.targetLabel.textContent = 'Target ' + fmt(target);

    var cols = days.map(function (key, i) {
      var total = totals[i];
      var status = total === 0 ? 'no entries' : (total > target ? 'over target' : 'within target');
      var classes = 'col' + (total === 0 ? ' is-empty' : '') + (total > target ? ' is-over' : '') + (key === selected ? ' is-selected' : '');

      var bar = el('span', { class: 'bar', 'aria-hidden': 'true' });
      bar.style.setProperty('--f', String(total / scaleMax));
      var d = fromDateKey(key);

      return el('button', {
        type: 'button',
        class: classes,
        dataset: { date: key },
        'aria-pressed': key === selected ? 'true' : 'false',
        'aria-label': formatShort(key) + ': ' + (total ? fmt(total) + ' kilocalories, ' + status : status) + '. Select to view this day.'
      }, [
        el('span', { class: 'bar-value', 'aria-hidden': 'true', text: total ? fmt(total) : '–' }),
        bar,
        el('span', { class: 'bar-label', 'aria-hidden': 'true' }, [
          el('span', { text: d.toLocaleDateString(undefined, { weekday: 'short' }) }),
          el('b', { text: String(d.getDate()) })
        ])
      ]);
    });
    dom.chartCols.replaceChildren.apply(dom.chartCols, cols);
  }

  /* ======================================================================
     7. FORM HANDLING
     ====================================================================== */
  function populatePresets() {
    var options = [el('option', { value: '', text: 'Custom food (type your own)' })];
    SAMPLE_FOODS.forEach(function (food) {
      options.push(el('option', {
        value: food.id,
        text: food.name + ' — approx. ' + food.calories + ' kcal per ' + food.serving
      }));
    });
    dom.foodPreset.replaceChildren.apply(dom.foodPreset, options);
    setDefaultHint();
  }

  function setDefaultHint() {
    dom.presetHint.textContent = 'Pick a sample food to fill in an approximate value, or choose custom and type your own.';
  }

  function onPresetChange() {
    var food = SAMPLE_FOODS.find(function (f) { return f.id === dom.foodPreset.value; });
    if (!food) {
      state.formServing = '';
      setDefaultHint();
      return;
    }
    dom.foodName.value = food.name;
    dom.caloriesPerServing.value = String(food.calories);
    state.formServing = food.serving;
    dom.presetHint.textContent = 'Approximate value: ' + food.calories + ' kcal per ' + food.serving + '. You can change any field.';
    clearFieldError('name');
    clearFieldError('calories');
    updateFormTotal();
  }

  // When the user types their own name or calories, the sample label no longer applies
  function detachPreset() {
    if (dom.foodPreset.value === '') return;
    dom.foodPreset.value = '';
    state.formServing = '';
    setDefaultHint();
  }

  function updateFormTotal() {
    var q = parseFloat(dom.quantity.value);
    var c = parseFloat(dom.caloriesPerServing.value);
    var valid = isFinite(q) && isFinite(c) && q > 0 && c >= 0;
    dom.formTotal.textContent = (valid ? fmt(q * c) : '0') + ' kcal';
  }

  function clearFieldError(key) {
    FIELDS[key].error.textContent = '';
    FIELDS[key].input.removeAttribute('aria-invalid');
  }

  function showFieldErrors(errors) {
    var firstInvalid = null;
    Object.keys(FIELDS).forEach(function (key) {
      clearFieldError(key);
      if (errors[key]) {
        FIELDS[key].error.textContent = errors[key];
        FIELDS[key].input.setAttribute('aria-invalid', 'true');
        if (!firstInvalid) firstInvalid = FIELDS[key].input;
      }
    });
    if (firstInvalid) firstInvalid.focus();
  }

  function validateForm() {
    var errors = {};
    var name = dom.foodName.value.trim().replace(/\s+/g, ' ');
    var meal = dom.mealCategory.value;
    var qtyText = dom.quantity.value.trim();
    var calText = dom.caloriesPerServing.value.trim();
    var quantity = Number(qtyText);
    var calories = Number(calText);

    if (!name) errors.name = 'Enter a food name.';
    else if (name.length > MAX_NAME_LENGTH) errors.name = 'Use ' + MAX_NAME_LENGTH + ' characters or fewer.';
    else if (!/\p{L}/u.test(name)) errors.name = 'The name needs at least one letter.';

    if (qtyText === '' || !isFinite(quantity)) errors.quantity = 'Enter the number of servings, for example 1 or 1.5.';
    else if (quantity < QTY_MIN || quantity > QTY_MAX) errors.quantity = 'Servings must be between ' + QTY_MIN + ' and ' + QTY_MAX + '.';

    if (calText === '' || !isFinite(calories)) errors.calories = 'Enter the calories in one serving.';
    else if (calories < CAL_MIN || calories > CAL_MAX) errors.calories = 'Calories must be between ' + CAL_MIN + ' and ' + fmt(CAL_MAX) + '.';

    return {
      ok: Object.keys(errors).length === 0,
      errors: errors,
      values: {
        name: name,
        meal: MEALS.indexOf(meal) === -1 ? 'Snack' : meal,
        quantity: Math.round(quantity * 100) / 100,
        calories: Math.round(calories * 10) / 10
      }
    };
  }

  function resetFormFields() {
    dom.foodPreset.value = '';
    dom.foodName.value = '';
    dom.quantity.value = '1';
    dom.caloriesPerServing.value = '';
    state.formServing = '';
    setDefaultHint();
    Object.keys(FIELDS).forEach(clearFieldError);
    updateFormTotal();
  }

  function enterEditMode(entry) {
    state.editingId = entry.id;
    dom.foodPreset.value = '';
    dom.foodName.value = entry.name;
    dom.mealCategory.value = entry.meal;
    dom.quantity.value = String(entry.quantity);
    dom.caloriesPerServing.value = String(entry.calories);
    state.formServing = entry.serving || '';
    setDefaultHint();
    Object.keys(FIELDS).forEach(clearFieldError);
    updateFormTotal();

    dom.formTitle.textContent = 'Edit entry';
    dom.submitBtn.textContent = 'Save changes';
    dom.editBadge.hidden = false;
    dom.cancelEditBtn.hidden = false;
    dom.clearFormBtn.hidden = true;
  }

  // Leaves edit mode and empties the form (callers re-render the log afterwards)
  function exitEditMode() {
    state.editingId = null;
    dom.formTitle.textContent = 'Add food';
    dom.submitBtn.textContent = 'Add to log';
    dom.editBadge.hidden = true;
    dom.cancelEditBtn.hidden = true;
    dom.clearFormBtn.hidden = false;
    resetFormFields();
  }

  function startEdit(id) {
    var entry = getEntries(state.selectedDate).find(function (e) { return e.id === id; });
    if (!entry) return;
    enterEditMode(entry);
    renderLog();
    dom.addSection.scrollIntoView({ block: 'start' });
    dom.foodName.focus({ preventScroll: true });
  }

  function cancelEdit() {
    exitEditMode();
    renderLog();
    showToast('Edit cancelled.', { type: 'info' });
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    var result = validateForm();
    if (!result.ok) {
      showFieldErrors(result.errors);
      showToast('Please fix the highlighted fields.', { type: 'error' });
      return;
    }

    var v = result.values;
    var key = state.selectedDate;

    if (state.editingId) {
      var entry = getEntries(key).find(function (e) { return e.id === state.editingId; });
      if (!entry) {
        exitEditMode();
        renderAll();
        showToast('That entry no longer exists.', { type: 'error' });
        return;
      }
      entry.name = v.name;
      entry.meal = v.meal;
      entry.quantity = v.quantity;
      entry.calories = v.calories;
      entry.serving = state.formServing;
      exitEditMode();
      persist();
      renderAll();
      showToast('Updated “' + v.name + '”.');
    } else {
      if (!state.entries[key]) state.entries[key] = [];
      state.entries[key].push({
        id: newId(), name: v.name, meal: v.meal, quantity: v.quantity, calories: v.calories, serving: state.formServing
      });
      // Make sure the new entry is visible even if another meal filter was active
      if (state.filter !== 'All' && state.filter !== v.meal) state.filter = 'All';
      resetFormFields();
      persist();
      renderAll();
      showToast('Added “' + v.name + '” (' + fmt(v.quantity * v.calories) + ' kcal).');
    }
    dom.foodName.focus({ preventScroll: true });
  }

  function deleteEntry(id, rowIndex) {
    var key = state.selectedDate;
    var list = state.entries[key] || [];
    var index = list.findIndex(function (e) { return e.id === id; });
    if (index === -1) return;

    var removed = list.splice(index, 1)[0];
    if (list.length === 0) delete state.entries[key];
    if (state.editingId === id) exitEditMode();
    persist();
    renderAll();
    focusAfterRemoval(rowIndex);

    showToast('Deleted “' + removed.name + '”.', {
      actionLabel: 'Undo',
      duration: 6000,
      onAction: function () { restoreEntry(key, index, removed); }
    });
  }

  function restoreEntry(key, index, entry) {
    if (!state.entries[key]) state.entries[key] = [];
    var list = state.entries[key];
    list.splice(Math.min(index, list.length), 0, entry);
    persist();
    renderAll();
    showToast('Entry restored.');
  }

  // Keep keyboard focus somewhere sensible after rows disappear
  function focusAfterRemoval(rowIndex) {
    var buttons = dom.logBody.querySelectorAll('button[data-action="delete"]');
    if (buttons.length) buttons[Math.min(rowIndex, buttons.length - 1)].focus();
    else dom.logHeading.focus();
  }

  /* ======================================================================
     8. OTHER ACTIONS
     ====================================================================== */
  function handleTargetSubmit(event) {
    event.preventDefault();
    var raw = dom.targetInput.value.trim();
    var value = Number(raw);
    if (raw === '' || !isFinite(value) || value < TARGET_MIN || value > TARGET_MAX) {
      dom.targetError.textContent = 'Enter a target between ' + fmt(TARGET_MIN) + ' and ' + fmt(TARGET_MAX) + ' kcal.';
      dom.targetInput.setAttribute('aria-invalid', 'true');
      dom.targetInput.focus();
      showToast('Target not saved. Check the value.', { type: 'error' });
      return;
    }
    dom.targetError.textContent = '';
    dom.targetInput.removeAttribute('aria-invalid');
    state.target = Math.round(value);
    persist();
    renderAll();
    showToast('Daily target set to ' + fmt(state.target) + ' kcal.');
  }

  function setSelectedDate(key) {
    if (!isValidDateKey(key) || key === state.selectedDate) return;
    if (state.editingId) {
      exitEditMode();
      showToast('Edit cancelled because you changed the date.', { type: 'info' });
    }
    state.selectedDate = key;
    renderAll();
  }

  async function clearDay() {
    var key = state.selectedDate;
    var count = getEntries(key).length;
    if (!count) return;

    var ok = await confirmAction({
      title: 'Clear this day’s log?',
      message: 'This permanently deletes ' + count + (count === 1 ? ' entry' : ' entries') + ' for ' + formatLong(key) + '. This cannot be undone.',
      confirmLabel: 'Clear log'
    });
    if (!ok) return;

    delete state.entries[key];
    if (state.editingId) exitEditMode();
    persist();
    renderAll();
    dom.logHeading.focus();
    showToast('Cleared the log for ' + formatShort(key) + '.');
  }

  async function resetDemo() {
    var ok = await confirmAction({
      title: 'Reset demo data?',
      message: 'This replaces everything saved in this browser with a week of sample entries and a ' + fmt(DEFAULT_TARGET) + ' kcal target. Your current logs will be lost.',
      confirmLabel: 'Reset data'
    });
    if (!ok) return;

    state.target = DEFAULT_TARGET;
    state.entries = buildDemoEntries();
    state.filter = 'All';
    state.selectedDate = todayKey();
    exitEditMode();
    persist();
    renderAll();
    showToast('Demo data restored.');
  }

  // If the page stays open past midnight, move "today" forward
  function checkDayRollover() {
    var now = todayKey();
    if (now === lastKnownToday) return;
    var wasViewingToday = state.selectedDate === lastKnownToday;
    lastKnownToday = now;
    if (wasViewingToday) {
      if (state.editingId) exitEditMode();
      state.selectedDate = now;
    }
    renderAll();
  }

  /* ---- Highlight the current section in the navigation ---- */
  function updateActiveNav() {
    var current = NAV_SECTIONS[0];
    NAV_SECTIONS.forEach(function (id) {
      var section = $(id);
      if (section && section.getBoundingClientRect().top <= window.innerHeight * 0.35) current = id;
    });
    var root = document.documentElement;
    if (root.scrollHeight > window.innerHeight + 8 && window.innerHeight + window.scrollY >= root.scrollHeight - 4) {
      current = NAV_SECTIONS[NAV_SECTIONS.length - 1];
    }
    document.querySelectorAll('[data-nav]').forEach(function (link) {
      if (link.getAttribute('href') === '#' + current) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  /* ======================================================================
     9. EVENT LISTENERS AND START-UP
     ====================================================================== */
  function bindEvents() {
    // Date selector
    dom.prevDayBtn.addEventListener('click', function () { setSelectedDate(addDays(state.selectedDate, -1)); });
    dom.nextDayBtn.addEventListener('click', function () { setSelectedDate(addDays(state.selectedDate, 1)); });
    dom.todayBtn.addEventListener('click', function () { setSelectedDate(todayKey()); });
    dom.dateInput.addEventListener('change', function () {
      // Ignore half-typed or out-of-range dates; they are fixed on blur below
      if (dom.dateInput.validity.valid && isValidDateKey(dom.dateInput.value)) setSelectedDate(dom.dateInput.value);
    });
    dom.dateInput.addEventListener('blur', function () {
      if (!dom.dateInput.validity.valid || !isValidDateKey(dom.dateInput.value)) dom.dateInput.value = state.selectedDate;
    });

    // Target form
    dom.targetForm.addEventListener('submit', handleTargetSubmit);
    dom.targetInput.addEventListener('input', function () {
      dom.targetError.textContent = '';
      dom.targetInput.removeAttribute('aria-invalid');
    });

    // Add / edit form
    dom.foodForm.addEventListener('submit', handleFormSubmit);
    dom.foodPreset.addEventListener('change', onPresetChange);
    dom.foodName.addEventListener('input', function () { clearFieldError('name'); detachPreset(); });
    dom.quantity.addEventListener('input', function () { clearFieldError('quantity'); updateFormTotal(); });
    dom.caloriesPerServing.addEventListener('input', function () { clearFieldError('calories'); updateFormTotal(); detachPreset(); });
    dom.clearFormBtn.addEventListener('click', function () { resetFormFields(); dom.foodName.focus(); });
    dom.cancelEditBtn.addEventListener('click', cancelEdit);
    dom.foodForm.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.editingId) cancelEdit();
    });

    // Log: meal filter, row buttons, clear day, empty-state button
    dom.mealFilters.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-filter]');
      if (!chip) return;
      state.filter = chip.getAttribute('data-filter');
      renderFilters();
      renderLog();
    });
    dom.logBody.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-action]');
      if (!btn) return;
      var row = btn.closest('tr');
      var rowIndex = Array.prototype.indexOf.call(dom.logBody.children, row);
      if (btn.dataset.action === 'edit') startEdit(btn.dataset.id);
      else if (btn.dataset.action === 'delete') deleteEntry(btn.dataset.id, rowIndex);
    });
    dom.clearDayBtn.addEventListener('click', clearDay);
    dom.emptyActionBtn.addEventListener('click', function () {
      if (dom.emptyActionBtn.dataset.mode === 'filter') {
        state.filter = 'All';
        renderFilters();
        renderLog();
      } else {
        dom.addSection.scrollIntoView({ block: 'start' });
        dom.foodName.focus({ preventScroll: true });
      }
    });

    // Weekly chart: clicking a bar opens that day
    dom.chartCols.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-date]');
      if (!btn) return;
      var key = btn.dataset.date;
      if (key !== state.selectedDate) {
        setSelectedDate(key);
        showToast('Now viewing ' + formatLong(key) + '.', { type: 'info' });
      }
      var again = dom.chartCols.querySelector('[data-date="' + key + '"]');
      if (again) again.focus(); // the chart was re-rendered, so restore keyboard focus
    });

    // Data
    dom.resetDemoBtn.addEventListener('click', resetDemo);

    // Confirmation dialog: clicking the dark backdrop cancels
    dom.confirmDialog.addEventListener('click', function (e) {
      if (e.target === dom.confirmDialog) dom.confirmDialog.close('cancel');
    });

    // Navigation highlight and midnight rollover
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { updateActiveNav(); ticking = false; });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) checkDayRollover(); });
    setInterval(checkDayRollover, 60000);
  }

  function init() {
    populatePresets();

    var saved = loadState();
    if (saved) {
      state.target = saved.target;
      state.entries = saved.entries;
    } else {
      // First visit (or unreadable data): start with demo data so the app looks alive
      state.target = DEFAULT_TARGET;
      state.entries = buildDemoEntries();
    }
    persist();

    state.selectedDate = todayKey();
    dom.mealCategory.value = defaultMealForNow();
    updateFormTotal();

    bindEvents();
    renderAll();
    updateActiveNav();
  }

  init();
})();
