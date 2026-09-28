// Trainee screens: View (read-only, tap a trainee on the homescreen) and
// Edit (View's Edit button, or + New Trainee directly in create mode).
// currentTraineeId is null while creating, hiding Edit's delete icon and
// training plan field. Editing an existing trainee is only reached from
// View, so Edit's Back/Save return there instead of home; Edit's
// Back/Cancel use the same unsaved-changes guard as settings.js.

var currentTraineeId = null;

var viewTraineeScreen = document.getElementById('view-trainee-screen');
var viewTraineeTitleEl = document.getElementById('view-trainee-title');
var viewTraineeGenderRowEl = document.getElementById('view-trainee-gender-row');
var viewTraineeGenderEl = document.getElementById('view-trainee-gender');
var viewTraineeDobRowEl = document.getElementById('view-trainee-dob-row');
var viewTraineeDobEl = document.getElementById('view-trainee-dob');
var viewTraineePhoneRowEl = document.getElementById('view-trainee-phone-row');
var viewTraineePhoneEl = document.getElementById('view-trainee-phone');
var viewTraineeEmailRowEl = document.getElementById('view-trainee-email-row');
var viewTraineeEmailEl = document.getElementById('view-trainee-email');
var viewTraineePlanFieldEl = document.getElementById('view-trainee-plan-field');
var viewTraineePlanEl = document.getElementById('view-trainee-plan');
var viewTraineeSessionCountEl = document.getElementById('view-trainee-session-count');
var viewTraineeHistoryFieldEl = document.getElementById('view-trainee-history-field');

var GENDER_LABELS = {
  female: 'Female',
  male: 'Male',
  other: 'Other',
  'prefer-not-to-say': 'Prefer not to say'
};

function setViewTraineeRow(rowEl, valueEl, value) {
  rowEl.style.display = value ? '' : 'none';
  valueEl.textContent = value || '';
}

function setViewTraineeLinkRow(rowEl, valueEl, value, hrefPrefix) {
  rowEl.style.display = value ? '' : 'none';
  valueEl.innerHTML = '';
  if (!value) return;

  var link = document.createElement('a');
  link.href = hrefPrefix + value;
  link.textContent = value;
  valueEl.appendChild(link);
}

