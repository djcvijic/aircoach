// Dev-only debug shortcut (option+cmd+r, wired in main.js) that fills the
// app with random state for manual testing. Its own file since it's a
// distinct feature, not part of boot sequence/event wiring.

var DEBUG_TRAINEE_NAMES = [
  'Jamie Rivera', 'Sam Chen', 'Taylor Brooks', 'Morgan Lee', 'Casey Nguyen',
  'Jordan Patel', 'Riley Kim', 'Avery Santos', 'Drew Palmer', 'Quinn Foster'
];

var DEBUG_SESSION_NOTES = [
  'Cockpit familiarization', 'Pattern work', 'Cross-country navigation',
  'Emergency procedures', 'Night flying', 'Instrument approach practice',
  'Pre-solo checkride prep', 'Radio communications drill'
];

var DEBUG_TRAINING_PLANS = [
  'Solo cross-country prep', 'Instrument rating prep', 'Checkride readiness',
  'Night rating', 'Complex aircraft endorsement', 'Commercial certificate prep'
];

var DEBUG_GENDERS = ['female', 'male', 'other', ''];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffled(array) {
  var copy = array.slice();
  for (var i = copy.length - 1; i > 0; i--) {
    var j = randomInt(0, i);
    var temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function randomPastDate(daysBack) {
  var date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysBack));
  return formatDateOnly(date);
}

function fillRandomDebugData() {
  appState = defaultState();
  appState.trainerName = 'Alex Morgan';
  appState.trainerEmail = 'alex@aircoach.example';

  var names = shuffled(DEBUG_TRAINEE_NAMES).slice(0, randomInt(4, 8));

  appState.trainees = names.map(function (name) {
    var trainee = {
      id: makeId(),
      name: name,
      gender: DEBUG_GENDERS[randomInt(0, DEBUG_GENDERS.length - 1)],
      dob: randomPastDate(365 * randomInt(18, 55)),
      email: name.toLowerCase().replace(' ', '.') + '@example.com',
      phone: '',
      trainingPlan: DEBUG_TRAINING_PLANS[randomInt(0, DEBUG_TRAINING_PLANS.length - 1)],
      sessions: [],
      createdAt: Date.now() - randomInt(0, 1000000000)
    };

    var sessionCount = randomInt(0, 5);
    for (var i = 0; i < sessionCount; i++) {
      trainee.sessions.push({
        id: makeId(),
        date: randomPastDate(120),
        notes: DEBUG_SESSION_NOTES[randomInt(0, DEBUG_SESSION_NOTES.length - 1)],
        createdAt: Date.now() - randomInt(0, 1000000000)
      });
    }

    return trainee;
  });

  saveState();
  closeModals();
  boot();
  showToast('Debug data loaded');
}
