// First-run onboarding screen: trainer name + email, explained rather than
// dropped in a modal. Distinct from the Settings screen even though it
// shares the same fields, since onboarding has no existing data to protect
// and nothing to close back to. Calls goHome() only inside a function body,
// so main.js just needs to load before Continue is clicked, not before this
// file parses.

var onboardingScreen = document.getElementById('onboarding-screen');
var onboardingNameInput = document.getElementById('onboarding-name-input');
var onboardingEmailInput = document.getElementById('onboarding-email-input');
var onboardingErrorEl = document.getElementById('onboarding-error');

function openOnboardingScreen() {
  onboardingErrorEl.textContent = '';
  onboardingNameInput.value = appState.trainerName;
  onboardingEmailInput.value = appState.trainerEmail;
  showScreen(onboardingScreen);
}

function applyOnboarding() {
  var name = onboardingNameInput.value.trim();
  var email = onboardingEmailInput.value.trim();
  if (!name) {
    onboardingErrorEl.textContent = 'Enter your name.';
    return;
  }
  if (!email) {
    onboardingErrorEl.textContent = 'Enter your email.';
    return;
  }

  appState.trainerName = name;
  appState.trainerEmail = email;
  saveState();

  goHome();
}
