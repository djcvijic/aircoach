// Boot sequence and all event wiring. Loads last, after every other script.

// The one shared "Unapplied changes" modal (#unsaved-modal) is used by
// every screen's own unsavedGuard (settings.js, trainee.js, log-session.js);
// this tracks whichever guard most recently opened it, so its Back/Discard
// buttons know which guard to resolve.
var activeUnsavedGuard = null;

// Shared by every native date field's overlay input and decorative display
// button (log-session.js, trainee.js): a plain click inside a date input
// only focuses a segment, not the picker, so showPicker() is needed instead.
function openNativeDatePicker(inputEl) {
  var opened = false;
  if (inputEl.showPicker) {
    try {
      inputEl.showPicker();
      opened = true;
    } catch (e) {
      // Some mobile browsers throw here even though showPicker exists
      // (e.g. treating this hidden proxy input as gesture-ineligible);
      // fall through to focus() below instead of doing nothing.
    }
  }
  if (!opened) {
    inputEl.focus();
  }
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
  document.getElementById('delete-trainee-confirm-button').addEventListener('click', handleDeleteTraineeConfirm);

  document.getElementById('log-session-back-button').addEventListener('click', backFromLogSession);
  document.getElementById('log-session-cancel-button').addEventListener('click', backFromLogSession);
  document.getElementById('log-session-save-button').addEventListener('click', saveLogSession);

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
  deleteAllConfirmButton.addEventListener('mousedown', startDeleteHold);
  deleteAllConfirmButton.addEventListener('touchstart', startDeleteHold);
  deleteAllConfirmButton.addEventListener('mouseup', cancelDeleteHold);
  deleteAllConfirmButton.addEventListener('mouseleave', cancelDeleteHold);
  deleteAllConfirmButton.addEventListener('touchend', cancelDeleteHold);
  deleteAllConfirmButton.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });

  function dismissModals() {
    if (activeUnsavedGuard) {
      activeUnsavedGuard.clearPending();
      activeUnsavedGuard = null;
    }
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

  document.addEventListener('keydown', function (e) {
    if (e.altKey && e.metaKey && (e.code === 'KeyR' || e.key.toLowerCase() === 'r')) {
      e.preventDefault();
      fillRandomDebugData();
      return;
    }

    if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
      dismissModals();
    }
  });

  boot();
}

document.addEventListener('DOMContentLoaded', main);

// Skipped on localhost: the service worker is cache-first, so during local
// dev it would keep serving pre-edit files after every change instead of
// the fresh ones, unless CACHE_NAME is bumped on every single edit.
if (location.hostname !== 'localhost' && 'serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js');
  });
}

if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist();
}