function openViewTraineeScreen(id) {
  var trainee = findTrainee(id);
  if (!trainee) return;

  currentTraineeId = id;
  viewTraineeTitleEl.textContent = trainee.name;

  setViewTraineeRow(viewTraineeGenderRowEl, viewTraineeGenderEl, GENDER_LABELS[trainee.gender] || '');
  setViewTraineeRow(viewTraineeDobRowEl, viewTraineeDobEl, trainee.dob ? parseDateOnly(trainee.dob).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');
  setViewTraineeLinkRow(viewTraineePhoneRowEl, viewTraineePhoneEl, trainee.phone, 'tel:');
  setViewTraineeLinkRow(viewTraineeEmailRowEl, viewTraineeEmailEl, trainee.email, 'mailto:');

  viewTraineeSessionCountEl.textContent = trainee.sessions.length + ' session' + (trainee.sessions.length === 1 ? '' : 's');
  viewTraineeHistoryFieldEl.style.display = trainee.sessions.length > 0 ? '' : 'none';

  viewTraineePlanFieldEl.style.display = trainee.trainingPlan ? '' : 'none';
  viewTraineePlanEl.innerHTML = trainee.trainingPlan || '';

  showScreen(viewTraineeScreen);
}

function backFromViewTrainee() {
  goHome();
}

document.getElementById('view-trainee-back-button').addEventListener('click', backFromViewTrainee);

document.getElementById('view-trainee-edit-button').addEventListener('click', function () {
  openTrainee(currentTraineeId);
});

document.getElementById('view-trainee-history-button').addEventListener('click', function () {
  openHistoryScreen('trainee', currentTraineeId);
});

document.getElementById('view-trainee-add-session-button').addEventListener('click', function () {
  openLogSessionScreen(currentTraineeId);
});

var traineeScreen = document.getElementById('trainee-screen');
var traineeTitleEl = document.getElementById('trainee-title');
var traineeNameInput = document.getElementById('trainee-name-input');
var traineeGenderInput = document.getElementById('trainee-gender-input');
var traineeDobDisplayEl = document.getElementById('trainee-dob-display');
var traineeDobInput = document.getElementById('trainee-dob-input');
var traineePhoneInput = document.getElementById('trainee-phone-input');
var traineeEmailInput = document.getElementById('trainee-email-input');
var traineePlanFieldEl = document.getElementById('trainee-plan-field');
var traineePlanInput = document.getElementById('trainee-plan-input');
var traineeErrorEl = document.getElementById('trainee-error');
var traineeDeleteButton = document.getElementById('delete-trainee-button');
var traineeUnsavedModal = document.getElementById('unsaved-modal');

var traineeOriginal = null;
var traineeUnsavedGuard = createUnsavedGuard(hasUnsavedTraineeChanges, traineeUnsavedModal);

function captureTraineeSnapshot() {
  return {
    name: traineeNameInput.value,
    gender: traineeGenderInput.value,
    dob: traineeDobInput.value,
    phone: traineePhoneInput.value,
    email: traineeEmailInput.value,
    trainingPlan: traineePlanInput.innerHTML
  };
}

function hasUnsavedTraineeChanges() {
  if (!traineeOriginal) return false;
  var current = captureTraineeSnapshot();
  return current.name !== traineeOriginal.name
    || current.gender !== traineeOriginal.gender
    || current.dob !== traineeOriginal.dob
    || current.phone !== traineeOriginal.phone
    || current.email !== traineeOriginal.email
    || current.trainingPlan !== traineeOriginal.trainingPlan;
}

function updateTraineeDobDisplay() {
  var value = traineeDobInput.value;
  if (value) {
    traineeDobDisplayEl.textContent = parseDateOnly(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    traineeDobDisplayEl.classList.add('has-value');
  } else {
    traineeDobDisplayEl.textContent = 'Date of birth';
    traineeDobDisplayEl.classList.remove('has-value');
  }
}

function openTraineeDobPicker() {
  openNativeDatePicker(traineeDobInput);
}

traineeDobInput.addEventListener('click', openTraineeDobPicker);
traineeDobDisplayEl.addEventListener('click', openTraineeDobPicker);
traineeDobInput.addEventListener('change', updateTraineeDobDisplay);

function openTrainee(id) {
  currentTraineeId = id;
  var trainee = id ? findTrainee(id) : null;

  traineeTitleEl.textContent = trainee ? trainee.name : 'New Trainee';
  traineeErrorEl.textContent = '';
  traineeDeleteButton.style.display = trainee ? '' : 'none';
  traineePlanFieldEl.style.display = trainee ? '' : 'none';

  traineeNameInput.value = trainee ? trainee.name : '';
  traineeGenderInput.value = trainee ? trainee.gender : '';
  traineeDobInput.value = trainee ? trainee.dob : '';
  updateTraineeDobDisplay();
  traineePhoneInput.value = trainee ? trainee.phone : '';
  traineeEmailInput.value = trainee ? trainee.email : '';
  traineePlanInput.innerHTML = trainee ? trainee.trainingPlan || '' : '';
  traineeOriginal = captureTraineeSnapshot();

  showScreen(traineeScreen);
}

function openNewTraineeScreen() {
  openTrainee(null);
}

function goFromTrainee(navigateFn) {
  activeUnsavedGuard = traineeUnsavedGuard;
  traineeUnsavedGuard.goFrom(traineeScreen, navigateFn);
}

function backFromTrainee() {
  goFromTrainee(currentTraineeId ? function () {
    openViewTraineeScreen(currentTraineeId);
  } : goHome);
}

function saveTrainee() {
  var name = traineeNameInput.value.trim();
  if (!name) {
    traineeErrorEl.textContent = 'Enter a name.';
    return;
  }

  var data = {
    name: name,
    gender: traineeGenderInput.value,
    dob: traineeDobInput.value,
    phone: traineePhoneInput.value.trim(),
    email: traineeEmailInput.value.trim(),
    trainingPlan: traineePlanInput.innerHTML.trim()
  };

  var editingId = currentTraineeId;

  if (currentTraineeId) {
    updateTrainee(currentTraineeId, data);
    showToast('Trainee updated');
  } else {
    addTrainee(data);
    showToast('Trainee added');
  }

  renderTrainees();
  traineeUnsavedGuard.resolvePending(editingId ? function () {
    openViewTraineeScreen(editingId);
  } : goHome);
}

function openDeleteTraineeModal() {
  openDeleteConfirmModal('Delete this trainee?', 'This permanently erases their sessions. This cannot be undone.', handleDeleteTraineeConfirm);
}

function handleDeleteTraineeConfirm() {
  if (!currentTraineeId) return;
  deleteTrainee(currentTraineeId);
  currentTraineeId = null;
  renderTrainees();
  showScreen(document.getElementById('trainees-screen'));
  showToast('Trainee deleted');
}
