// New/Edit Session screen: the same screen handles both, since they share
// every field. Reached from the nav bar's + icon or a trainee's own "+ Add
// Session" button (that trainee preselected) to add, or from a History row
// to edit. A full screen rather than a modal since the nav bar entry point
// spans trainees, not a single trainee's own context. Back and Cancel go
// through the same unsaved-changes guard as settings.js.

var logSessionScreen = document.getElementById('log-session-screen');
var logSessionTitleEl = document.getElementById('log-session-title');
var logSessionDateDisplayEl = document.getElementById('log-session-date-display');
var logSessionDateTextEl = document.getElementById('log-session-date-text');
var logSessionDateInput = document.getElementById('log-session-date-input');
var logSessionTraineeSelect = document.getElementById('log-session-trainee-select');
var logSessionNotesInput = document.getElementById('log-session-notes-input');
var logSessionErrorEl = document.getElementById('log-session-error');
var logSessionUnsavedModal = document.getElementById('unsaved-modal');

// Non-null while editing an existing session (set by openEditSessionScreen),
// so saveLogSession knows to update it instead of adding a new one.
var logSessionEditingTraineeId = null;
var logSessionEditingSessionId = null;

var logSessionOriginal = null;
var logSessionUnsavedGuard = createUnsavedGuard(hasUnsavedLogSessionChanges, logSessionUnsavedModal);

function captureLogSessionSnapshot() {
  return {
    date: logSessionDateInput.value,
    traineeId: logSessionTraineeSelect.value,
    notes: logSessionNotesInput.innerHTML
  };
}

function hasUnsavedLogSessionChanges() {
  if (!logSessionOriginal) return false;
  var current = captureLogSessionSnapshot();
  return current.date !== logSessionOriginal.date
    || current.traineeId !== logSessionOriginal.traineeId
    || current.notes !== logSessionOriginal.notes;
}

function updateLogSessionDateDisplay() {
  var value = logSessionDateInput.value;
  logSessionDateTextEl.textContent = value ? formatDayHeader(parseDateOnly(value)) : '';
}

// The invisible input covers the whole field and receives every real
// click (that's the point, for reliable mobile taps), so this same logic
// is needed on the input's own click too: on desktop, clicking a date
// input's text area only focuses a date segment rather than opening the
// calendar, unlike a direct click on its small native icon. The display
// button's own listener stays for keyboard activation (Enter/Space on
// the focused button), since it never receives real pointer clicks.
function openLogSessionDatePicker() {
  var opened = false;
  if (logSessionDateInput.showPicker) {
    try {
      logSessionDateInput.showPicker();
      opened = true;
    } catch (e) {
      // Some mobile browsers throw here even though showPicker exists
      // (e.g. treating this hidden proxy input as gesture-ineligible);
      // fall through to focus() below instead of doing nothing.
    }
  }
  if (!opened) {
    logSessionDateInput.focus();
  }
}

logSessionDateInput.addEventListener('click', openLogSessionDatePicker);
logSessionDateDisplayEl.addEventListener('click', openLogSessionDatePicker);

// The native picker's own "Clear" control would empty the input; a
// session always needs a date, so an empty value is rejected and reset
// back to today instead of letting it stick.
logSessionDateInput.addEventListener('change', function () {
  if (!logSessionDateInput.value) {
    logSessionDateInput.valueAsDate = new Date();
  }
  updateLogSessionDateDisplay();
});

function renderTraineeSelectOptions(selectedTraineeId) {
  logSessionTraineeSelect.innerHTML = '';

  var placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.textContent = 'Select trainee';
  logSessionTraineeSelect.appendChild(placeholder);

  sortedTrainees().forEach(function (trainee) {
    var option = document.createElement('option');
    option.value = trainee.id;
    option.textContent = trainee.name;
    logSessionTraineeSelect.appendChild(option);
  });

  logSessionTraineeSelect.value = selectedTraineeId || '';
}

function openLogSessionScreen() {
  if (activeTrainees().length === 0) {
    showToast('Add a trainee first');
    return;
  }

  logSessionEditingTraineeId = null;
  logSessionEditingSessionId = null;
  logSessionTitleEl.textContent = 'New Session';
  logSessionErrorEl.textContent = '';
  logSessionDateInput.valueAsDate = new Date();
  updateLogSessionDateDisplay();
  logSessionNotesInput.innerHTML = '';
  renderTraineeSelectOptions(currentTraineeId);
  logSessionOriginal = captureLogSessionSnapshot();

  showScreen(logSessionScreen);
}

function openEditSessionScreen(traineeId, sessionId) {
  var trainee = findTrainee(traineeId);
  var session = trainee && trainee.sessions.find(function (s) { return s.id === sessionId; });
  if (!session) return;

  logSessionEditingTraineeId = traineeId;
  logSessionEditingSessionId = sessionId;
  logSessionTitleEl.textContent = 'Edit Session';
  logSessionErrorEl.textContent = '';
  logSessionDateInput.value = session.date;
  updateLogSessionDateDisplay();
  logSessionNotesInput.innerHTML = session.notes || '';
  renderTraineeSelectOptions(traineeId);
  logSessionOriginal = captureLogSessionSnapshot();

  showScreen(logSessionScreen);
}

function goFromLogSession(navigateFn) {
  activeUnsavedGuard = logSessionUnsavedGuard;
  logSessionUnsavedGuard.goFrom(logSessionScreen, navigateFn);
}

function backFromLogSession() {
  goFromLogSession(function () {
    currentTraineeId = null;
    logSessionEditingTraineeId = null;
    logSessionEditingSessionId = null;
    showScreen(document.getElementById('trainees-screen'));
  });
}

function saveLogSession() {
  var date = logSessionDateInput.value;
  var traineeId = logSessionTraineeSelect.value;

  if (!date) {
    logSessionErrorEl.textContent = 'Choose a date.';
    return;
  }
  if (!traineeId || !findTrainee(traineeId)) {
    logSessionErrorEl.textContent = 'Choose a trainee.';
    return;
  }

  var sessionData = {
    date: date,
    traineeId: traineeId,
    notes: logSessionNotesInput.innerHTML.trim()
  };

  if (logSessionEditingSessionId) {
    updateSession(logSessionEditingTraineeId, logSessionEditingSessionId, sessionData);
    showToast('Session updated');
  } else {
    addSession(traineeId, sessionData);
    showToast('Session added');
  }

  logSessionEditingTraineeId = null;
  logSessionEditingSessionId = null;

  logSessionUnsavedGuard.resolvePending(goHome);
}
