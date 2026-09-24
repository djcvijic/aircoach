// Trainee screen: doubles as both Add and Edit, since they share every
// field (mirrors log-session.js's New/Edit Session screen). currentTraineeId
// is null while creating, in which case the history link, delete icon, and
// training plan field are hidden since none apply to a trainee that doesn't
// exist yet. Back/Cancel go through the same unsaved-changes guard as
// settings.js.

var currentTraineeId = null;

var traineeScreen = document.getElementById('trainee-screen');
var traineeTitleEl = document.getElementById('trainee-title');
var traineeHistoryRowEl = document.getElementById('trainee-history-row');
var traineeHistoryLink = document.getElementById('trainee-history-link');
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
  traineeHistoryRowEl.style.display = trainee ? '' : 'none';
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

traineeHistoryLink.addEventListener('click', function () {
  goFromTrainee(function () {
    openHistoryScreen('trainee', currentTraineeId);
  });
});

function goFromTrainee(navigateFn) {
  activeUnsavedGuard = traineeUnsavedGuard;
  traineeUnsavedGuard.goFrom(traineeScreen, navigateFn);
}

function backFromTrainee() {
  goFromTrainee(goHome);
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

  if (currentTraineeId) {
    updateTrainee(currentTraineeId, data);
    showToast('Trainee updated');
  } else {
    addTrainee(data);
    showToast('Trainee added');
  }

  renderTrainees();
  traineeUnsavedGuard.resolvePending(goHome);
}

function openDeleteTraineeModal() {
  openModal(document.getElementById('delete-trainee-modal'));
}

function handleDeleteTraineeConfirm() {
  if (!currentTraineeId) return;
  deleteTrainee(currentTraineeId);
  currentTraineeId = null;
  closeModals();
  renderTrainees();
  showScreen(document.getElementById('trainees-screen'));
  showToast('Trainee deleted');
}
