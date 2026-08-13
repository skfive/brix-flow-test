const STORAGE_KEY = 'habit-tracker:v1:habits';
const MAX_HABITS = 8;
const WEEKDAY_LABELS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
const WEEKDAY_ABBR = ['월', '화', '수', '목', '금', '토', '일'];

export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekDates(referenceDate = new Date()) {
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const diffToMonday = (ref.getDay() + 6) % 7;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - diffToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatDate(d);
  });
}

export function weeklyRate(habit, weekDates) {
  if (!Array.isArray(weekDates) || weekDates.length !== 7) {
    throw new Error('weekDates must contain exactly 7 dates');
  }
  const checks = (habit && habit.checks) || {};
  const checkedCount = weekDates.reduce(
    (count, date) => count + (checks[date] === true ? 1 : 0),
    0
  );
  return checkedCount / 7;
}

export function validateHabitName(name, existingNames) {
  const trimmed = name.trim();
  if (trimmed === '') {
    return { valid: false, error: '습관 이름을 입력하세요' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: '습관 이름은 20자 이내로 입력하세요' };
  }
  if (existingNames.includes(trimmed)) {
    return { valid: false, error: '이미 등록된 습관입니다' };
  }
  return { valid: true, error: null };
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `habit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadHabits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.habits)) return [];
    return parsed.habits.map((habit) => ({ ...habit, checks: habit.checks || {} }));
  } catch {
    return [];
  }
}

function saveHabits(habits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ habits }));
}

// 브라우저 환경(file:// 포함)에서만 실행 — node --test 에는 `document`가 없어 스킵된다.
if (typeof document !== 'undefined') {
  initApp();
}

function initApp() {
  const root = document.getElementById('habit-tracker-root');
  const form = document.getElementById('habit-form');
  const input = document.getElementById('habit-name-input');
  const addButton = document.getElementById('habit-add-button');
  const errorMessage = document.getElementById('habit-error-message');
  const weeklySummary = document.getElementById('weekly-summary');
  const habitGrid = document.getElementById('habit-grid');

  let habits = loadHabits();

  function setError(message) {
    errorMessage.textContent = message || '';
  }

  function createHeaderRow(weekDates) {
    const headerRow = document.createElement('div');
    headerRow.className = 'habit-grid-header';
    headerRow.appendChild(document.createElement('span'));
    weekDates.forEach((_, index) => {
      const cell = document.createElement('span');
      cell.className = 'habit-grid-header-cell';
      const full = document.createElement('span');
      full.className = 'day-full';
      full.textContent = WEEKDAY_LABELS[index];
      const abbr = document.createElement('span');
      abbr.className = 'day-abbr';
      abbr.textContent = WEEKDAY_ABBR[index];
      cell.append(full, abbr);
      headerRow.appendChild(cell);
    });
    headerRow.appendChild(document.createElement('span'));
    headerRow.appendChild(document.createElement('span'));
    return headerRow;
  }

  function createHabitRow(habit, weekDates) {
    const row = document.createElement('div');
    row.className = 'habit-row';
    row.dataset.habitId = habit.id;

    const nameEl = document.createElement('span');
    nameEl.className = 'habit-name';
    nameEl.textContent = habit.name;
    row.appendChild(nameEl);

    weekDates.forEach((date) => {
      const checked = habit.checks[date] === true;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = checked ? 'habit-cell habit-cell--checked' : 'habit-cell';
      cell.setAttribute('aria-pressed', String(checked));
      cell.setAttribute('aria-label', `${habit.name} ${date} ${checked ? '완료' : '미완료'}`);
      cell.textContent = checked ? '✓' : '';
      cell.addEventListener('click', () => toggleCheck(habit.id, date));
      row.appendChild(cell);
    });

    const rateEl = document.createElement('span');
    rateEl.className = 'habit-rate';
    rateEl.textContent = `${Math.round(weeklyRate(habit, weekDates) * 100)}%`;
    row.appendChild(rateEl);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'habit-delete-button';
    deleteButton.setAttribute('aria-label', `${habit.name} 삭제`);
    deleteButton.textContent = '삭제';
    deleteButton.addEventListener('click', () => deleteHabit(habit.id));
    row.appendChild(deleteButton);

    return row;
  }

  function render() {
    const weekDates = getWeekDates();
    habitGrid.innerHTML = '';

    if (habits.length === 0) {
      root.dataset.state = 'empty';
      const emptyState = document.createElement('p');
      emptyState.className = 'habit-empty-state';
      emptyState.textContent = '등록된 습관이 없습니다. 습관을 추가해보세요.';
      habitGrid.appendChild(emptyState);
      weeklySummary.textContent = '등록된 습관이 없습니다.';
      return;
    }

    root.dataset.state = errorMessage.textContent ? 'error' : 'idle';

    habitGrid.appendChild(createHeaderRow(weekDates));
    habits.forEach((habit) => {
      habitGrid.appendChild(createHabitRow(habit, weekDates));
    });

    const rates = habits.map((habit) => weeklyRate(habit, weekDates));
    const averagePercent = Math.round(
      (rates.reduce((sum, rate) => sum + rate, 0) / rates.length) * 100
    );
    weeklySummary.textContent = `습관 ${habits.length}개 · 이번 주 평균 달성률 ${averagePercent}%`;
  }

  function addHabit(rawName) {
    const existingNames = habits.map((habit) => habit.name.trim());
    const validation = validateHabitName(rawName, existingNames);
    if (!validation.valid) {
      setError(validation.error);
      root.dataset.state = 'error';
      return;
    }
    if (habits.length >= MAX_HABITS) {
      setError('최대 8개까지 등록할 수 있습니다');
      root.dataset.state = 'error';
      return;
    }
    habits.push({
      id: generateId(),
      name: rawName.trim(),
      createdAt: formatDate(new Date()),
      checks: {},
    });
    saveHabits(habits);
    setError('');
    input.value = '';
    render();
  }

  function deleteHabit(id) {
    habits = habits.filter((habit) => habit.id !== id);
    saveHabits(habits);
    setError('');
    render();
  }

  function toggleCheck(id, date) {
    const habit = habits.find((item) => item.id === id);
    if (!habit) return;
    if (habit.checks[date] === true) {
      delete habit.checks[date];
    } else {
      habit.checks[date] = true;
    }
    saveHabits(habits);
    setError('');
    render();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    addHabit(input.value);
    input.disabled = false;
    addButton.disabled = false;
  });

  render();
}
