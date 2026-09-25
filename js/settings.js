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

createHoldToConfirm(deleteAllConfirmButton, deleteAllConfirmModal, deleteAllData);

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
  exportJSON(appState, 'aircoach');
}

function openImportPicker() {
  importFileInput.click();
}

function isValidImport(imported) {
  return !!imported && Array.isArray(imported.trainees);
}

// Overwrites the whole app state with the picked file's contents, no
// merge. The file is expected to be a previous exportData() output.
function importData() {
  importJSONFile(importFileInput, isValidImport, "That file doesn't look like an aircoach export", function (imported) {
    appState = defaultState();
    appState.trainerName = imported.trainerName || '';
    appState.trainerEmail = imported.trainerEmail || '';
    appState.trainees = imported.trainees;
    saveState();

    boot();
    showToast('Data imported');
  });
}

importFileInput.addEventListener('change', importData);
