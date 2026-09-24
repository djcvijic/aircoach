var STORAGE_KEY = 'aircoach-state';

function defaultState() {
  return { trainerName: '', trainerEmail: '', trainees: [] };
}

function loadState() {
  var raw = localStorage.getItem(STORAGE_KEY);
  var state = defaultState();
  if (!raw) return state;
  try {
    var saved = JSON.parse(raw);
    state.trainerName = saved.trainerName || '';
    state.trainerEmail = saved.trainerEmail || '';
    state.trainees = saved.trainees || [];
  } catch (e) {
    return defaultState();
  }
  return state;
}

var appState = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Deleted trainees stay in appState.trainees (soft delete, not recoverable
// yet) so this is the single filter every listing/lookup builds from, to
// keep them out of view everywhere at once.
function activeTrainees() {
  return appState.trainees.filter(function (t) { return !t.deleted; });
}

function findTrainee(id) {
  for (var i = 0; i < appState.trainees.length; i++) {
    if (appState.trainees[i].id === id && !appState.trainees[i].deleted) return appState.trainees[i];
  }
  return null;
}

// Each session's contribution halves every FRECENCY_HALF_LIFE_DAYS, so a
// trainee's score reflects both how often and how recently they trained,
// not just a raw session count.
var FRECENCY_HALF_LIFE_DAYS = 30;

function traineeFrecency(trainee) {
  var now = new Date();
  return trainee.sessions.reduce(function (score, session) {
    var daysAgo = (now - parseDateOnly(session.date)) / (1000 * 60 * 60 * 24);
    return score + Math.pow(0.5, daysAgo / FRECENCY_HALF_LIFE_DAYS);
  }, 0);
}

// Shared by the home screen list and the new-session trainee picker, so
// both always list trainees in the same order. Trainees with equal
// frecency (most often two with zero sessions) fall back to most
// recently added first, rather than an arbitrary alphabetical order.
function sortedTrainees() {
  return activeTrainees().sort(function (a, b) {
    var frecencyDiff = traineeFrecency(b) - traineeFrecency(a);
    return frecencyDiff !== 0 ? frecencyDiff : (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function addTrainee(data) {
  var trainee = {
    id: makeId(),
    name: data.name,
    gender: data.gender || '',
    dob: data.dob || '',
    email: data.email || '',
    phone: data.phone || '',
    trainingPlan: data.trainingPlan || '',
    sessions: [],
    deleted: false,
    createdAt: Date.now()
  };
  appState.trainees.push(trainee);
  saveState();
  return trainee;
}

function updateTrainee(id, data) {
  var trainee = findTrainee(id);
  if (!trainee) return;
  trainee.name = data.name;
  trainee.gender = data.gender || '';
  trainee.dob = data.dob || '';
  trainee.email = data.email || '';
  trainee.phone = data.phone || '';
  trainee.trainingPlan = data.trainingPlan || '';
  saveState();
}

// Soft delete only: the trainee and their sessions stay in storage, just
// marked hidden, with no recovery path yet.
function deleteTrainee(id) {
  var trainee = appState.trainees.find(function (t) { return t.id === id; });
  if (!trainee) return;
  trainee.deleted = true;
  saveState();
}

function addSession(traineeId, data) {
  var trainee = findTrainee(traineeId);
  if (!trainee) return;
  trainee.sessions.push({
    id: makeId(),
    date: data.date,
    notes: data.notes || '',
    createdAt: Date.now()
  });
  saveState();
}

// Sessions are entered as a plain date (no time-of-day), so createdAt
// breaks ties between same-day sessions in the order they were logged,
// giving an exact ordering instead of an arbitrary one.
function compareSessionsDesc(a, b) {
  if (a.date !== b.date) {
    return a.date < b.date ? 1 : -1;
  }
  return (b.createdAt || 0) - (a.createdAt || 0);
}

// data.traineeId lets a session move to a different trainee; the session
// keeps its id and createdAt either way, since editing isn't logging a new
// entry.
function updateSession(traineeId, sessionId, data) {
  var trainee = findTrainee(traineeId);
  if (!trainee) return;
  var session = trainee.sessions.find(function (s) { return s.id === sessionId; });
  if (!session) return;

  session.date = data.date;
  session.notes = data.notes || '';

  if (data.traineeId && data.traineeId !== traineeId) {
    var newTrainee = findTrainee(data.traineeId);
    if (!newTrainee) return;
    trainee.sessions = trainee.sessions.filter(function (s) { return s.id !== sessionId; });
    newTrainee.sessions.push(session);
  }

  saveState();
}

// Hard delete, unlike deleteTrainee: a session has no soft-delete/recovery
// story of its own, it just belongs to a trainee that might have one.
function deleteSession(traineeId, sessionId) {
  var trainee = findTrainee(traineeId);
  if (!trainee) return;
  trainee.sessions = trainee.sessions.filter(function (s) { return s.id !== sessionId; });
  saveState();
}

// Generic screen/modal show-hide helpers. No app-specific logic, shared
// here (rather than duplicated per screen file) because every screen and
// every modal needs them, and no single screen file owns them.
var modalOverlay = document.getElementById('modal-overlay');
var bottomNavEl = document.getElementById('bottom-nav');

// Screens with no entry here (onboarding, trainee-screen) just leave every
// nav button unhighlighted, since neither has one of its own: trainee-screen
// is a drill-down from trainees-screen, not a direct nav destination.
var NAV_BUTTON_ID_BY_SCREEN_ID = {
  'trainees-screen': 'nav-home-button',
  'log-session-screen': 'nav-log-session-button',
  'history-screen': 'nav-history-button',
  'settings-screen': 'nav-settings-button'
};

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(function (s) {
    s.classList.remove('active');
  });
  screen.classList.add('active');

  var showBottomNav = !!appState.trainerName;
  bottomNavEl.style.display = showBottomNav ? '' : 'none';
  document.body.classList.toggle('no-bottom-nav', !showBottomNav);
  document.body.classList.toggle('history-screen-active', screen.id === 'history-screen');

  setActiveNavButton(NAV_BUTTON_ID_BY_SCREEN_ID[screen.id]);

  window.scrollTo(0, 0);
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function formatDateOnly(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

// A session's date is "YYYY-MM-DD"; parsing that directly via `new
// Date(string)` reads it as UTC, which can roll it back a day in
// negative-UTC timezones. Parse the components explicitly instead.
function parseDateOnly(value) {
  var parts = value.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function formatDayHeader(date) {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function openModal(modal) {
  modalOverlay.classList.remove('hidden');
  modal.classList.remove('hidden');
}

function closeModals() {
  modalOverlay.classList.add('hidden');
  document.querySelectorAll('.modal').forEach(function (modal) {
    modal.classList.add('hidden');
  });
}
