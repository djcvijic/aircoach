// Settings screen: trainer name + email, plus export/import and the
// "delete all my data" confirm modal. Calls boot() only inside a function
// body (deleteAllData, importData), so main.js just needs to load before
// those run, not before this file parses.

var settingsScreen = document.getElementById('settings-screen');
var settingsNameInput = document.getElementById('settings-name-input');
var settingsEmailInput = document.getElementById('settings-email-input');
var settingsErrorEl = document.getElementById('settings-error');
var settingsApplyButton = document.getElementById('settings-apply-button');
var settingsUnsavedModal = document.getElementById('unsaved-modal');
var importFileInput = document.getElementById('import-file-input');
var deleteAllConfirmModal = document.getElementById('delete-all-confirm-modal');
var deleteAllConfirmButton = document.getElementById('delete-all-confirm-button');

var settingsOriginalName = null;
var settingsOriginalEmail = null;
var settingsUnsavedGuard = createUnsavedGuard(hasUnsavedSettingsChanges, settingsUnsavedModal);

// The test harness flags itself via ?testMode=1 so the delete button can
// skip the 2s hold entirely and act like a normal button.
var TEST_MODE = new URLSearchParams(location.search).has('testMode');
var DELETE_HOLD_MS = 2000;
var deleteHoldTimer = null;

settingsScreen.addEventListener('input', updateSettingsActionButtons);

function openSettingsScreen() {
  settingsErrorEl.textContent = '';

  settingsNameInput.value = appState.trainerName;
  settingsEmailInput.value = appState.trainerEmail;

  settingsOriginalName = appState.trainerName;
  settingsOriginalEmail = appState.trainerEmail;
  updateSettingsActionButtons();

  showScreen(settingsScreen);
}

function hasUnsavedSettingsChanges() {
  return settingsNameInput.value !== settingsOriginalName
    || settingsEmailInput.value !== settingsOriginalEmail;
}

function updateSettingsActionButtons() {
  settingsApplyButton.disabled = !hasUnsavedSettingsChanges();
}

function applySettings() {
  var name = settingsNameInput.value.trim();
  var email = settingsEmailInput.value.trim();
  if (!name) {
    settingsErrorEl.textContent = 'Enter your name.';
    return;
  }
  if (!email) {
    settingsErrorEl.textContent = 'Enter your email.';
    return;
  }

  appState.trainerName = name;
  appState.trainerEmail = email;
  saveState();
  showToast('Settings saved');

  closeModals();
  settingsUnsavedGuard.resolvePending(goHome);
}

function goFromSettings(navigateFn) {
  activeUnsavedGuard = settingsUnsavedGuard;
  settingsUnsavedGuard.goFrom(settingsScreen, navigateFn);
}

function backFromSettings() {
  goFromSettings(function () {
    showScreen(document.getElementById('trainees-screen'));
  });
}

function openDeleteAllConfirmModal() {
  openModal(deleteAllConfirmModal);
}

function startDeleteHold() {
  if (TEST_MODE) {
    deleteAllData();
    return;
  }

  deleteAllConfirmButton.classList.add('holding');
  deleteHoldTimer = setTimeout(function () {
    deleteAllConfirmButton.classList.remove('holding');
    // Guard against a stray fire after the modal was already dismissed
    // (close button, overlay click, Escape) while the hold was pending.
    if (deleteAllConfirmModal.classList.contains('hidden')) {
      return;
    }
    deleteAllData();
  }, DELETE_HOLD_MS);
}

function cancelDeleteHold() {
  clearTimeout(deleteHoldTimer);
  deleteAllConfirmButton.classList.remove('holding');
}

function deleteAllData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    showToast("Couldn't delete, try again");
    return;
  }

  appState = defaultState();
  showToast('All data deleted');

  closeModals();
  boot();
}

function exportData() {
  var blob = new Blob([JSON.stringify(appState)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);

  var link = document.createElement('a');
  link.href = url;
  link.download = 'aircoach-' + formatDateOnly(new Date()) + '.json';
  link.click();

  URL.revokeObjectURL(url);
}

function openImportPicker() {
  importFileInput.click();
}

// Overwrites the whole app state with the picked file's contents, no
// merge. The file is expected to be a previous exportData() output.
function importData() {
  var file = importFileInput.files[0];
  importFileInput.value = '';
  if (!file) {
    return;
  }

  var reader = new FileReader();
  reader.onload = function () {
    var imported;
    try {
      imported = JSON.parse(reader.result);
    } catch (e) {
      showToast("That file isn't valid JSON");
      return;
    }

    if (!imported || !Array.isArray(imported.trainees)) {
      showToast("That file doesn't look like an aircoach export");
      return;
    }

    appState = defaultState();
    appState.trainerName = imported.trainerName || '';
    appState.trainerEmail = imported.trainerEmail || '';
    appState.trainees = imported.trainees;
    saveState();

    boot();
    showToast('Data imported');
  };
  reader.onerror = function () {
    showToast("Couldn't read that file");
  };
  reader.readAsText(file);
}

importFileInput.addEventListener('change', importData);
