// Boot sequence and all event wiring. Loads last, after every other script.

// The one shared "Unapplied changes" modal (#unsaved-modal) is used by
// every screen's own unsavedGuard (settings.js, trainee.js, log-session.js);
// this tracks whichever guard most recently opened it, so its Back/Discard
// buttons know which guard to resolve.
var activeUnsavedGuard = null;

// The one shared "Delete this?" confirm modal (#delete-confirm-modal) is
// used by every screen's own delete flow (trainee.js, log-session.js);
// title/description are filled in per call, and this tracks which action
// to actually run if Delete is confirmed.
var activeDeleteAction = null;

function openDeleteConfirmModal(title, description, onConfirm) {
  document.getElementById('delete-confirm-title').textContent = title;
  document.getElementById('delete-confirm-description').textContent = description;
  activeDeleteAction = onConfirm;
  openModal(document.getElementById('delete-confirm-modal'));
}

function goHome() {
  currentTraineeId = null;
  renderTrainees();
  showScreen(document.getElementById('trainees-screen'));
}

function boot() {
  if (!appState.trainerName) {
    openOnboardingScreen();
  } else {
    goHome();
  }
}

// Nav bar buttons can leave from any screen, not just settings, so this
// finds whichever guarded screen is currently active (at most one ever
// is) and defers to its own guard; screens with no guard just navigate.
var unsavedGuardsByScreen = [
  { screen: settingsScreen, guard: settingsUnsavedGuard },
  { screen: traineeScreen, guard: traineeUnsavedGuard },
  { screen: logSessionScreen, guard: logSessionUnsavedGuard }
];

function goToScreen(navigateFn) {
  var active = unsavedGuardsByScreen.find(function (entry) {
    return entry.screen.classList.contains('active');
  });
  if (active) {
    activeUnsavedGuard = active.guard;
    active.guard.goFrom(active.screen, navigateFn);
  } else {
    navigateFn();
  }
}

function main() {
  document.getElementById('onboarding-continue-button').addEventListener('click', applyOnboarding);
  document.getElementById('onboarding-import-button').addEventListener('click', openImportPicker);

  document.getElementById('nav-home-button').addEventListener('click', function () {
    goToScreen(goHome);
  });
  document.getElementById('nav-log-session-button').addEventListener('click', function () {
    goToScreen(openLogSessionScreen);
  });
  document.getElementById('nav-history-button').addEventListener('click', function () {
    goToScreen(openHistoryScreen);
  });
  document.getElementById('nav-settings-button').addEventListener('click', function () {
    goToScreen(openSettingsScreen);
  });

  document.getElementById('add-trainee-button').addEventListener('click', openNewTraineeScreen);
  document.getElementById('back-to-trainees-button').addEventListener('click', backFromTrainee);
  document.getElementById('trainee-cancel-button').addEventListener('click', backFromTrainee);
  document.getElementById('trainee-save-button').addEventListener('click', saveTrainee);
  document.getElementById('delete-trainee-button').addEventListener('click', openDeleteTraineeModal);

  document.getElementById('log-session-back-button').addEventListener('click', backFromLogSession);
  document.getElementById('log-session-cancel-button').addEventListener('click', backFromLogSession);
  document.getElementById('log-session-save-button').addEventListener('click', saveLogSession);
  document.getElementById('delete-session-button').addEventListener('click', openDeleteSessionModal);

  document.getElementById('delete-confirm-button').addEventListener('click', function () {
    closeModals();
    if (activeDeleteAction) {
      var action = activeDeleteAction;
      activeDeleteAction = null;
      action();
    }
  });

  document.getElementById('history-back-button').addEventListener('click', backFromHistory);
  historyModeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setHistoryMode(button.dataset.mode);
    });
  });

  document.getElementById('settings-back-button').addEventListener('click', backFromSettings);
  document.getElementById('settings-cancel-button').addEventListener('click', backFromSettings);
  document.getElementById('settings-apply-button').addEventListener('click', applySettings);

  document.getElementById('unsaved-back-button').addEventListener('click', dismissModals);
  document.getElementById('unsaved-discard-button').addEventListener('click', function () {
    closeModals();
    if (activeUnsavedGuard) {
      activeUnsavedGuard.resolvePending(goHome);
      activeUnsavedGuard = null;
    }
  });

  document.getElementById('export-data-button').addEventListener('click', exportData);
  document.getElementById('import-data-button').addEventListener('click', openImportPicker);
  document.getElementById('delete-all-data-button').addEventListener('click', openDeleteAllConfirmModal);

  function dismissModals() {
    if (activeUnsavedGuard) {
      activeUnsavedGuard.clearPending();
      activeUnsavedGuard = null;
    }
    activeDeleteAction = null;
    closeModals();
  }

  document.querySelectorAll('.modal-close').forEach(function (button) {
    button.addEventListener('click', dismissModals);
  });

  document.querySelectorAll('.rich-text-tool').forEach(function (button) {
    button.addEventListener('mousedown', function (e) {
      e.preventDefault();
      document.execCommand(button.dataset.command, false, null);
    });
  });

  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) dismissModals();
  });

  wireGlobalShortcuts(fillRandomDebugData, dismissModals);

  boot();
}

document.addEventListener('DOMContentLoaded', main);
